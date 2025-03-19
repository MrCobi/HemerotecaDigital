import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { Article } from "@/src/interface/article";
import { withAuth } from "../../../lib/auth-utils";

type NewsApiTrend = Article & {
  localSourceId: string | null;
};

// Define a custom error interface
interface ApiError {
  status: number;
  code: string;
  message: string;
  isRateLimit: boolean;
}

// Type guard for ApiError
function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === "object" &&
    error !== null &&
    "isRateLimit" in error
  );
}

async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      console.log(`Intento ${i + 1}: Status ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        const errorPayload: ApiError = {
          status: response.status,
          code: errorData.code || 'unknown',
          message: errorData.message || 'Error desconocido',
          isRateLimit: response.status === 429, // Nueva propiedad
        };

        // Lanzar el objeto de error para un mejor manejo
        throw errorPayload;
      }

      return await response.json();
      
    } catch (error: unknown) {
      console.error("Error en fetchWithRetry:", error);
      
      // Usar el type guard para verificar si es un error de rate limit
      if (isApiError(error) && error.isRateLimit) {
        console.log("Error 429 detectado, abortando reintentos");
        throw error;
      }

      if (i === retries - 1) {
        throw error;
      }

      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

export const GET = withAuth(async () => {
  try {
    // 1. Fuentes más favoritadas
    const topFavorites = await prisma.favoriteSource.groupBy({
      by: ["sourceId"],
      _count: { sourceId: true },
      orderBy: { _count: { sourceId: "desc" } },
      take: 8,
    }).then(async (favorites) => {
      return await Promise.all(
        favorites.map(async (favorite) => {
          const source = await prisma.source.findUnique({
            where: { id: favorite.sourceId },
            select: { name: true },
          });
          return {
            ...favorite,
            sourceName: source?.name || "Fuente desconocida",
          };
        })
      );
    });

    // 2. Fuentes con más comentarios
    const topCommented = await prisma.comment.groupBy({
      by: ["sourceId"],
      _count: { sourceId: true },
      orderBy: { _count: { sourceId: "desc" } },
      take: 8,
    }).then(async (commented) => {
      return await Promise.all(
        commented.map(async (comment) => {
          const source = await prisma.source.findUnique({
            where: { id: comment.sourceId },
            select: { name: true },
          });
          return {
            ...comment,
            sourceName: source?.name || "Fuente desconocida",
          };
        })
      );
    });

    // 3. Manejo de artículos trending
    let newsApiTrends: NewsApiTrend[] = [];
    let rateLimitWarning = "";
    
    try {
      const newsApiData = await fetchWithRetry(
        `https://newsapi.org/v2/top-headlines?country=us&pageSize=8&apiKey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}`
      );

      newsApiTrends = await Promise.all(
        (newsApiData.articles || []).map(async (article: Article) => {
          const source = await prisma.source.findFirst({
            where: { url: article.url },
          });
          return {
            ...article,
            localSourceId: source?.id || null,
          };
        })
      );
    } catch (error: unknown) {
      console.error("Error en NewsAPI:", error);
      
      if (isApiError(error) && error.isRateLimit) {
        rateLimitWarning =
          "Límite de solicitudes excedido. Datos de noticias no disponibles.";
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        favorites: topFavorites,
        comments: topCommented,
        trends: newsApiTrends,
      },
      warnings: rateLimitWarning ? [rateLimitWarning] : [],
    });
  } catch (error: unknown) {
    console.error("Error completo:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
});
