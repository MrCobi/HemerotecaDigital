// src/app/sources/[id]/page.server.tsx
import { Source } from "@/src/interface/source";
import { Article } from "@/src/interface/article";
import SourcePageClient from "./SourcePageClient";

export default async function SourcePage(
  context: { params: Promise<{ id: string }> }
) {
  // Espera a resolver la promesa para obtener el id
  const { id: sourceId } = await context.params;

  if (!sourceId || sourceId.trim() === "") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900">
          ID de fuente no proporcionado.
        </h1>
      </div>
    );
  }

  let source: Source | null = null;
  let articles: Article[] = [];

  try {
    // Obtener fuente desde el endpoint de la API
    const sourceResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/sources/${sourceId}`
    );

    if (sourceResponse.ok) {
      source = await sourceResponse.json();
    }

    // Obtener artículos desde el endpoint de la API
    if (source) {
      const articlesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/api/sources/${sourceId}/articles?sortBy=popularity&language=${source.language}`
      );

      if (articlesResponse.ok) {
        articles = await articlesResponse.json();
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  if (!source) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900">
          No se encontró la fuente solicitada.
        </h1>
      </div>
    );
  }

  return <SourcePageClient source={source} articles={articles} />;
}
