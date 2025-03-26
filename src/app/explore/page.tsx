"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { UserCard } from "@/src/app/components/UserCard";
import { FollowButton } from "@/src/app/components/FollowButton";
import { Skeleton } from "@/src/app/components/ui/skeleton";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Input } from "@/src/app/components/ui/input";
import { motion } from "framer-motion";
import { Search, Users } from "lucide-react";
import { Button } from "@/src/app/components/ui/button";
import { API_ROUTES } from "@/src/config/api-routes";
import { useRouter } from "next/navigation";
import Loading from "@/src/app/components/Loading";
import { useAnimationSettings, useConditionalAnimation, useConditionalTransition } from "../hooks/useAnimationSettings";

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
  const itemsPerPage = 6;
  const [followingStatus, setFollowingStatus] = useState<
    Record<string, boolean>
  >({});
  const [debouncedQuery, setDebouncedQuery] = useState("");

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
      setCurrentPage(1);
    }, 300);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        API_ROUTES.users.suggestions(debouncedQuery),
        {
          headers: { Authorization: `Bearer ${session?.user?.id}` },
        }
      );

      if (!response.ok) throw new Error("Error loading suggestions");

      const { data } = await response.json();
      setUsers(data);

      // Check follow status for all users in one request
      if (data.length > 0) {
        const ids = data.map((user: User) => user.id);
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
  }, [session?.user?.id, toast, debouncedQuery]);

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

  const paginatedUsers = users.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const totalPages = Math.ceil(users.length / itemsPerPage);

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

            <div className="w-full md:w-96 relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-300 pointer-events-none">
                <Search className="h-4 w-4" />
              </div>
              <Input
                type="text"
                placeholder="Buscar por nombre, nombre de usuario o bio..."
                value={searchQuery}
                onChange={handleSearch}
                className="pl-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm border-gray-200 dark:border-gray-700 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-600 focus-visible:ring-offset-0 focus-visible:border-blue-300 dark:focus-visible:border-blue-700 transition-all"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-[220px] w-full rounded-xl bg-muted/50"
                />
              ))}
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
                {paginatedUsers.map((user, _index) => (
                  <motion.div
                    key={user.id}
                    initial={animationVariants.hidden}
                    animate={animationVariants.visible}
                    transition={animationTransition}
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

              {totalPages > 1 && (
                <motion.div 
                  className="flex justify-center gap-3 mt-6"
                  initial={animationVariants.hidden}
                  animate={animationVariants.visible}
                  transition={{ ...animationTransition, delay: 0.2 }}
                >
                  <Button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 transition-all duration-200"
                    variant="outline"
                    size="sm"
                  >
                    Anterior
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: totalPages }).map((_, idx) => (
                      <motion.button
                        key={idx}
                        onClick={() => setCurrentPage(idx + 1)}
                        className={`h-8 w-8 flex items-center justify-center rounded-md transition-all duration-200 ${
                          currentPage === idx + 1
                            ? "bg-blue-600 text-white dark:bg-blue-700 shadow-sm"
                            : "bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        }`}
                        whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                        whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                      >
                        {idx + 1}
                      </motion.button>
                    ))}
                  </div>
                  <Button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-gray-200 dark:border-gray-700 transition-all duration-200"
                    variant="outline"
                    size="sm"
                  >
                    Siguiente
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
}
