// lib/api.ts
import { Article } from "@/src/interface/article";
import { API_ROUTES } from "@/src/config/api-routes";

export type PrivacySettings = {
  showFavorites: boolean;
  showActivity: boolean;
};

export async function updatePrivacySettings(settings: PrivacySettings) {
  try {
    const response = await fetch(API_ROUTES.users.privacy, {
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
    const response = await fetch(API_ROUTES.users.privacy, {
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
    // Importante: Para evitar problemas con la API, usamos fetch al endpoint propio
    // en lugar de llamar directamente a NewsAPI
    const response = await fetch(API_ROUTES.articles.featured);
    
    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }

    const data = await response.json();
    const articles = data.articles || [];
    
    // Guardar en caché
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        data: articles,
        timestamp: now,
      })
    );

    return articles;
  } catch (error) {
    console.error("Error obteniendo artículos destacados:", error);
    // En caso de error, intentar usar datos en caché si existen, aunque estén vencidos
    if (cachedData) {
      const { data } = JSON.parse(cachedData);
      return data;
    }
    return []; // Devolver array vacío si no hay datos
  }
}