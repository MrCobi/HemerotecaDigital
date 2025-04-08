"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { FollowButton } from "@/src/app/components/FollowButton";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Input } from "@/src/app/components/ui/input";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { API_ROUTES } from "@/src/config/api-routes";
import { useRouter } from "next/navigation";
import { useAnimationSettings, useConditionalAnimation, useConditionalTransition } from "../hooks/useAnimationSettings";
import { UserCard } from "@/src/app/components/UserCard";
import { UserIcon } from "lucide-react";

type Stats = {
  followers?: number;
};

type User = {
  stats: Stats;
  id: string;
  name: string;
  username: string;
  bio?: string;
  image: string;
};

export default function ExplorePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;
  const [followingStatus, setFollowingStatus] = useState<
    Record<string, boolean>
  >({});
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [windowWidth, setWindowWidth] = useState(0);
  const [sortBy, setSortBy] = useState("followers");
  const [sortOrder, setSortOrder] = useState("desc");

  // Obtener el estado de las animaciones
  const animationsEnabled = useAnimationSettings();
  
  // Variantes para las animaciones condicionadas
  const fadeInVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0 }
  };
  
  const noAnimationVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 }
  };
  
  // Usar el hook con los argumentos necesarios
  const animationVariants = useConditionalAnimation(fadeInVariants, noAnimationVariants);
  const animationTransition = useConditionalTransition(0.3);

  // Detectar el ancho de pantalla en el cliente
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    
    // Configuración inicial
    handleResize();
    
    // Evento de cambio de tamaño
    window.addEventListener('resize', handleResize);
    
    // Limpieza
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setCurrentPage(1); // Resetear a página 1 cuando cambia la búsqueda
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        API_ROUTES.users.suggestions(debouncedQuery, currentPage, itemsPerPage, sortBy, sortOrder),
        {
          headers: { Authorization: `Bearer ${session?.user?.id}` },
        }
      );

      if (!response.ok) throw new Error("Error loading suggestions");

      const data = await response.json();
      setUsers(data.data);
      
      // Actualizar datos de paginación desde el backend
      setTotalPages(data.pagination.totalPages);
      
      // Check follow status for all users in one request
      if (data.data.length > 0) {
        const ids = data.data.map((user: User) => user.id);
        const statusResponse = await fetch(API_ROUTES.users.followStatus(ids), {
          headers: { Authorization: `Bearer ${session?.user?.id}` },
        });
        const status = await statusResponse.json();
        setFollowingStatus(status);
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
      setError("Error loading suggested users");
      toast({
        title: "Error",
        description: "Could not load suggestions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, toast, debouncedQuery, currentPage, itemsPerPage, sortBy, sortOrder]);

  useEffect(() => {
    if (session) loadSuggestions();
  }, [session, loadSuggestions]);

  const handleFollowUpdate = (
    userId: string,
    isFollowing: boolean,
    serverFollowerCount?: number
  ) => {
    setFollowingStatus((prev) => ({
      ...prev,
      [userId]: isFollowing,
    }));

    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId
          ? {
              ...user,
              stats: {
                ...user.stats,
                followers:
                  serverFollowerCount ??
                  (isFollowing
                    ? (user.stats?.followers || 0) + 1
                    : Math.max(0, (user.stats?.followers || 0) - 1)),
              },
            }
          : user
      )
    );

    toast({
      title: "¡Éxito!",
      description: `Has ${
        isFollowing ? "seguido" : "dejado de seguir"
      } al usuario`,
    });
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // No necesitamos recalcular los usuarios paginados aquí, 
    // ya que loadSuggestions se disparará con el nuevo currentPage
    window.scrollTo(0, 0);
  };

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      // Si ya está ordenado por este campo, cambiar la dirección de ordenación
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      // Si es un nuevo campo, establecerlo y restablecer la dirección a desc
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    // Volver a la primera página cuando cambia la ordenación
    setCurrentPage(1);
  };

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading") {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto p-4 text-center text-destructive"
      >
        {error}
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600/5 via-indigo-600/5 to-purple-600/5 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-[10%] w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 left-[15%] w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="container relative z-10 mx-auto px-4 py-8 max-w-7xl">
        <motion.div
          initial={animationVariants.hidden}
          animate={animationVariants.visible}
          transition={animationTransition}
          className="space-y-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg">
                <Users className="h-6 w-6" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">
                Descubrir Usuarios
              </h1>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-8">
              <div className="relative flex-grow">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500 dark:text-gray-400">
                  <Search className="h-5 w-5" />
                </span>
                <Input
                  placeholder="Buscar por nombre, nombre de usuario o bio..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10 pr-4 py-2 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
                />
              </div>
              
              {/* Opciones de ordenación */}
              <div className="flex flex-row gap-2">
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg flex overflow-hidden">
                  <button
                    onClick={() => handleSortChange("followers")}
                    className={`px-3 py-2 text-sm transition-colors flex items-center gap-1 ${
                      sortBy === "followers"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <Users size={16} />
                    Seguidores
                    {sortBy === "followers" && (
                      <span className="ml-1">
                        {sortOrder === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortChange("name")}
                    className={`px-3 py-2 text-sm transition-colors flex items-center gap-1 ${
                      sortBy === "name"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    <UserIcon size={16} />
                    Nombre
                    {sortBy === "name" && (
                      <span className="ml-1">
                        {sortOrder === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => handleSortChange("createdAt")}
                    className={`px-3 py-2 text-sm transition-colors flex items-center gap-1 ${
                      sortBy === "createdAt"
                        ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                    }`}
                  >
                    Más recientes
                    {sortBy === "createdAt" && (
                      <span className="ml-1">
                        {sortOrder === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
            </div>
          ) : users.length === 0 ? (
            <motion.div
              initial={animationVariants.hidden}
              animate={animationVariants.visible}
              transition={animationTransition}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="p-6 rounded-full bg-blue-100/50 dark:bg-blue-900/30 mb-4">
                <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-lg text-muted-foreground">
                {debouncedQuery
                  ? "No se encontraron resultados"
                  : "No hay usuarios sugeridos"}
              </p>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={animationVariants.hidden}
                animate={animationVariants.visible}
                transition={animationTransition}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {users.map((user) => (
                  <motion.div
                    key={user.id}
                    initial={animationVariants.hidden}
                    animate={animationVariants.visible}
                    transition={{
                      ...animationTransition,
                    }}
                    className="w-full"
                  >
                    <UserCard
                      user={user}
                      action={
                        <FollowButton
                          targetUserId={user.id}
                          isFollowing={followingStatus[user.id] || false}
                          onSuccess={(isFollowing) =>
                            handleFollowUpdate(user.id, isFollowing)
                          }
                        />
                      }
                    />
                  </motion.div>
                ))}
              </motion.div>

              {/* Solo mostrar paginación si hay más de una página */}
              {totalPages > 1 && (
                <motion.div 
                  className="flex justify-center items-center gap-1 mt-8"
                  initial={animationVariants.hidden}
                  animate={animationVariants.visible}
                  transition={{ ...animationTransition, delay: 0.2 }}
                >
                  {/* Primera página - Oculto en móviles */}
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                    whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                    className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex items-center justify-center rounded-md bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 relative z-10"
                    onClick={() => handlePageChange(1)}
                    disabled={currentPage === 1}
                  >
                    <span className="text-xs sm:text-sm font-bold">&lt;&lt;</span>
                  </motion.button>
                  
                  {/* Botón Anterior */}
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                    whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                    className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 relative z-10"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <span className="text-xs sm:text-sm font-bold">&lt;</span>
                  </motion.button>

                  {/* Números de página - Adaptativo según ancho de pantalla */}
                  <div className="inline-flex items-center relative z-10 space-x-1">
                    {Array.from({ length: Math.min(totalPages, windowWidth < 640 ? 3 : 5) }).map((_, i) => {
                      // Calcular el número de página basado en la posición actual
                      let pageNum;
                      const maxVisiblePages = windowWidth < 640 ? 3 : 5;
                      
                      if (totalPages <= maxVisiblePages) {
                        // Si hay menos páginas que el máximo visible, mostrar todas secuencialmente
                        pageNum = i + 1;
                      } else if (currentPage <= Math.ceil(maxVisiblePages / 2)) {
                        // Si estamos en las primeras páginas
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
                        // Si estamos en las últimas páginas
                        pageNum = totalPages - maxVisiblePages + 1 + i;
                      } else {
                        // Si estamos en páginas intermedias
                        pageNum = currentPage - Math.floor(maxVisiblePages / 2) + i;
                      }

                      return (
                        <motion.button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                          whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                          className={`h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md transition-all duration-200 ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white dark:bg-blue-700 shadow-sm"
                              : "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          }`}
                        >
                          {pageNum}
                        </motion.button>
                      );
                    })}
                  </div>
                  
                  {/* Botón Siguiente */}
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                    whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                    className="h-8 w-8 sm:h-9 sm:w-9 flex items-center justify-center rounded-md bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 relative z-10"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="text-xs sm:text-sm font-bold">&gt;</span>
                  </motion.button>
                  
                  {/* Última página - Oculto en móviles */}
                  <motion.button
                    whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                    whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                    className="h-8 w-8 sm:h-9 sm:w-9 hidden sm:flex items-center justify-center rounded-md bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all duration-200 relative z-10"
                    onClick={() => handlePageChange(totalPages)}
                    disabled={currentPage === totalPages}
                  >
                    <span className="text-xs sm:text-sm font-bold">&gt;&gt;</span>
                  </motion.button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
