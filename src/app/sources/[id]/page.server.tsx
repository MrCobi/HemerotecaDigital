// src/app/sources/[id]/page.server.tsx
import { fetchSourceById, fetchArticlesBySource } from "@/lib/api";
import { Source } from "@/src/interface/source";
import { Article } from "@/src/interface/article";
import SourcePageClient from "./SourcePageClient";

export type Props = { params: Promise<{ id: string }> };

export default async function SourcePage({ params }: Props) {
  const { id: sourceId } = await params;

  if (!sourceId || sourceId.trim() === "") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900">
          ID de fuente no proporcionado.
        </h1>
      </div>
    );
  }

  const source: Source | null = await fetchSourceById(sourceId);

  if (!source) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900">
          No se encontró la fuente solicitada.
        </h1>
      </div>
    );
  }

  // Modificación clave: añadir parámetros de orden e idioma
  const articles: Article[] = await fetchArticlesBySource(
    sourceId,
    "popularity", // Orden predeterminado
    source.language // Idioma de la fuente
  );

  return <SourcePageClient source={source} articles={articles} />;
}