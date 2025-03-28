"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { Button } from "@/src/app/components/ui/button";
import { ExternalLink, Heart } from "lucide-react";
import Link from "next/link";
import { API_ROUTES } from "@/src/config/api-routes";
import { useRouter } from "next/navigation";
import Loading from "@/src/app/components/Loading";

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favoriteSources, setFavoriteSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados para filtrar y paginar
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const sourcesPerPage = 6;

  // Verificación de autenticación
  useEffect(() => {
    // Si no está autenticado, redirigir a la página de inicio de sesión
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    // Verificar que el correo electrónico esté verificado
    if (status === "authenticated" && !session?.user?.emailVerified) {
      router.push("/auth/verification-pending");
      return;
    }
  }, [status, session, router]);

  const loadFavorites = useCallback(async () => {
    if (session?.user?.id) {
      try {
        setLoading(true);
        const favoritesResponse = await fetch(API_ROUTES.favorites.list);
        const favoritesData = await favoritesResponse.json();
        const favoriteIds = favoritesData.favoriteIds;
  
        const detailsResponse = await fetch(API_ROUTES.sources.details, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sourceIds: favoriteIds }),
        });
  
        if (!detailsResponse.ok) {
          throw new Error("Error al obtener detalles de los periódicos");
        }
  
        const detailsData = await detailsResponse.json();
        setFavoriteSources(detailsData.sources || []);
      } catch (error) {
        console.error("Error al cargar favoritos:", error);
      } finally {
        setLoading(false);
      }
    }
  }, [session?.user?.id]);

  useEffect(() => {
    loadFavorites();
  }, [session, loadFavorites]);

  const handleFavoriteUpdate = (sourceId: string) => {
    setFavoriteSources((prev) =>
      prev.filter((source) => source.id !== sourceId)
    );
  };

  // Filtrado en memoria de los favoritos según búsqueda e idioma
  const filteredSources = favoriteSources.filter((source) => {
    const matchesSearch =
      searchTerm === "" ||
      source.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage =
      selectedLanguage === "all" || source.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  // Paginación en memoria
  const totalSources = filteredSources.length;
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * sourcesPerPage,
    currentPage * sourcesPerPage
  );

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  }

  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center text-center sm:text-left gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 mr-2 text-red-500 flex-shrink-0" />
            Todos mis periódicos favoritos
          </h1>
          <Link href="/api/auth/dashboard" className="self-center">
            <Button variant="outline" className="flex items-center text-sm whitespace-nowrap">
              Volver al dashboard
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </div>
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-blue-600">Cargando favoritos...</p>
        </div>
      ) : (
        <div>
          <SourcesPage
            sources={paginatedSources}
            totalSources={totalSources}
            currentPage={currentPage}
            sourcesPerPage={sourcesPerPage}
            selectedLanguage={selectedLanguage}
            showFilters={true}
            showPagination={true}
            isFavoritePage={true}
            onFavoriteUpdate={handleFavoriteUpdate}
            onPageChange={setCurrentPage}
            onSearch={setSearchTerm}
            onLanguageChange={setSelectedLanguage}
          />
        </div>
      )}
    </div>
  );
}
