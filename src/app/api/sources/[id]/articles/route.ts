// api/sources/[id]/articles/route.ts
import { NextResponse } from 'next/server';
import { Article } from '@/src/interface/article';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') || 'popularity';
    const language = searchParams.get('language') || 'es';
    
    const apiUrl = new URL("https://newsapi.org/v2/everything");
    apiUrl.searchParams.set("sources", id);
    apiUrl.searchParams.set("pageSize", "6");
    apiUrl.searchParams.set("sortBy", sortBy);
    apiUrl.searchParams.set("language", language);
    apiUrl.searchParams.set("apiKey", process.env.NEWS_API_KEY!);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al obtener artículos' },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    const articles: Article[] = data.articles?.map((article: Article) => ({
      sourceId: article.source?.id || id,
      author: article.author || null,
      title: article.title,
      description: article.description || null,
      url: article.url,
      urlToImage: article.urlToImage || null,
      publishedAt: article.publishedAt,
      content: article.content || null,
    })) || [];

    return NextResponse.json(articles);

  } catch (error) {
    console.error("Error en endpoint /api/sources/[id]/articles:", error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}