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
  showFilters?: boolean;
  showPagination?: boolean;
  isFavoritePage?: boolean;
  onFavoriteUpdate?: (sourceId: string) => void;
}

export default function SourcesPage({
  sources,
  showFilters = true,
  showPagination = true,
  isFavoritePage = false,
  onFavoriteUpdate,
}: SourcesListProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedLanguage, setSelectedLanguage] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const sourcesPerPage = 6;

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  const filteredSources = sources.filter((source) => {
    const matchesLanguage =
      selectedLanguage === "all" || source.language === selectedLanguage;
    const matchesSearch = source.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    return matchesLanguage && matchesSearch;
  });

  const totalPages = Math.ceil(filteredSources.length / sourcesPerPage);
  const indexOfLastSource = currentPage * sourcesPerPage;
  const indexOfFirstSource = indexOfLastSource - sourcesPerPage;
  const currentSources = filteredSources.slice(
    indexOfFirstSource,
    indexOfLastSource
  );

  // Modifica la declaración de loadFavorites
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
  }, [session?.user?.id]); // Dependencias necesarias

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-600/5 to-indigo-600/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header condicional */}
        {!isFavoritePage && (
          <div
            className={`text-center mb-16 transition-all duration-1000 ${
              isLoaded
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-10"
            }`}
          >
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              {isFavoritePage ? "Mis Favoritos" : "Fuentes de Noticias"}
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              {isFavoritePage
                ? "Tu colección personal de periódicos favoritos"
                : "Explora nuestra colección de periódicos y medios de comunicación de todo el mundo"}
            </p>
            <div className="h-1 w-20 bg-blue-600 mx-auto mt-6"></div>
          </div>
        )}

        {/* Filtros condicionales */}
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
                  {isFavoritePage
                    ? "Filtra tus favoritos"
                    : "Encuentra las fuentes que más te interesan"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Select
                      value={selectedLanguage}
                      onValueChange={(value) => {
                        setSelectedLanguage(value);
                        setCurrentPage(1);
                      }}
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
                        onChange={(e) => {
                          setSearchTerm(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Grid de fuentes */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {currentSources.map((source, index) => (
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

        {/* Paginación condicional */}
        {showPagination && filteredSources.length > sourcesPerPage && (
          <div className="mt-12 flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="w-10 h-10 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
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
                      onClick={() => setCurrentPage(pageNum)}
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
                  setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={currentPage === totalPages}
                className="w-10 h-10 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="w-10 h-10 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              Mostrando {indexOfFirstSource + 1} -{" "}
              {Math.min(indexOfLastSource, filteredSources.length)} de{" "}
              {filteredSources.length} fuentes
            </p>
          </div>
        )}

        {/* Estado vacío */}
        {filteredSources.length === 0 && (
          <div className="text-center py-16 bg-white/50 backdrop-blur-sm rounded-xl border border-blue-100">
            <Search className="w-16 h-16 mx-auto text-blue-300 mb-4" />
            <h3 className="text-2xl font-bold text-blue-900 mb-2">
              {isFavoritePage
                ? "No hay favoritos"
                : "No se encontraron resultados"}
            </h3>
            <p className="text-blue-600">
              {isFavoritePage
                ? "Agrega periódicos a tus favoritos para verlos aquí"
                : "Intenta con otros términos de búsqueda o cambia el filtro de idioma"}
            </p>
            {isFavoritePage && (
              <Link href="/sources" className="mt-4 inline-block">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  Explorar periódicos
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
