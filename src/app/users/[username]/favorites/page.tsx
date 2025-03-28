"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { Button } from "@/src/app/components/ui/button";
import { Star, ExternalLink, Heart, User } from "lucide-react";
import Link from "next/link";
import { API_ROUTES } from "@/src/config/api-routes";
import Loading from "@/src/app/components/Loading";

interface Favorite {
  id: string;
  source: Source;
  userId: string;
  createdAt: string;
}

interface UserData {
  id: string;
  name: string;
  username: string;
}

export default function UserFavoritesPage() {
  const params = useParams();
  const username = params.username as string;
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [favoriteSources, setFavoriteSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);

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

  const loadUserData = useCallback(async () => {
    try {
      const userResponse = await fetch(API_ROUTES.users.byUsername(username));
      if (!userResponse.ok) {
        throw new Error("Usuario no encontrado");
      }
      const userData: UserData = await userResponse.json();
      setUserData(userData);
      return userData.id;
    } catch (error) {
      setError("No se pudo encontrar al usuario");
      console.error("Error al cargar datos del usuario:", error);
      return null;
    }
  }, [username]);

  const loadFavorites = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      setError(null);
      const favoritesResponse = await fetch(API_ROUTES.favorites.user(userId, 1, 50));
      if (!favoritesResponse.ok) {
        const errorData: { error?: string } = await favoritesResponse.json();
        throw new Error(errorData.error || "Error al obtener favoritos");
      }
      const favoritesData: { favorites: Favorite[] } = await favoritesResponse.json();
      const sources = favoritesData.favorites.map((fav: Favorite) => fav.source);
      setFavoriteSources(sources || []);
    } catch (error: unknown) {
      console.error("Error al cargar favoritos:", error);
      setError(error instanceof Error ? error.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      const fetchData = async () => {
        const userId = await loadUserData();
        if (userId) {
          await loadFavorites(userId);
        }
      };
      fetchData();
    }
  }, [loadUserData, loadFavorites, session]);

  // Filtrado en memoria de los favoritos según búsqueda e idioma
  const filteredSources = favoriteSources.filter((source) => {
    const matchesSearch =
      searchTerm === "" ||
      source.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLanguage =
      selectedLanguage === "all" || source.language === selectedLanguage;
    return matchesSearch && matchesLanguage;
  });

  const totalSources = filteredSources.length;
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * sourcesPerPage,
    currentPage * sourcesPerPage
  );

  const handleFavoriteUpdate = (sourceId: string) => {
    setFavoriteSources((prev) =>
      prev.filter((source) => source.id !== sourceId)
    );
  };

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8 bg-red-50 dark:bg-red-900/20 rounded-xl max-w-lg">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">Error</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <Link href="/sources">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              Explorar periódicos
            </Button>
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen">
      {/* Header con la información del usuario */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col items-center text-center sm:text-left gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center flex-wrap justify-center">
            <Heart className="h-6 w-6 sm:h-8 sm:w-8 mr-2 text-red-500 flex-shrink-0" />
            {userData ? (
              <span className="break-words">Periódicos favoritos de {userData.name || username}</span>
            ) : (
              <span>Cargando información del usuario...</span>
            )}
          </h1>
          <div className="flex flex-col sm:flex-row gap-2 self-center">
            {userData && (
              <Link href={`/users/${username}`}>
                <Button variant="outline" className="flex items-center text-sm whitespace-nowrap">
                  <User className="h-4 w-4 mr-2" />
                  Perfil de {username}
                </Button>
              </Link>
            )}
            <Link href="/sources">
              <Button variant="outline" className="flex items-center text-sm whitespace-nowrap">
                Explorar periódicos
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="mt-4 text-blue-600">Cargando favoritos...</p>
        </div>
      ) : favoriteSources.length === 0 ? (
        <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Star className="h-16 w-16 mx-auto text-blue-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {userData?.name || username} no tiene periódicos favoritos
          </p>
          <Link href="/sources">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white transition-transform hover:scale-105">
              Explorar periódicos
            </Button>
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
