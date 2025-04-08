"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
import { TrendingUp, MessageSquare, Heart, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";
import { Popover, PopoverTrigger, PopoverContent } from "@/src/app/components/ui/popover";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { API_ROUTES } from "@/src/config/api-routes";

interface ApiTrend {
  title: string;
  url: string;
}

interface FavoriteTrend {
  sourceId: string;
  sourceName: string;
  count: number;
}

interface Trends {
  api: ApiTrend[];
  favorites: FavoriteTrend[];
  comments: FavoriteTrend[];
}

type Trend = ApiTrend | FavoriteTrend;

export default function TrendsSection() {
  const router = useRouter();
  const { data: _session, status } = useSession();
  const [trends, setTrends] = useState<Trends>({
    api: [],
    favorites: [],
    comments: [],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("api");
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [status, router]);

  const handleTrendClick = (trend: Trend, type: string) => {
    if (type === "favorite" || type === "comment") {
      const sourceTrend = trend as FavoriteTrend;
      router.push(`/sources/${sourceTrend.sourceId}`);
    } else if (type === "api") {
      const apiTrend = trend as ApiTrend;
      window.open(apiTrend.url, "_blank");
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      const fetchTrends = async () => {
        try {
          setIsLoading(true);
          const response = await fetch(API_ROUTES.trends.popular); // Usando la ruta centralizada
          const { data } = await response.json();
    
          setTrends({
            api: data.trends?.slice(0, 8) || [],
            favorites: data.favorites
              ? data.favorites
                  .map(
                    (item: {
                      _count: { sourceId: number };
                      sourceName: string;
                      sourceId: string;
                    }) => ({
                      sourceId: item.sourceId,
                      sourceName: item.sourceName,
                      count: item._count.sourceId,
                    })
                  )
                  .slice(0, 8)
              : [],
            comments: data.comments
              ? data.comments
                  .map(
                    (item: {
                      _count: { sourceId: number };
                      sourceName: string;
                      sourceId: string;
                    }) => ({
                      sourceId: item.sourceId,
                      sourceName: item.sourceName,
                      count: item._count.sourceId,
                    })
                  )
                  .slice(0, 8)
              : [],
          });
        } catch (error) {
          console.error("Error fetching trends:", error);
          // Provide empty trends on error
          setTrends({
            api: [],
            favorites: [],
            comments: []
          });
        } finally {
          setIsLoading(false);
        }
      };
      fetchTrends();
    }
  }, [status]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <Card className="border border-gray-200 dark:border-gray-700 shadow-sm">
      <CardHeader className="pb-1 sm:pb-2">
        <div className="flex flex-col space-y-1">
          <CardTitle className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex items-center">
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 mr-1.5 sm:mr-2 text-blue-600 dark:text-blue-400" />
            Tendencias
          </CardTitle>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full mt-1 sm:mt-2"
          >
            <TabsList className="hidden sm:grid w-full grid-cols-3 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden">
              <TabsTrigger
                value="api"
                className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-800/50 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 text-gray-700 dark:text-gray-300 py-1.5 sm:py-2 px-0.5 sm:px-1 text-xs sm:text-sm overflow-hidden"
              >
                Noticias
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-800/50 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 text-gray-700 dark:text-gray-300 py-1.5 sm:py-2 px-0.5 sm:px-1 text-xs sm:text-sm overflow-hidden"
              >
                Favoritos
              </TabsTrigger>
              <TabsTrigger
                value="comments"
                className="data-[state=active]:bg-blue-100 dark:data-[state=active]:bg-blue-800/50 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-300 text-gray-700 dark:text-gray-300 py-1.5 sm:py-2 px-0.5 sm:px-1 text-xs sm:text-sm overflow-hidden"
              >
                Comentarios
              </TabsTrigger>

              
            </TabsList>
            
            {/* Alternativa móvil - solo muestra la categoría activa con selector */}
            <div className="sm:hidden w-full mb-1">
              <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800/90 rounded-md p-1.5">
                <div className="flex items-center">
                  {activeTab === "api" && <TrendingUp className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 mr-1.5" />}
                  {activeTab === "favorites" && <Heart className="h-3.5 w-3.5 text-red-500 mr-1.5" />}
                  {activeTab === "comments" && <MessageSquare className="h-3.5 w-3.5 text-green-500 mr-1.5" />}
                  
                  <span className="font-medium text-xs text-gray-800 dark:text-gray-200">
                    {activeTab === "api" && "Noticias"}
                    {activeTab === "favorites" && "Favoritos"}
                    {activeTab === "comments" && "Comentarios"}
                  </span>
                </div>
                
                <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                      <ChevronDown className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-48 p-1 -mt-1 -mr-2 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                    <div className="space-y-1">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`w-full justify-start ${activeTab === "api" ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400" : ""}`}
                        onClick={() => {
                          setActiveTab("api");
                          setIsPopoverOpen(false);
                        }}
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Noticias
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`w-full justify-start ${activeTab === "favorites" ? "bg-red-50 dark:bg-red-900/20 text-red-500" : ""}`}
                        onClick={() => {
                          setActiveTab("favorites");
                          setIsPopoverOpen(false);
                        }}
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        Favoritos
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`w-full justify-start ${activeTab === "comments" ? "bg-green-50 dark:bg-green-900/20 text-green-500" : ""}`}
                        onClick={() => {
                          setActiveTab("comments");
                          setIsPopoverOpen(false);
                        }}
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Comentarios
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 sm:space-y-2 pt-1 sm:pt-2 pb-3 sm:pb-4 px-3 sm:px-4">
        {activeTab === "api" && (
          <>
            {trends.api.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                  <TrendingUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  No hay tendencias recientes
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Las noticias más populares aparecerán aquí
                </p>
              </div>
            ) : (
              trends.api.map((trend, i) => (
                <div
                  key={i}
                  className="py-2 px-2 sm:p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  onClick={() => handleTrendClick(trend, "api")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <span className="bg-blue-100 dark:bg-blue-900/30 p-1 rounded">
                        <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
                      </span>
                      <span className="text-xs sm:text-sm font-medium line-clamp-1 text-gray-800 dark:text-gray-200">
                        {trend.title}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-blue-600 dark:text-blue-400 text-xs px-1 sm:px-2 py-0 h-5"
                    >
                      Nuevo
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "favorites" && (
          <>
            {trends.favorites.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                  <Heart className="h-8 w-8 text-red-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Aún no hay favoritos
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Los usuarios aún no han marcado fuentes como favoritas
                </p>
              </div>
            ) : (
              trends.favorites.map((trend, i) => (
                <div
                  key={i}
                  className="py-2 px-2 sm:p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  onClick={() => handleTrendClick(trend, "favorite")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-red-500" />
                      <span className="text-xs sm:text-sm font-medium line-clamp-1 text-gray-800 dark:text-gray-200">
                        {trend.sourceName}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 dark:bg-blue-900/30 text-red-500 text-xs px-1 sm:px-2 py-0 h-5"
                    >
                      {trend.count} ♥
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {activeTab === "comments" && (
          <>
            {trends.comments.length === 0 ? (
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-4">
                  <MessageSquare className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                  Aún no hay comentarios
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Sé el primero en comentar en alguna fuente
                </p>
              </div>
            ) : (
              trends.comments.map((trend, i) => (
                <div
                  key={i}
                  className="py-2 px-2 sm:p-3 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors cursor-pointer"
                  onClick={() => handleTrendClick(trend, "comment")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                      <span className="text-xs sm:text-sm font-medium line-clamp-1 text-gray-800 dark:text-gray-200">
                        {trend.sourceName}
                      </span>
                    </div>
                    <Badge
                      variant="outline"
                      className="bg-blue-100 dark:bg-blue-900/30 text-green-500 text-xs px-1 sm:px-2 py-0 h-5"
                    >
                      {trend.count} 💬
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
