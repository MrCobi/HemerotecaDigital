"use client";

import { useState, useEffect, useCallback } from "react";
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
import Link from "next/link";
import { debounce } from "lodash";

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

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const totalPages = Math.ceil(totalSources / sourcesPerPage);

  const loadFavorites = useCallback(async () => {
    if (session?.user?.id) {
      try {
        const response = await fetch("/api/favorites/list");
        if (response.ok) {
          const data = await response.json();
          setFavorites(new Set(data.favoriteIds));
        }
      } catch (error) {
        console.error("Error cargando favoritos:", error);
      }
    }
  }, [session?.user?.id]);

  const debouncedSearch = useCallback(
    debounce((term: string) => {
      onSearch(term);
      onPageChange(1);
    }, 300),
    [onSearch, onPageChange]
  );

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
        await fetch("/api/favorites/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sourceId }),
        });
        setFavorites((prev) => {
          const newFav = new Set(prev);
          newFav.delete(sourceId);
          return newFav;
        });
      } else {
        await fetch("/api/favorites/add", {
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600/5 to-indigo-600/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!isFavoritePage && (
          <div
            className={`text-center mb-16 transition-all duration-1000 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              Fuentes de Noticias
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Explora nuestra colección de periódicos y medios de comunicación
              de todo el mundo
            </p>
            <div className="h-1 w-20 bg-blue-600 mx-auto mt-6"></div>
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
            <Card className="backdrop-blur-sm bg-white/80 border-blue-100">
              <CardHeader>
                <CardTitle className="text-blue-900">Filtrar Fuentes</CardTitle>
                <CardDescription>
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
                      <SelectTrigger className="w-full">
                        <Globe2 className="w-4 h-4 mr-2" />
                        <SelectValue placeholder="Seleccionar idioma" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los idiomas</SelectItem>
                        {languages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code}>
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
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
              <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-blue-100 group hover:scale-[1.02]">
                <div className="relative h-48">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105"
                    style={{
                      backgroundImage: `url(${source.imageUrl})`,
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute top-4 right-4 bg-white/90 px-3 py-1 rounded-full text-sm font-medium text-gray-800 flex items-center shadow-lg">
                    {languages.find((l) => l.code === source.language)?.flag}{" "}
                    <span className="ml-2">
                      {languages.find((l) => l.code === source.language)?.name}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-4 left-4 text-red-400 hover:text-red-500 bg-white/90 backdrop-blur-sm hover:bg-white/100 shadow-md hover:shadow-lg"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(source.id);
                    }}
                  >
                    <Heart
                      className={`w-6 h-6 ${
                        favorites.has(source.id)
                          ? "fill-current stroke-red-600"
                          : "stroke-current stroke-2"
                      }`}
                    />
                  </Button>
                </div>
                <CardHeader>
                  <CardTitle className="text-blue-900">{source.name}</CardTitle>
                  <CardDescription>{source.description}</CardDescription>
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
                    <span className="text-sm text-blue-600 font-medium px-3 py-1 bg-blue-50 rounded-full">
                      {source.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {showPagination && totalSources > sourcesPerPage && (
          <div className="mt-12 flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                className="w-10 h-10 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-10 h-10 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? "default" : "outline"}
                      onClick={() => onPageChange(pageNum)}
                      className={`w-10 h-10 p-0 ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : ""
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  onPageChange(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages}
                className="w-10 h-10 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="w-10 h-10 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              Mostrando {(currentPage - 1) * sourcesPerPage + 1} -{" "}
              {Math.min(currentPage * sourcesPerPage, totalSources)} de{" "}
              {totalSources} fuentes
            </p>
          </div>
        )}

        {sources.length === 0 && (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-xl border border-blue-100">
            <Search className="w-16 h-16 mx-auto text-blue-300 mb-4" />
            <h3 className="text-2xl font-bold text-blue-900 mb-2">
              No se encontraron resultados
            </h3>
            <p className="text-blue-600">
              Intenta con otros términos de búsqueda o cambia el filtro de
              idioma
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
