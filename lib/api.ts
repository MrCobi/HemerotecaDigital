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
    apiUrl.searchParams.set("apiKey", process.env.NEXT_PUBLIC_NEWS_API_KEY!);

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

export async function fetchArticulosDestacados(): Promise<Article[]> {
  const CACHE_KEY = "featured_news_cache";
  const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  // Verificar caché existente
  const cachedData = sessionStorage.getItem(CACHE_KEY);
  const now = new Date().getTime();

  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (now - timestamp < CACHE_DURATION) {
      return data;
    }
  }

  try {
    const apiUrl = new URL("https://newsapi.org/v2/everything");
    apiUrl.searchParams.set("q", encodeURIComponent("news"));
    apiUrl.searchParams.set("language", "es");
    apiUrl.searchParams.set("sortBy", "publishedAt");
    apiUrl.searchParams.set("pageSize", "21");
    apiUrl.searchParams.set("apiKey", process.env.NEXT_PUBLIC_NEWS_API_KEY!);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    
    const articles = data.articles.map((article: Article) => ({
      source: article.source?.name || "NewsAPI",
      author: article.author || "Anónimo",
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      content: article.content,
    }));

    // Guardar en caché
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: articles,
        timestamp: now
      })
    );

    return articles;

  } catch (error) {
    console.error("Error fetching destacados:", error);
    return [];
  }
}