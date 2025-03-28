"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/app/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/app/components/ui/card";
import {
  Search,
  Globe2,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Heart,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Source } from "@/src/interface/source";
import { useSession } from "next-auth/react";
import { debounce } from "lodash";
import { API_ROUTES } from "@/src/config/api-routes";
import { motion } from "framer-motion";
import { useAnimationSettings } from "@/src/app/hooks/useAnimationSettings";

const languages = [
  { code: "es", name: "Español", flag: "🇪🇸" },
  { code: "en", name: "Inglés", flag: "🇬🇧" },
  { code: "fr", name: "Francés", flag: "🇫🇷" },
  { code: "pt", name: "Portugués", flag: "🇵🇹" },
  { code: "it", name: "Italiano", flag: "🇮🇹" },
  { code: "de", name: "Alemán", flag: "🇩🇪" },
  { code: "ar", name: "Árabe", flag: "🇸🇦" },
  { code: "zh", name: "Chino", flag: "🇨🇳" },
  { code: "ru", name: "Ruso", flag: "🇷🇺" },
];

interface SourcesListProps {
  sources: Source[];
  totalSources: number;
  currentPage: number;
  sourcesPerPage: number;
  selectedLanguage: string;
  showFilters?: boolean;
  showPagination?: boolean;
  isFavoritePage?: boolean;
  isLoading?: boolean;
  onFavoriteUpdate?: (sourceId: string) => void;
  onPageChange: (page: number) => void;
  onSearch: (term: string) => void;
  onLanguageChange: (language: string) => void;
}

