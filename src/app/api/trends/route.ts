import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { Article } from "@/src/interface/article";

type NewsApiTrend = Article & {
  localSourceId: string | null;
};

async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      console.log(`Intento ${i + 1}: Status ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json();
        const errorPayload = {
          status: response.status,
          code: errorData.code || 'unknown',
          message: errorData.message || 'Error desconocido',
          isRateLimit: response.status === 429 // Nueva propiedad
        };

        // Lanzar como objeto para mejor manejo
        throw errorPayload;
      }

      return await response.json();
      
    } catch (error) {
      console.error(`Error en fetchWithRetry:`, error);
      
      // Verificar si es error de rate limit
      if ((error as any).isRateLimit) {
        console.log('Error 429 detectado, abortando reintentos');
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

export async function GET() {
  try {
    // 1. Fuentes más favoritadas
    const topFavorites = await prisma.favoriteSource.groupBy({
      by: ["sourceId"],
      _count: { sourceId: true },
      orderBy: { _count: { sourceId: "desc" } },
      take: 8,
    }).then(async (favorites) => {
      return await Promise.all(favorites.map(async (favorite) => {
        const source = await prisma.source.findUnique({
          where: { id: favorite.sourceId },
          select: { name: true },
        });
        return {
          ...favorite,
          sourceName: source?.name || "Fuente desconocida",
        };
      }));
    });

    // 2. Fuentes con más comentarios
    const topCommented = await prisma.comment.groupBy({
      by: ["sourceId"],
      _count: { sourceId: true },
      orderBy: { _count: { sourceId: "desc" } },
      take: 8,
    }).then(async (commented) => {
      return await Promise.all(commented.map(async (comment) => {
        const source = await prisma.source.findUnique({
          where: { id: comment.sourceId },
          select: { name: true },
        });
        return {
          ...comment,
          sourceName: source?.name || "Fuente desconocida",
        };
      }));
    });

    // 3. Manejo de artículos trending
    let newsApiTrends: NewsApiTrend[] = [];
    let rateLimitWarning = '';
    
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
    } catch (error) {
      console.error('Error en NewsAPI:', error);
      
      if ((error as any).isRateLimit) {
        rateLimitWarning = 'Límite de solicitudes excedido. Datos de noticias no disponibles.';
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        favorites: topFavorites,
        comments: topCommented,
        trends: newsApiTrends
      },
      warnings: rateLimitWarning ? [rateLimitWarning] : []
    });

  } catch (error) {
    console.error("Error completo:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Error interno del servidor",
        details: (error as Error).message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}