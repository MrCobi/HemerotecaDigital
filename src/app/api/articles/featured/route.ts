import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { Article } from "@/src/interface/article";
import { API_ROUTES } from "@/src/config/api-routes";

// Define una interfaz para los artículos que devolverá la API
interface NewsArticle {
  source: {
    id: string | null;
    name: string;
  };
  author: string;
  title: string;
  description: string;
  url: string;
  urlToImage: string;
  publishedAt: string;
  content: string;
}

// Función auxiliar para manejar errores de fetching con reintento
async function fetchWithRetry(url: string, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Si estamos en el último intento y no es exitoso, lanzamos error
      if (i === retries - 1) {
        throw new Error(`Error: ${response.status}`);
      }
      
      // Esperar antes del próximo intento
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // Incrementar el retraso para el backoff exponencial
      delay *= 2;
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }
    }
  }
  
  throw new Error('Max retries reached');
}

export async function GET(req: NextRequest) {
  try {
    // Usar la URL configurada en API_ROUTES para las noticias destacadas
    const data = await fetchWithRetry(API_ROUTES.external.news);
    
    // Transformar los artículos al formato esperado
    const articles = data.articles.map((article: NewsArticle) => ({
      source: article.source?.name || "NewsAPI",
      author: article.author || "Anónimo",
      title: article.title,
      description: article.description,
      url: article.url,
      urlToImage: article.urlToImage,
      publishedAt: article.publishedAt,
      content: article.content,
    }));

    // Devolver los artículos formateados
    return NextResponse.json({ articles });
  } catch (error) {
    console.error("Error fetching featured articles:", error);
    return NextResponse.json(
      { error: "Error al obtener artículos destacados" },
      { status: 500 }
    );
  }
}
