// src/app/api/trends/route.ts
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { Article } from "@/src/interface/article";

async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      console.log(`Intento ${i + 1}: Status ${response.status}`);

      if (response.ok) return response;

      const errorData = await response.json();
      console.error("Error de NewsAPI:", errorData);
      return NextResponse.json(
        { error: errorData.message || "NewsAPI Error" },
        { status: response.status }
      );
    } catch (error) {
      console.error(`Error de red: ${error}`);
    }
    await new Promise(resolve => setTimeout(resolve, delay));
  }
  throw new Error(`Failed after ${retries} retries`);
}

export async function GET() {
  try {
    // 1. Fuentes más favoritadas con el nombre del source
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
          sourceName: source?.name || "Unknown Source",
        };
      }));
    });

    // 2. Fuentes con más comentarios con el nombre del source
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
          sourceName: source?.name || "Unknown Source",
        };
      }));
    });

    // 3. Artículos trending desde NewsAPI
    const newsApiResponse = await fetchWithRetry(
      `https://newsapi.org/v2/top-headlines?country=us&pageSize=8&apiKey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}`
    );

    if (!(newsApiResponse instanceof Response)) {
      return newsApiResponse; // Devuelve el error ya manejado
    }

    const newsApiData = await newsApiResponse.json();

    // Mapear datos para incluir información de fuente local
    const newsWithSources = await Promise.all(
      newsApiData.articles.map(async (article: Article) => {
        const source = await prisma.source.findFirst({
          where: { url: article.url },
        });
        return {
          ...article,
          localSourceId: source?.id || null,
        };
      })
    );

    return NextResponse.json({
      topFavorites,
      topCommented,
      newsApiTrends: newsWithSources,
    });

  } catch (error) {
    console.error("Error completo:", error);
    return NextResponse.json(
      { error: "Error interno - Ver logs del servidor" },
      { status: 500 }
    );
  }
}