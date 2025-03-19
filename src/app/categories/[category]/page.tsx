"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Tag, ExternalLink } from "lucide-react";
import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { Button } from "@/src/app/components/ui/button";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { API_ROUTES } from "@/src/config/api-routes";

export default function CategoryPage() {
  const { category } = useParams();
  const [sources, setSources] = useState<Source[]>([]);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalSources, setTotalSources] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const sourcesPerPage = 6;
  const router = useRouter();
  const { data: session, status } = useSession();

  // Verificar autenticación
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const loadSources = useCallback(async () => {
    if (!category) {
      setError("Categoría no especificada");
      setIsInitialLoading(false);
      setIsFilterLoading(false);
      return;
    }

    try {
      const categoryName = Array.isArray(category) ? category[0] : category;
      const decodedCategory = decodeURIComponent(categoryName);
      
      const response = await fetch(
        `${API_ROUTES.sources.list(
          currentPage,
          sourcesPerPage
        )}&category=${encodeURIComponent(decodedCategory)}${
          searchTerm ? `&search=${encodeURIComponent(searchTerm)}` : ""
        }${
          selectedLanguage !== "all" ? `&language=${selectedLanguage}` : ""
        }`
      );
      
      if (!response.ok) throw new Error("Error al cargar las fuentes");

      const data = await response.json();
      setSources(data.sources);
      setTotalSources(data.pagination.total);
      setError(null);
    } catch (error) {
      console.error("Error cargando fuentes:", error);
      setError("Error al cargar las fuentes. Por favor, inténtelo de nuevo.");
      setSources([]);
      setTotalSources(0);
    } finally {
      setIsInitialLoading(false);
      setIsFilterLoading(false);
    }
  }, [category, currentPage, searchTerm, selectedLanguage, sourcesPerPage]);

  // Cargar fuentes inicialmente o cuando cambia la categoría
  useEffect(() => {
    if (status === "authenticated") {
      loadSources();
    }
  }, [status, loadSources]);

  // Manejar cambios en los filtros
  const handleSearch = (term: string) => {
    setIsFilterLoading(true);
    setSearchTerm(term);
  };

  const handleLanguageChange = (language: string) => {
    setIsFilterLoading(true);
    setSelectedLanguage(language);
  };

  const handlePageChange = (page: number) => {
    setIsFilterLoading(true);
    setCurrentPage(page);
  };

  // Efecto para recargar cuando cambian los filtros
  useEffect(() => {
    if (!isInitialLoading && status === "authenticated") {
      loadSources();
    }
  }, [searchTerm, selectedLanguage, currentPage, isInitialLoading, status, loadSources]);

  const getCategoryName = () => {
    try {
      return decodeURIComponent(category as string);
    } catch {
      return "Categoría desconocida";
    }
  };

  // Si está cargando la sesión, mostrar estado de carga
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-blue-600">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  // Si no está autenticado, no renderizar el contenido (aunque redirigirá en el useEffect)
  if (status === "unauthenticated") {
    return null;
  }

  if (isInitialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-blue-600">Buscando fuentes...</p>
        </div>
      </div>
    );
  }

  if (error && sources.length === 0) {
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

      <SourcesPage
        sources={sources}
        totalSources={totalSources}
        currentPage={currentPage}
        sourcesPerPage={sourcesPerPage}
        selectedLanguage={selectedLanguage}
        onPageChange={handlePageChange}
        onSearch={handleSearch}
        onLanguageChange={handleLanguageChange}
        showFilters={true}
        showPagination={true}
        isFavoritePage={false}
        isLoading={isFilterLoading}
      />
    </div>
  );
}