export default function SourcesPage({
  sources,
  totalSources,
  currentPage,
  sourcesPerPage,
  selectedLanguage,
  showFilters = true,
  showPagination = true,
  isFavoritePage = false,
  isLoading = false,
  onFavoriteUpdate,
  onPageChange,
  onSearch,
  onLanguageChange,
}: SourcesListProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [windowWidth, setWindowWidth] = useState(0);

  // Detectar el ancho de pantalla solo en el lado del cliente
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

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const totalPages = Math.ceil(totalSources / sourcesPerPage);

  const loadFavorites = useCallback(async () => {
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
  }, [session?.user?.id]);

  const debouncedSearch = useMemo(
    () =>
      debounce((term: string) => {
        onSearch(term);
        onPageChange(1);
      }, 300),
    [onSearch, onPageChange]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const toggleFavorite = async (sourceId: string) => {
    if (!session?.user?.id) {
      alert("Debes iniciar sesión para agregar a favoritos");
      return;
    }

    if (isFavoritePage && favorites.has(sourceId)) {
      onFavoriteUpdate?.(sourceId);
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
      console.error("Error al cambiar favorito:", error);
    }
  };

  const navigateToSource = (sourceId: string) => {
    router.push(`/sources/${sourceId}`);
  };

  useEffect(() => {
    setIsLoaded(true);
    loadFavorites();
  }, [loadFavorites]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    debouncedSearch(term);
  };

  const handleLanguageChange = (language: string) => {
    onLanguageChange(language);
    onPageChange(1);
  };

  // Obtener la configuración de animaciones
  const animationsEnabled = useAnimationSettings();

  // Variantes para animaciones condicionales
  const fadeInVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const noAnimationVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 },
  };

  // Utilizar las variantes adecuadas según la configuración
  const animationVariants = animationsEnabled ? fadeInVariants : noAnimationVariants;
  const animationTransition = animationsEnabled ? { duration: 0.3 } : { duration: 0 };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-200/20 dark:bg-blue-400/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-100/20 dark:bg-blue-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        {!isFavoritePage && (
          <div
            className={`text-center mb-16 transition-all duration-1000 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Fuentes de Noticias
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Explora nuestra colección de periódicos y medios de comunicación
              de todo el mundo
            </p>
            <div className="h-1 w-20 bg-blue-600 dark:bg-blue-500 mx-auto mt-6"></div>
          </div>
        )}

        {showFilters && (
          <div
            className={`mb-12 transition-all duration-1000 delay-200 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-blue-100 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-blue-900 dark:text-blue-300">Filtrar Fuentes</CardTitle>
                <CardDescription className="dark:text-gray-400">
                  Encuentra las fuentes que más te interesan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select
                      value={selectedLanguage}
                      onValueChange={handleLanguageChange}
                    >
                      <SelectTrigger className="w-full dark:bg-gray-700 dark:text-white dark:border-gray-600">
                        <Globe2 className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Seleccionar idioma" />
                      </SelectTrigger>
                      <SelectContent className="dark:bg-gray-800 dark:text-white dark:border-gray-700">
                        <SelectItem value="all" className="dark:text-white dark:focus:bg-gray-700 dark:hover:bg-gray-700">Todos los idiomas</SelectItem>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="dark:text-white dark:focus:bg-gray-700 dark:hover:bg-gray-700">
                            <span className="flex items-center">
                              <span className="mr-2">{lang.flag}</span>
                              {lang.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10 dark:bg-gray-700 dark:text-white dark:border-gray-600 dark:placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-60 pointer-events-none">
            {Array.from({ length: sources.length > 0 ? sources.length : 6 }).map((_, idx) => (
              <div key={`skeleton-${idx}`} className="relative h-48 rounded-lg bg-gray-200 dark:bg-gray-800 animate-pulse">
                <div className="h-full flex flex-col p-6">
                  <div className="h-6 w-3/4 bg-gray-300 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-4 w-full bg-gray-300 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 w-2/3 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
                  <div className="mt-auto flex justify-between items-center">
                    <div className="h-8 w-28 bg-gray-300 dark:bg-gray-700 rounded"></div>
                    <div className="h-6 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sources.map((source, index) => (
              <div
                key={source.id}
                className={`transform transition-all duration-500 ${
                  isLoaded
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-10"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-blue-100 dark:border-gray-700 dark:bg-gray-800 group hover:scale-[1.02]">
                  <div className="relative h-48">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                      style={{
                        backgroundImage: `url(${source.imageUrl})`,
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 px-3 py-1 rounded-full text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center shadow-lg">
                      {languages.find((l) => l.code === source.language)?.flag}{" "}
                      <span className="ml-2">
                        {languages.find((l) => l.code === source.language)?.name}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-4 left-4 h-9 w-9 rounded-full flex items-center justify-center text-red-400 hover:text-red-500 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white/100 dark:hover:bg-gray-800/100 shadow-md hover:shadow-lg z-10"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(source.id);
                      }}
                    >
                      <motion.div
                        initial={animationVariants.hidden}
                        animate={animationVariants.visible}
                        transition={animationTransition}
                      >
                        <Heart
                          className={`w-5 h-5 ${
                            favorites.has(source.id)
                              ? "fill-current text-red-500 dark:text-red-400 stroke-red-600 dark:stroke-red-500"
                              : "stroke-current stroke-2 text-red-400 dark:text-red-300"
                          }`}
                        />
                      </motion.div>
                    </Button>
                  </div>
                  <CardHeader>
                    <CardTitle className="text-blue-900 dark:text-blue-300">{source.name}</CardTitle>
                    <CardDescription className="dark:text-gray-400">{source.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center">
                      <Button
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={() => navigateToSource(source.id)}
                      >
                        <Info className="w-4 h-4 mr-2" />
                        Ver detalles
                      </Button>
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-medium px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-full">
                        {source.category}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        )}

        {showPagination && totalSources > sourcesPerPage && (
          <motion.div 
            className="mt-12 flex flex-col items-center space-y-4 px-2"
            initial={animationVariants.hidden}
            animate={animationVariants.visible}
            transition={{ ...animationTransition, delay: 0.3 }}
          >
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Mostrando {Math.min(sourcesPerPage, sources.length)} de {totalSources} fuentes
            </p>
            <div className="inline-flex flex-nowrap items-center justify-center">
              {/* Primera página - Oculto en móviles */}
              <motion.div
                whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                className="relative z-10 hidden sm:block mr-1"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(1)}
                  disabled={currentPage === 1}
                  className="w-8 h-8 sm:w-10 sm:h-10 p-0 relative dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
                >
                  <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </motion.div>
              
              {/* Página anterior */}
              <motion.div
                whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                className="relative z-10 mr-1"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 sm:w-9 sm:h-9 p-0 relative flex items-center justify-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
                >
                  <span className="text-lg font-bold">&lt;</span>
                </Button>
              </motion.div>

              <div className="inline-flex items-center relative z-10 mx-1 space-x-1">
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
                    <motion.div
                      key={pageNum}
                      whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                      whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                      className="relative z-10"
                    >
                      <Button
                        variant={currentPage === pageNum ? "default" : "outline"}
                        onClick={() => onPageChange(pageNum)}
                        className={`w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm relative ${
                          currentPage === pageNum
                            ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                            : "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                        } transition-all duration-200`}
                      >
                        {pageNum}
                      </Button>
                    </motion.div>
                  );
                })}
              </div>
              
              {/* Página siguiente */}
              <motion.div
                whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                className="relative z-10 ml-1"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    onPageChange(Math.min(totalPages, currentPage + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 sm:w-9 sm:h-9 p-0 relative flex items-center justify-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
                >
                  <span className="text-lg font-bold">&gt;</span>
                </Button>
              </motion.div>
              
              {/* Última página - Oculto en móviles */}
              <motion.div
                whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                className="relative z-10 hidden sm:block ml-1"
              >
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 sm:w-10 sm:h-10 p-0 relative dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
                >
                  <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {sources.length === 0 && !isLoading && (
          <div className="text-center py-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-xl border border-blue-100 dark:border-gray-700">
            <Search className="w-16 h-16 mx-auto text-blue-300 dark:text-blue-500 mb-4" />
            <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-blue-600 dark:text-blue-400">
              Intenta con otros términos de búsqueda o cambia el filtro de
              idioma
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
