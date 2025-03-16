"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Tag, ExternalLink } from "lucide-react";
import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { Button } from "@/src/app/components/ui/button";
import Link from "next/link";

export default function CategoryPage() {
  const { category } = useParams();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSources, setTotalSources] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const sourcesPerPage = 6;

  const fetchSources = useCallback(async () => {
    try {
      if (!category) throw new Error("Categoría no especificada");

      const categoryName = Array.isArray(category) ? category[0] : category;
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: sourcesPerPage.toString(),
        category: decodeURIComponent(categoryName),
        ...(searchTerm && { search: searchTerm }),
        ...(selectedLanguage !== "all" && { language: selectedLanguage })
      });

      // Se realiza la consulta sin reiniciar el estado de carga,
      // de modo que después de la carga inicial los filtros siguen siendo visibles.
      const response = await fetch(`/api/sources?${params}`);
      if (!response.ok) throw new Error("Error al cargar las fuentes");

      const data = await response.json();
      setSources(data.sources);
      setTotalSources(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsLoading(false);
    }
  }, [category, currentPage, searchTerm, selectedLanguage]);

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
      {/* Cabecera de la categoría */}
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
      {/* Siempre se muestran los filtros, la paginación y el grid de fuentes,
          incluso si sources es un arreglo vacío. Así, el usuario puede modificar
          el término de búsqueda o cambiar el idioma sin tener que recargar la página. */}
      <SourcesPage
        sources={sources}
        totalSources={totalSources}
        currentPage={currentPage}
        sourcesPerPage={sourcesPerPage}
        selectedLanguage={selectedLanguage}
        onPageChange={setCurrentPage}
        onSearch={setSearchTerm}
        onLanguageChange={setSelectedLanguage}
        showFilters={true}
        showPagination={true}
        isFavoritePage={false}
      />
    </div>
  );
}
