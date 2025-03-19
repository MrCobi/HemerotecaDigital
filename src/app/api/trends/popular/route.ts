import prisma from "@/lib/db";
import { NextResponse, NextRequest } from "next/server";
import { Article } from "@/src/interface/article";
import { withAuth } from "../../../../lib/auth-utils";

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
      
      if (response.ok) {
        return await response.json();
      }
      
      // Si estamos tratando con una respuesta de error, vamos a evaluarla
      const errorData = await response.json().catch(() => null);
      console.error('Error API:', errorData);
      
      // Comprobar límite de tasa específicamente
      if (errorData && errorData.code === 'rateLimited') {
        const error: ApiError = {
          status: response.status,
          code: errorData.code,
          message: errorData.message || 'Rate limit exceeded',
          isRateLimit: true
        };
        throw error;
      }
      
      // Otros errores que no son de límite de tasa, no reintentamos
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      // Si es un error de límite de tasa, no reintentamos
      if (isApiError(error) && error.isRateLimit) {
        throw error;
      }
      
      // Para otros errores, solo reintentamos si no estamos en el último intento
      if (i === retries - 1) {
        throw error;
      }
      
      // Esperar antes del próximo intento
      await new Promise(resolve => setTimeout(resolve, delay));
      // Incrementar el retraso para el backoff exponencial
      delay *= 2;
    }
  }
  
  throw new Error('Max retries reached');
}

export const GET = withAuth(async (req: NextRequest, { userId }: { userId: string }) => {
  try {
    // 1. Fuentes más favoritadas
    const topFavorites = await prisma.favoriteSource.groupBy({
      by: ['sourceId'],
      _count: {
        sourceId: true
      },
      orderBy: {
        _count: {
          sourceId: 'desc'
        }
      },
      take: 10
    });

    // Obtener detalles de estas fuentes
    const favoriteSourcesDetails = await Promise.all(
      topFavorites.map(async (item) => {
        const source = await prisma.source.findUnique({
          where: { id: item.sourceId },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true,
            language: true
          }
        });
        return {
          source,
          count: item._count
        };
      })
    );

    // 2. Fuentes con más actividad reciente (comentarios, valoraciones)
    const timeThreshold = new Date();
    timeThreshold.setDate(timeThreshold.getDate() - 7); // Última semana

    const [recentComments, recentRatings] = await Promise.all([
      prisma.comment.groupBy({
        by: ['sourceId'],
        where: {
          createdAt: {
            gte: timeThreshold
          }
        },
        _count: true,
        orderBy: {
          _count: {
            sourceId: 'desc'
          }
        },
        take: 10
      }),
      // En lugar de usar sourceRating, debemos usar rating (singular)
      prisma.rating.groupBy({
        by: ['sourceId'],
        where: {
          updatedAt: {
            gte: timeThreshold
          }
        },
        _count: true,
        orderBy: {
          _count: {
            sourceId: 'desc'
          }
        },
        take: 10
      })
    ]);

    // Combinar y ponderar actividad
    const activityMap = new Map<string, { sourceId: string, activity: number }>();
    
    // Ponderar comentarios (más peso)
    recentComments.forEach((item: any) => {
      activityMap.set(item.sourceId, { 
        sourceId: item.sourceId, 
        activity: item._count * 2
      });
    });
    
    // Añadir valoraciones
    recentRatings.forEach((item: any) => {
      if (activityMap.has(item.sourceId)) {
        const current = activityMap.get(item.sourceId)!;
        activityMap.set(item.sourceId, {
          ...current,
          activity: current.activity + item._count
        });
      } else {
        activityMap.set(item.sourceId, { 
          sourceId: item.sourceId, 
          activity: item._count
        });
      }
    });
    
    // Convertir a array y ordenar
    const topActivity = Array.from(activityMap.values())
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 10);
    
    // Obtener detalles de estas fuentes
    const activeSourcesDetails = await Promise.all(
      topActivity.map(async (item) => {
        const source = await prisma.source.findUnique({
          where: { id: item.sourceId },
          select: {
            id: true,
            name: true,
            imageUrl: true,
            description: true,
            language: true
          }
        });
        return {
          source,
          activity: item.activity
        };
      })
    );

    // También cargar los favoritos del usuario actual
    const userFavorites = await prisma.favoriteSource.findMany({
      where: { userId },
      select: { 
        sourceId: true,
        source: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Obtener fuentes más comentadas
    const topComments = await prisma.comment.groupBy({
      by: ['sourceId'],
      _count: {
        sourceId: true
      },
      orderBy: {
        _count: {
          sourceId: 'desc'
        }
      },
      take: 10
    });

    // Obtener detalles de las fuentes más comentadas
    const commentSourcesDetails = await Promise.all(
      topComments.map(async (item) => {
        const source = await prisma.source.findUnique({
          where: { id: item.sourceId },
          select: {
            id: true,
            name: true
          }
        });
        return {
          sourceId: item.sourceId,
          sourceName: source?.name || "Fuente desconocida",
          _count: {
            sourceId: item._count.sourceId
          }
        };
      })
    );

    // Formatear los favoritos para coincidir con la estructura esperada
    const formattedFavorites = userFavorites.map(fav => ({
      sourceId: fav.sourceId,
      sourceName: fav.source?.name || "Fuente desconocida",
      _count: {
        sourceId: 1 // Conteo ficticio para mantener la estructura
      }
    }));

    // Extraer los trends como objetos API compatible
    const apiTrends = [
      ...favoriteSourcesDetails.map(item => ({
        title: item.source?.name || "Fuente desconocida",
        url: `/sources/${item.source?.id}`,
      })),
      ...activeSourcesDetails
        .filter(item => item.source && !favoriteSourcesDetails.some(fav => fav.source?.id === item.source?.id))
        .map(item => ({
          title: item.source?.name || "Fuente desconocida",
          url: `/sources/${item.source?.id}`,
        }))
    ];

    // Obtener noticias destacadas de NewsAPI
    let newsApiTrends: any[] = [];
    try {
      const newsApiUrl = "https://newsapi.org/v2/top-headlines?country=us&apiKey=da3db1fa448a49d9a84fbdd13e4d6098";
      const newsResponse = await fetch(newsApiUrl);
      if (newsResponse.ok) {
        const newsData = await newsResponse.json();
        newsApiTrends = newsData.articles.map((article: any) => ({
          title: article.title,
          url: article.url
        })).slice(0, 8); // Limitar a 8 artículos
      }
    } catch (error) {
      console.error("Error fetching NewsAPI headlines:", error);
    }

    // Asegurarnos de devolver arrays vacíos si no hay datos
    return NextResponse.json({
      data: {
        trends: newsApiTrends.length > 0 ? newsApiTrends : apiTrends || [],
        favorites: formattedFavorites || [],
        comments: commentSourcesDetails || []
      }
    });
  } catch (error) {
    console.error("Error en trends:", error);
    return NextResponse.json(
      { error: "Error al obtener tendencias" },
      { status: 500 }
    );
  }
});
