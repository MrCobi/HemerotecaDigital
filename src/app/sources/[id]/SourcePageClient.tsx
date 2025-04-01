// src/app/sources/[id]/SourcePageClient.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Source } from "@/src/interface/source";
import { Article } from "@/src/interface/article";
import { SourceImage } from "./SourceImage.client";
import StarRating from "@/src/app/components/StarRating.client";
import Image from "next/image";
import { useSession } from "next-auth/react";
import CommentForm from "@/src/app/components/Comments/CommentForm";
import CommentList from "@/src/app/components/Comments/CommentList";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { Heart } from "lucide-react";
import { API_ROUTES } from "@/src/config/api-routes";
import { motion } from "framer-motion";
import { useAnimationSettings, useConditionalTransition } from "@/src/app/hooks/useAnimationSettings";

interface SourcePageClientProps {
  source: Source;
  articles: Article[];
}

const sortLabels: Record<string, string> = {
  popularity: "popularidad",
  publishedAt: "fecha",
  relevancy: "relevancia",
};

export default function SourcePageClient({
  source,
  articles: initialArticles,
}: SourcePageClientProps) {
  const [articles, setArticles] = useState<Article[]>(initialArticles);
  const [sortBy, setSortBy] = useState<
    "popularity" | "publishedAt" | "relevancy"
  >("popularity");
  const [isAnimating, setIsAnimating] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const { data: session } = useSession();
  const [refreshKey, _setRefreshKey] = useState(0);
  const [showComments, setShowComments] = useState(false);
  const [commentsCount, setCommentsCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoadingComments, setIsLoadingComments] = useState(false);

  // Obtener configuración de animaciones
  const animationsEnabled = useAnimationSettings();

  // Variantes para animaciones
  const fadeInVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const noAnimationVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 }
  };

  // Usar las variantes adecuadas según la configuración
  const animationVariants = animationsEnabled ? fadeInVariants : noAnimationVariants;
  const animationTransition = useConditionalTransition(0.5);

  useEffect(() => {
    const loadFavorites = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(API_ROUTES.favorites.list);
          if (response.ok) {
            const data = await response.json();
            setFavorites(new Set(data.favoriteIds));
          }
        } catch (error) {
          console.error("Error cargando favoritos:", error);
        }
      }
    };
    loadFavorites();
  }, [session]);

  const handleFavoriteClick = async (sourceId: string) => {
    if (!session?.user?.id) {
      alert("Debes iniciar sesión para agregar a favoritos");
      return;
    }
    try {
      if (favorites.has(sourceId)) {
        await fetch(API_ROUTES.favorites.default, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId }),
        });
        setFavorites((prev) => {
          const newFav = new Set(prev);
          newFav.delete(sourceId);
          return newFav;
        });
      } else {
        await fetch(API_ROUTES.favorites.default, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId }),
        });
        setFavorites((prev) => new Set(prev).add(sourceId));
      }
    } catch (error) {
      console.error("Error al actualizar favoritos:", error);
    }
  };

  const loadArticles = async (order: typeof sortBy = sortBy) => {
    const cacheKey = `source_${source.id}_articles_${order}`;
    const cachedData = sessionStorage.getItem(cacheKey);

    if (cachedData) {
      try {
        setArticles(JSON.parse(cachedData));
        return;
      } catch (error) {
        console.error("Error parsing cached articles:", error);
      }
    }

    try {
      // Usar directamente API_ROUTES para construir la URL
      const response = await fetch(
        `${window.location.origin}${API_ROUTES.sources.articles(source.id, order, source.language)}`
      );

      if (!response.ok) throw new Error("Error fetching articles");

      const fetchedArticles = await response.json();
      setArticles(fetchedArticles);
      sessionStorage.setItem(cacheKey, JSON.stringify(fetchedArticles));
    } catch (error) {
      console.error("Error fetching articles:", error);
      setArticles([]);
    }
  };

  const rotateSort = () => {
    setIsAnimating(true);
    const sortOrder: (typeof sortBy)[] = [
      "relevancy",
      "popularity",
      "publishedAt",
    ];
    const currentIndex = sortOrder.indexOf(sortBy);
    const nextIndex = (currentIndex + 1) % sortOrder.length;
    const nextSort = sortOrder[nextIndex];

    setTimeout(() => {
      setSortBy(nextSort);
      loadArticles(nextSort);
      setIsAnimating(false);
    }, 300);
  };

  const fetchComments = async () => {
    setIsLoadingComments(true);
    try {
      const response = await fetch(
        API_ROUTES.comments.list(source.id, currentPage)
      );
      if (response.ok) {
        const _data = await response.json();
        // Actualizar los comentarios en el estado si es necesario
      }
    } catch (error) {
      console.error("Error al cargar comentarios:", error);
    } finally {
      setIsLoadingComments(false);
    }
  };

  const fetchCommentsCount = useCallback(
    async (invalidateCache = false) => {
      const controller = new AbortController();

      try {
        const baseUrl = API_ROUTES.comments.count(source.id);
        const url = `${baseUrl}${invalidateCache ? `?t=${Date.now()}` : ""}`;

        const response = await fetch(url, {
          signal: controller.signal,
        });

        if (response.ok) {
          const { count } = await response.json();
          setCommentsCount(count);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Error obteniendo conteo:", error);
        }
      }

      return () => controller.abort();
    },
    [source.id, setCommentsCount]
  );

  useEffect(() => {
    fetchCommentsCount(true);
  }, [fetchCommentsCount]);

  useEffect(() => {
    fetchCommentsCount(true);
  }, [refreshKey, fetchCommentsCount]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (showComments) {
      fetchCommentsCount(true);
      interval = setInterval(() => fetchCommentsCount(true), 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showComments, fetchCommentsCount]);

  // Cargar artículos al inicio
  useEffect(() => {
    loadArticles();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-slate-900 dark:to-gray-900">
      <header className="relative py-12 sm:py-16 md:py-20 lg:py-24 overflow-hidden bg-blue-800 dark:bg-gradient-to-br dark:from-slate-900 dark:via-blue-950 dark:to-slate-900">
        {/* Patrones de fondo optimizados */}
        <div className="absolute inset-0 opacity-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="xMidYMid slice"
          >
            <circle
              cx="25"
              cy="75"
              r="30"
              fill="rgba(209, 213, 219, 0.2)"
              className="animate-pulse-slow"
            />
            <circle
              cx="75"
              cy="25"
              r="25"
              fill="rgba(156, 163, 175, 0.2)"
              className="animate-pulse-slow delay-1000"
            />
          </svg>
        </div>

        {/* Contenido principal */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              handleFavoriteClick(source.id);
            }}
            className="absolute top-0 sm:top-4 right-4 bg-white/90 hover:bg-white dark:bg-white/10 dark:hover:bg-white/20 p-2 rounded-full text-xl transition-transform duration-300 hover:scale-105 shadow-lg z-10"
            whileHover={animationsEnabled ? { scale: 1.1 } : {}}
            whileTap={animationsEnabled ? { scale: 0.9 } : {}}
          >
            <Heart
              className={`w-6 h-6 ${favorites.has(source.id)
                ? "fill-current text-red-600" // Corazón lleno cuando está en favoritos
                : "stroke-current text-gray-400 dark:text-gray-300" // Corazón vacío cuando no está en favoritos
                }`}
            />
          </motion.button>

          <div className="flex flex-col lg:flex-row items-center gap-6 sm:gap-8 lg:gap-12 pt-8 sm:pt-6 lg:pt-0">
            {/* Texto a la izquierda en escritorio, centrado en móvil */}
            <div className="flex-1 text-center lg:text-left w-full lg:w-auto">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white dark:text-white mb-3 sm:mb-4 break-words">
                {source.name}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-white/90 dark:text-gray-100/90 mb-4 sm:mb-6 max-w-2xl mx-auto lg:mx-0">
                {source.description}
              </p>

              {/* Componente de rating adaptado para diferentes breakpoints */}
              <div className="w-full max-w-xs sm:max-w-sm mx-auto lg:mx-0 mb-6 relative z-10">
                <StarRating sourceId={source.id} />
              </div>

              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-white/95 hover:bg-white text-gray-700 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white px-3 sm:px-4 md:px-6 py-2 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base"
              >
                Visitar sitio web
                <svg
                  className="ml-2 w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            <div 
              className={`w-full lg:w-auto flex justify-center items-center mt-6 mb-4 lg:my-0 rounded-xl overflow-hidden ${
                showComments ? "max-h-screen" : ""
              }`}
            >
              {source.imageUrl && (
                <div className="lg:ml-4 transform hover:scale-105 transition-transform duration-300">
                  <div className="w-56 h-56 sm:w-64 sm:h-64 lg:w-80 lg:h-80 rounded-full overflow-hidden border-4 border-white/90 dark:border-white/10 shadow-2xl relative">
                    <SourceImage
                      imageUrl={source.imageUrl || ''}
                      name={source.name}
                      size="xlarge" // Carga prioritária de la imagen
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setShowComments(!showComments)}
            className="w-full p-3 sm:p-4 bg-gray-100 dark:bg-gray-800 flex justify-between items-center"
          >
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
              Comentarios ({commentsCount})
            </h2>
            <ChevronDownIcon
              className={`w-5 h-5 sm:w-6 sm:h-6 transform transition-transform text-gray-600 dark:text-white ${showComments ? "rotate-180" : ""
                }`}
            />
          </button>

          {showComments && (
            <div className="bg-gray-50 dark:bg-gray-800/30 backdrop-blur-sm rounded-xl shadow-inner p-4 sm:p-6 mt-8">
              <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                  <CommentForm
                    sourceId={source.id}
                    onCommentAdded={() => {
                      fetchComments();
                      fetchCommentsCount(true);
                    }}
                  />
                </div>

                {isLoadingComments ? (
                  <div className="flex flex-col items-center justify-center py-10">
                    <svg
                      className="animate-spin h-8 w-8 text-blue-500 mb-4"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">Cargando comentarios...</p>
                  </div>
                ) : (
                  <CommentList
                    key={refreshKey}
                    sourceId={source.id}
                    refreshKey={refreshKey}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={animationVariants.hidden}
          animate={animationVariants.visible}
          transition={animationTransition}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Artículos Destacados por{" "}
                <span
                  onClick={rotateSort}
                  className={`text-blue-600 dark:text-blue-400 cursor-pointer inline-block transition-all duration-300 ${isAnimating
                    ? "opacity-0 transform -translate-y-4"
                    : "opacity-100"
                    }`}
                >
                  {sortLabels[sortBy]}
                </span>
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Haz clic en el criterio para cambiar el orden
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm self-end">
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                Ordenar por:
              </span>
              <div className="flex gap-1">
                <span
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition-all ${sortBy === "relevancy"
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  Relevancia
                </span>
                <span
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition-all ${sortBy === "popularity"
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  Popularidad
                </span>
                <span
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm transition-all ${sortBy === "publishedAt"
                    ? "bg-blue-600 text-white"
                    : "text-gray-500 dark:text-gray-400"
                    }`}
                >
                  Fecha
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {articles.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-12">
            <svg
              className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
              />
            </svg>
            <p className="text-xl">No se encontraron artículos.</p>
          </div>
        ) : (
          <motion.div
            initial={animationVariants.hidden}
            animate={animationVariants.visible}
            transition={animationTransition}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
          >
            {articles.map((article) => (
              <article
                key={article.url}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden transform transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
              >
                <figure className="relative h-40 sm:h-48">
                  {article.urlToImage ? (
                    <Image
                      src={article.urlToImage}
                      alt={article.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <svg
                        className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                </figure>

                <div className="p-4 sm:p-6">
                  <header>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-2 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400">
                      {article.title}
                    </h3>
                  </header>

                  {article.description && (
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {article.description}
                    </p>
                  )}

                  <footer className="mt-auto">
                    <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4">
                      {article.author && (
                        <span className="flex items-center">
                          <svg
                            className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                          <span className="truncate max-w-[80px] sm:max-w-[120px]">
                            {article.author}
                          </span>
                        </span>
                      )}
                      <time className="flex items-center">
                        <svg
                          className="w-3 h-3 sm:w-4 sm:h-4 mr-1"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        {new Date(article.publishedAt).toLocaleDateString(
                          "es-ES",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          }
                        )}
                      </time>
                    </div>

                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors text-sm sm:text-base"
                    >
                      Leer más
                      <svg
                        className="ml-1 sm:ml-2 w-3 h-3 sm:w-4 sm:h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14 5l7 7m0 0l-7 7m7-7H3"
                        />
                      </svg>
                    </a>
                  </footer>
                </div>
              </article>
            ))}
          </motion.div>
        )}
      </main>
    </div>
  );
}
