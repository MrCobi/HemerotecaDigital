// src/app/categories/[category]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, Tag, ExternalLink } from "lucide-react";
import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function CategoryPage() {
  const { category } = useParams();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSources = useCallback(async () => {
    try {
      setIsLoading(true);
      if (!category) throw new Error("Categoría no especificada");

      const categoryName = Array.isArray(category) ? category[0] : category;
      const response = await fetch(
        `/api/sources/categories/${encodeURIComponent(categoryName)}`
      );

      if (!response.ok) throw new Error("Error al cargar las fuentes");

      setSources(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  const getCategoryName = () => {
    try {
      return decodeURIComponent(category as string);
    } catch {
      return "Categoría desconocida";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-blue-600">Buscando fuentes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        <div className="text-center">
          <Tag className="h-16 w-16 mx-auto text-red-400 mb-4" />
          <p className="text-xl">{error}</p>
          <Link href="/sources" className="mt-6 inline-block">
            <Button variant="outline" className="flex items-center">
              Volver a fuentes
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Tag className="h-8 w-8 mr-2 text-blue-500" />
            Categoría: {getCategoryName()}
          </h1>
          <Link href="/sources">
            <Button variant="outline" className="flex items-center">
              Ver todas las fuentes
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      {sources.length === 0 ? (
        <div className="text-center py-12 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-blue-100 dark:border-gray-700">
          <Tag className="h-16 w-16 mx-auto text-blue-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No se encontraron fuentes en esta categoría
          </p>
          <Link href="/sources">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Explorar todas las fuentes
            </Button>
          </Link>
        </div>
      ) : (
        <div>
          <SourcesPage
            sources={sources}
            showFilters={true}
            showPagination={true}
            isFavoritePage={false}
          />
        </div>
      )}
    </div>
  );
}
