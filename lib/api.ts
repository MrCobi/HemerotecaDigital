// lib/api.ts
import { Article } from "@/src/interface/article";

export type PrivacySettings = {
  showFavorites: boolean;
  showActivity: boolean;
};

export async function updatePrivacySettings(settings: PrivacySettings) {
  try {
    const response = await fetch('/api/user/privacy', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al actualizar configuración');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw new Error('No se pudo conectar con el servidor');
  }
}

export async function getUserPrivacySettings(): Promise<PrivacySettings> {
  try {
    const response = await fetch('/api/user/privacy', {
      next: { tags: ['privacy-settings'] }
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener configuración');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    throw new Error('No se pudo obtener la configuración');
  }
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