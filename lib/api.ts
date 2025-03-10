// lib/api.ts
import { Article } from "@/src/interface/article";
import { Source } from "@prisma/client";
import prisma from "./db";
import { getSession } from "next-auth/react";

export async function fetchArticlesBySource(
  sourceId: string,
  sortBy: string = "popularity",
  language: string = "es"
): Promise<Article[]> {
  try {
    const apiUrl = new URL("https://newsapi.org/v2/everything");
    apiUrl.searchParams.set("sources", sourceId);
    apiUrl.searchParams.set("pageSize", "6");
    apiUrl.searchParams.set("sortBy", sortBy);
    apiUrl.searchParams.set("language", language);
    apiUrl.searchParams.set("apiKey", process.env.NEWS_API_KEY!);

    const response = await fetch(apiUrl.toString());
    if (!response.ok) return [];
    
    const data = await response.json();
    return data.articles?.map((article: Article) => ({
      sourceId: article.source?.id || sourceId,
      author: article.author || null,
      title: article.title,
      description: article.description || null,
      url: article.url,
      urlToImage: article.urlToImage || null,
      publishedAt: article.publishedAt,
      content: article.content || null,
    })) || [];

  } catch (error) {
    console.error("Error fetching articles:", error);
    return [];
  }
}

export async function fetchSourceById(id: string): Promise<Source | null> {
  try {
    return await prisma.source.findUnique({
      where: { id },
      include: {
        ratings: true,
        comments: true,
        favoriteSources: true
      }
    });
  } catch (error) {
    console.error("Error fetching source:", error);
    return null;
  }
}

export async function updatePrivacySettings(settings: {
  showFavorites?: boolean;
  showActivity?: boolean;
}) {
  const session = await getSession();
  
  if (!session?.user?.id) {
    throw new Error("No autenticado");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      showFavorites: settings.showFavorites,
      showActivity: settings.showActivity
    }
  });
}