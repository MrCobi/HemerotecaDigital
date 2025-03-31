// src/app/home/page.tsx
"use client";

import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import {
  Loader2,
  Search,
  Clock,
  Calendar,
  BookOpen,
  TrendingUp,
  History,
  Star,
  Filter,
  ArrowRight,
  Heart,
  MessageSquare,
  User2,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Badge } from "@/src/app/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/src/app/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
import { Avatar } from "@/src/app/components/ui/avatar";
import Image from "next/image";
import Link from "next/link";
import { Article } from "@/src/interface/article";
import { fetchArticulosDestacados } from "@/lib/api";
import { API_ROUTES } from "@/src/config/api-routes";
import { CldImage } from 'next-cloudinary';
import { useAnimationSettings, useConditionalAnimation, useConditionalTransition } from "../hooks/useAnimationSettings";
import { Popover, PopoverTrigger, PopoverContent } from "@/src/app/components/ui/popover";

interface Activity {
  id: string;
  type:
    | "favorite_added"
    | "favorite_removed"
    | "comment"
    | "rating_added"
    | "rating_removed"
    | "follow"
    | "unfollow"
    | "comment_reply"
    | "comment_deleted"
    | "favorite";
  sourceName: string | null;
  targetName: string | null;
  targetId: string | null;
  targetType: string | null;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    email: string | null;
  };
}

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

const decorativeElements = [
  { left: "10%", top: "20%", width: "8px", height: "8px", duration: "2s" },
  { left: "20%", top: "40%", width: "12px", height: "12px", duration: "2.5s" },
  { left: "30%", top: "60%", width: "6px", height: "6px", duration: "3s" },
  { left: "40%", top: "25%", width: "10px", height: "10px", duration: "2.2s" },
  { left: "50%", top: "45%", width: "7px", height: "7px", duration: "2.8s" },
  { left: "60%", top: "65%", width: "9px", height: "9px", duration: "2.4s" },
  { left: "70%", top: "30%", width: "11px", height: "11px", duration: "2.6s" },
  { left: "80%", top: "50%", width: "8px", height: "8px", duration: "2.3s" },
  { left: "90%", top: "70%", width: "10px", height: "10px", duration: "2.7s" },
  { left: "15%", top: "35%", width: "6px", height: "6px", duration: "2.9s" },
];

const categoryMappings = {
  "general": {
    spanish: "General",
    lightImage: "/images/categories/general-light.webp",
    darkImage: "/images/categories/general-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1495020689067-958852a7765e?q=80&w=2069&auto=format&fit=crop",
    color: "from-gray-600 to-gray-800"
  },
  "business": {
    spanish: "Negocios",
    lightImage: "/images/categories/business-light.webp",
    darkImage: "/images/categories/business-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=2069&auto=format&fit=crop",
    color: "from-emerald-600 to-green-600"
  },
  "technology": {
    spanish: "Tecnología",
    lightImage: "/images/categories/technology-light.webp",
    darkImage: "/images/categories/technology-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1488229297570-58520851e868?q=80&w=2069&auto=format&fit=crop",
    color: "from-blue-600 to-indigo-600"
  },
  "sports": {
    spanish: "Deportes",
    lightImage: "/images/categories/sports-light.webp",
    darkImage: "/images/categories/sports-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=2070&auto=format&fit=crop",
    color: "from-yellow-600 to-amber-600"
  },
  "entertainment": {
    spanish: "Entretenimiento",
    lightImage: "/images/categories/entertainment-light.webp",
    darkImage: "/images/categories/entertainment-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1603739903239-8b6e64c3b185?q=80&w=2071&auto=format&fit=crop",
    color: "from-pink-600 to-rose-600"
  },
  "health": {
    spanish: "Salud",
    lightImage: "/images/categories/health-light.webp",
    darkImage: "/images/categories/health-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?q=80&w=2070&auto=format&fit=crop",
    color: "from-purple-600 to-pink-600"
  },
  "science": {
    spanish: "Ciencia",
    lightImage: "/images/categories/science-light.webp",
    darkImage: "/images/categories/science-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?q=80&w=2070&auto=format&fit=crop",
    color: "from-green-600 to-teal-600"
  },
  "politics": {
    spanish: "Política",
    lightImage: "/images/categories/politics-light.webp",
    darkImage: "/images/categories/politics-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1575320181282-9afab399332c?q=80&w=2070&auto=format&fit=crop",
    color: "from-red-600 to-orange-600"
  },
  "economy": {
    spanish: "Economía",
    lightImage: "/images/categories/economy-light.webp",
    darkImage: "/images/categories/economy-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?q=80&w=2070&auto=format&fit=crop",
    color: "from-emerald-600 to-green-600"
  },
  "culture": {
    spanish: "Cultura",
    lightImage: "/images/categories/culture-light.webp",
    darkImage: "/images/categories/culture-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1460572894071-bde5697f7197?q=80&w=2069&auto=format&fit=crop",
    color: "from-cyan-600 to-blue-600"
  },
  "social": {
    spanish: "Social",
    lightImage: "/images/categories/social-light.webp",
    darkImage: "/images/categories/social-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1511632765486-a01980e01a18?q=80&w=2070&auto=format&fit=crop",
    color: "from-violet-600 to-purple-600"
  },
  "education": {
    spanish: "Educación",
    lightImage: "/images/categories/education-light.webp",
    darkImage: "/images/categories/education-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop",
    color: "from-amber-600 to-orange-600"
  },
  "environment": {
    spanish: "Medio Ambiente",
    lightImage: "/images/categories/environment-light.webp",
    darkImage: "/images/categories/environment-dark.webp",
    fallbackImage: "https://images.unsplash.com/photo-1623493308303-53f46fd1ed5c?q=80&w=2070&auto=format&fit=crop",
    color: "from-lime-600 to-green-600"
  }
};

const getSpanishCategory = (englishCategory: string): string => {
  return categoryMappings[englishCategory.toLowerCase() as keyof typeof categoryMappings]?.spanish || englishCategory;
};

const getCategoryGradient = (englishCategory: string): string => {
  return categoryMappings[englishCategory.toLowerCase() as keyof typeof categoryMappings]?.color || "from-blue-600 to-indigo-600";
};

const getCategoryImage = (englishCategory: string, _isDarkMode: boolean): string => {
  const mapping = categoryMappings[englishCategory.toLowerCase() as keyof typeof categoryMappings];
  if (!mapping) {
    return `https://source.unsplash.com/random/300x200?${encodeURIComponent(englishCategory)}`;
  }
  
  // Usar siempre las imágenes fallback hasta que tengamos las imágenes locales
  return mapping.fallbackImage || `https://source.unsplash.com/random/300x200?${encodeURIComponent(englishCategory)}`;
};

const StatItem = ({
  icon,
  label,
  value,
  isVisible,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  isVisible: boolean;
}) => {
  const count = useCounter(value, 2000);

  return (
    <Card className="overflow-hidden border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-md">
      <CardContent className="p-3 sm:p-4 md:p-6 flex items-center space-x-3 sm:space-x-4">
        <div className="rounded-full p-2 sm:p-3 bg-blue-100/50 dark:bg-blue-900/30">
          {icon}
        </div>
        <div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg sm:text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100">
            {isVisible ? count : 0}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

const useCounter = (end: number, duration: number = 2000) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      setCount(Math.floor(progress * end));
      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
};

const TrendsSection = () => {
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
          const response = await fetch(API_ROUTES.trends.popular); // Usando la ruta centralizada
          const { data } = await response.json();
    
          setTrends({
            api: data.trends.slice(0, 8),
            favorites: data.favorites
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
              .slice(0, 8),
            comments: data.comments
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
              .slice(0, 8),
          });
        } catch (error) {
          console.error("Error fetching trends:", error);
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
};

// Hook no utilizado actualmente - se mantiene por si se necesita en el futuro
// const useHorizontalScroll = () => {
//   const scrollRef = useRef<HTMLDivElement>(null);
//   const [isDragging, setIsDragging] = useState(false);
//   const [startX, setStartX] = useState(0);
//   const [scrollLeft, setScrollLeft] = useState(0);
//   const [momentum, setMomentum] = useState({ x: 0, timestamp: 0 });
//   const animationRef = useRef<number | null>(null);
//   const velocityRef = useRef(0);
//   const lastTimeRef = useRef(0);
//   const lastPositionRef = useRef(0);

//   // Función para aplicar inercia al scroll
//   const applyMomentum = () => {
//     if (!scrollRef.current || Math.abs(velocityRef.current) < 0.5) {
//       animationRef.current = null;
//       return;
//     }

//     // Aplicar fricción para desacelerar gradualmente
//     velocityRef.current *= 0.95;

//     // Aplicar el desplazamiento basado en la velocidad actual
//     if (scrollRef.current) {
//       scrollRef.current.scrollLeft -= velocityRef.current;
//     }

//     // Continuar la animación
//     animationRef.current = requestAnimationFrame(applyMomentum);
//   };

//   const onMouseDown = (e: React.MouseEvent) => {
//     if (!scrollRef.current) return;

//     // Detener cualquier animación de inercia en curso
//     if (animationRef.current) {
//       cancelAnimationFrame(animationRef.current);
//       animationRef.current = null;
//     }

//     setIsDragging(true);
//     setStartX(e.clientX);
//     setScrollLeft(scrollRef.current.scrollLeft);
//     lastTimeRef.current = Date.now();
//     lastPositionRef.current = e.clientX;
//     velocityRef.current = 0;

//     // Cambiar el cursor durante el arrastre
//     document.body.style.cursor = "grabbing";
//   };

//   const onMouseMove = (e: React.MouseEvent) => {
//     if (!isDragging || !scrollRef.current) return;
//     e.preventDefault();

//     // Calcular la velocidad del movimiento
//     const now = Date.now();
//     const dt = now - lastTimeRef.current;
//     const dx = e.clientX - lastPositionRef.current;

//     if (dt > 0) {
//       // Suavizar la velocidad con un factor de amortiguación
//       velocityRef.current = 0.8 * velocityRef.current + 0.2 * (dx / dt) * 16;
//     }

//     lastTimeRef.current = now;
//     lastPositionRef.current = e.clientX;

//     // Aplicar un factor de suavizado para el desplazamiento
//     const walk = (e.clientX - startX) * 1.2; // Factor reducido para mayor suavidad
//     scrollRef.current.scrollLeft = scrollLeft - walk;
//   };

//   const onMouseUp = () => {
//     setIsDragging(false);
//     document.body.style.cursor = "";

//     // Iniciar la animación de inercia cuando se suelta el mouse
//     if (Math.abs(velocityRef.current) > 0.5) {
//       animationRef.current = requestAnimationFrame(applyMomentum);
//     }
//   };

//   const onTouchStart = (e: React.TouchEvent) => {
//     if (!scrollRef.current) return;

//     if (animationRef.current) {
//       cancelAnimationFrame(animationRef.current);
//       animationRef.current = null;
//     }

//     setIsDragging(true);
//     setStartX(e.touches[0].clientX);
//     setScrollLeft(scrollRef.current.scrollLeft);
//     lastTimeRef.current = Date.now();
//     lastPositionRef.current = e.touches[0].clientX;
//     velocityRef.current = 0;
//   };

//   const onTouchMove = (e: React.TouchEvent) => {
//     if (!isDragging || !scrollRef.current) return;

//     const now = Date.now();
//     const dt = now - lastTimeRef.current;
//     const dx = e.touches[0].clientX - lastPositionRef.current;

//     if (dt > 0) {
//       velocityRef.current = 0.8 * velocityRef.current + 0.2 * (dx / dt) * 16;
//     }

//     lastTimeRef.current = now;
//     lastPositionRef.current = e.touches[0].clientX;

//     const walk = (e.touches[0].clientX - startX) * 1.2;
//     scrollRef.current.scrollLeft = scrollLeft - walk;
//   };

//   const onTouchEnd = () => {
//     setIsDragging(false);

//     if (Math.abs(velocityRef.current) > 0.5) {
//       animationRef.current = requestAnimationFrame(applyMomentum);
//     }
//   };

//   // Limpiar animaciones al desmontar
//   useEffect(() => {
//     return () => {
//       if (animationRef.current) {
//         cancelAnimationFrame(animationRef.current);
//       }
//     };
//   }, []);

//   return {
//     scrollRef,
//     onMouseDown,
//     onMouseUp,
//     onMouseMove,
//     onTouchStart,
//     onTouchMove,
//     onTouchEnd,
//     isDragging,
//   };
// };

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState({
    stats: false,
    featured: false,
    collections: false,
    recent: false,
  });
  const [userStats, setUserStats] = useState({
    favoriteCount: 0,
    activityCount: 0,
    totalInteractions: 0,
    activeDays: 0,
  });
  const [followingActivity, setFollowingActivity] = useState<Activity[]>([]);
  const [isLoadingFollowingActivity, setIsLoadingFollowingActivity] =
    useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalActivities, setTotalActivities] = useState<number>(0);
  
  // Variables que se necesitan mantener
  const itemsPerPage = 5;
  const [categories, setCategories] = useState<string[]>([]);
  const [featuredArticles, setFeaturedArticles] = useState<Article[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [windowWidth, setWindowWidth] = useState(0);
  
  // Obtener configuración de animaciones para aplicar a los componentes de framer-motion
  const _animationsEnabled = useAnimationSettings();
  
  // Variantes para animaciones condicionales
  const fadeInVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  const noAnimationVariants = {
    hidden: { opacity: 1, y: 0 },
    visible: { opacity: 1, y: 0 }
  };
  
  const animationVariants = useConditionalAnimation(fadeInVariants, noAnimationVariants);
  const animationTransition = useConditionalTransition(0.5);

  const horizontalScroll = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // Función para desplazar a la izquierda (una tarjeta)
  const scrollLeftHandler = () => {
    if (horizontalScroll.current) {
      // El ancho de cada tarjeta (280px) + el gap entre tarjetas (16px)
      const itemWidth = 280 + 16; // 16px es el valor aproximado del gap-4 en Tailwind
      const scrollAmount = itemWidth; // Avanzar exactamente 1 tarjeta
      const currentScroll = horizontalScroll.current.scrollLeft;
      animateScroll(currentScroll, currentScroll - scrollAmount);
    }
  };

  // Función para desplazar a la derecha (una tarjeta)
  const scrollRightHandler = () => {
    if (horizontalScroll.current) {
      // El ancho de cada tarjeta (280px) + el gap entre tarjetas (16px)
      const itemWidth = 280 + 16; // 16px es el valor aproximado del gap-4 en Tailwind
      const scrollAmount = itemWidth; // Avanzar exactamente 1 tarjeta
      const currentScroll = horizontalScroll.current.scrollLeft;
      animateScroll(currentScroll, currentScroll + scrollAmount);
    }
  };

  // Función de animación para el desplazamiento suave
  const animateScroll = (from: number, to: number) => {
    const duration = 400; // duración en milisegundos
    const start = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = easeInOutCubic(progress);
      const currentPosition = from + (to - from) * easeProgress;
      
      if (horizontalScroll.current) {
        horizontalScroll.current.scrollLeft = currentPosition;
      }
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  };

  // Función de easing para un desplazamiento más natural
  const easeInOutCubic = (t: number): number => {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  // Handlers para arrastrar en ordenador
  const handleMouseDown = (e: React.MouseEvent) => {
    if (horizontalScroll.current) {
      setIsDragging(true);
      setStartX(e.pageX - horizontalScroll.current.offsetLeft);
      setScrollLeft(horizontalScroll.current.scrollLeft);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    
    if (horizontalScroll.current) {
      const x = e.pageX - horizontalScroll.current.offsetLeft;
      const walk = (x - startX) * 1.5; // Velocidad de desplazamiento
      horizontalScroll.current.scrollLeft = scrollLeft - walk;
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const loadStats = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(API_ROUTES.users.stats);
          const data = await response.json();
          setUserStats({
            favoriteCount: data.favoriteCount,
            activityCount: data.activityCount,
            totalInteractions: data.totalInteractions,
            activeDays: data.activeDays,
          });
        } catch (error) {
          console.error("Error loading stats:", error);
        }
      }
    };
    loadStats();
  }, [session]);

  useEffect(() => {
    const loadFeaturedArticles = async () => {
      try {
        const articles = await fetchArticulosDestacados();

        // Seleccionar 3 aleatorios
        const randomArticles = articles
          .sort(() => 0.5 - Math.random())
          .slice(0, 3);

        setFeaturedArticles(randomArticles);
      } catch (error) {
        console.error("Error loading featured articles:", error);
      }
    };

    loadFeaturedArticles();
  }, []);

  useEffect(() => {
    const loadFollowingActivity = async () => {
      if (session?.user?.id) {
        setIsLoadingFollowingActivity(true);
        try {
          const response = await fetch(
            API_ROUTES.activities.following(currentPage, itemsPerPage)
          );
          if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data.data)) {
              setFollowingActivity(data.data);
              setTotalActivities(data.total);
            }
          }
        } catch (error) {
          console.error("Error loading following activity:", error);
        } finally {
          setIsLoadingFollowingActivity(false);
        }
      }
    };
    loadFollowingActivity();
  }, [session, currentPage]);

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const scrollPosition = window.scrollY + window.innerHeight;

      const statsSection = document.getElementById("stats-section");
      const featuredSection = document.getElementById("featured-section");
      const collectionsSection = document.getElementById("collections-section");
      const recentSection = document.getElementById("recent-section");

      if (statsSection && scrollPosition > statsSection.offsetTop + 100) {
        setIsVisible((prev) => ({ ...prev, stats: true }));
      }
      if (featuredSection && scrollPosition > featuredSection.offsetTop + 100) {
        setIsVisible((prev) => ({ ...prev, featured: true }));
      }
      if (
        collectionsSection &&
        scrollPosition > collectionsSection.offsetTop + 100
      ) {
        setIsVisible((prev) => ({ ...prev, collections: true }));
      }
      if (recentSection && scrollPosition > recentSection.offsetTop + 100) {
        setIsVisible((prev) => ({ ...prev, recent: true }));
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (session === null && mounted) {
      router.push("/");
    }
  }, [session, mounted, router]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(API_ROUTES.categories.list);
        const data = await response.json();
  
        if (Array.isArray(data)) {
          setCategories(data);
        } else {
          console.error("Formato de categorías inválido:", data);
          setCategories([]);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
        setCategories([]);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    // Solo ejecutar en el cliente
    if (typeof window !== 'undefined') {
      // Establecer el ancho inicial
      setWindowWidth(window.innerWidth);
      
      // Función para actualizar el ancho cuando cambia
      const handleResize = () => {
        setWindowWidth(window.innerWidth);
      };
      
      // Agregar listener
      window.addEventListener('resize', handleResize);
      
      // Limpiar listener
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const PaginationControls = () => {
    // Limitar a un máximo de 10 páginas
    const maxPages = 10;
    const calculatedTotalPages = Math.ceil(totalActivities / itemsPerPage) || 1;
    const totalPages = Math.min(calculatedTotalPages, maxPages);

    return (
      <div className="flex justify-center items-center mt-4 w-full">
        <div className="flex w-full max-w-xs rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <button
            onClick={() => !isLoadingFollowingActivity && setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1 || isLoadingFollowingActivity}
            className={`flex justify-center items-center py-2 px-3 w-1/4 ${
              currentPage === 1 || isLoadingFollowingActivity
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            } transition-colors`}
          >
            <span className="text-lg font-bold">&lt;</span>
          </button>
          
          <div className="flex justify-center items-center py-2 px-3 flex-1 bg-gray-50 dark:bg-gray-800 text-xs sm:text-sm text-center font-medium text-gray-700 dark:text-gray-300">
            {isLoadingFollowingActivity ? (
              <span className="flex items-center">
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin mr-1.5" />
                Cargando...
              </span>
            ) : (
              <span>Página {currentPage} de {totalPages}</span>
            )}
          </div>
          
          <button
            onClick={() => !isLoadingFollowingActivity && setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages || isLoadingFollowingActivity}
            className={`flex justify-center items-center py-2 px-3 w-1/4 ${
              currentPage === totalPages || isLoadingFollowingActivity
                ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "bg-blue-600 dark:bg-blue-700 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
            } transition-colors`}
          >
            <span className="text-lg font-bold">&gt;</span>
          </button>
        </div>
      </div>
    );
  };

  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Detecta el modo oscuro
    setIsDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    // Escucha cambios en el modo de color
    const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsDarkMode(e.matches);
    };
    
    darkModeMediaQuery.addEventListener('change', handleChange);
    return () => {
      darkModeMediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  if (!mounted || session === null) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-blue-600 to-indigo-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-white mx-auto" />
          <p className="text-blue-100 font-medium">
            Cargando tu experiencia personalizada...
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
      <style jsx global>{`
        /* Ocultar scrollbar para Chrome, Safari y Opera */
        .scrollbar-none::-webkit-scrollbar {
          display: none;
        }
        
        /* Ocultar scrollbar para IE, Edge y Firefox */
        .scrollbar-none {
          -ms-overflow-style: none;  /* IE y Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
      <section
        id="hero-section"
        className="relative overflow-x-hidden bg-gradient-to-br from-blue-600 to-indigo-900 dark:from-gray-800 dark:to-gray-900 text-white"
      >
        <div className="absolute inset-0 z-0 overflow-hidden">
          {decorativeElements.map((element, index) => (
            <div
              key={index}
              className="absolute rounded-full opacity-50"
              style={{
                left: element.left,
                top: element.top,
                width: element.width,
                height: element.height,
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                borderRadius: "50%"
              }}
            />
          ))}
          <div className="absolute top-0 left-0 w-1/4 h-1/4 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-1/4 h-1/4 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative h-full max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8 py-12 xs:py-16 sm:py-20 lg:py-24 flex flex-col justify-center">
          <motion.div
            initial={animationVariants.hidden}
            animate={animationVariants.visible}
            transition={animationTransition}
            className="max-w-3xl"
          >
            <h1 className="text-2xl xs:text-3xl sm:text-3xl font-bold text-white dark:text-white mb-3 sm:mb-4 leading-tight">
              Bienvenido, {session?.user?.name || "Investigador"}
            </h1>
            <p className="text-sm xs:text-base text-blue-100 dark:text-gray-200 mb-5 sm:mb-6 max-w-2xl">
              Continúa explorando nuestra colección de documentos y descubre
              nuevas perspectivas de las noticias.
            </p>

            <div className="relative max-w-2xl z-20">
              <div className="flex relative w-full">
                <Input
                  type="text"
                  placeholder={windowWidth < 640 ? "Buscar..." : "Buscar artículos..."}
                  className="flex-1 bg-white/10 backdrop-blur-sm border-white/20 text-white dark:text-white placeholder:text-blue-200 dark:placeholder:text-gray-300 focus-visible:ring-white/30 focus-visible:border-white/30 pr-12 py-4 sm:py-5 text-sm sm:text-base" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && searchQuery.trim()) {
                      router.push(`/Articulos?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                />
                <Button 
                  className="ml-2 bg-white dark:bg-gray-200 text-blue-600 dark:text-blue-800 hover:bg-blue-50 dark:hover:bg-gray-300 absolute right-1 top-1/2 -translate-y-1/2 z-20"
                  onClick={() => {
                    if (searchQuery.trim()) {
                      router.push(`/Articulos?q=${encodeURIComponent(searchQuery.trim())}`);
                    }
                  }}
                >
                  <Search className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
              <div className="flex items-center mt-2 text-xs sm:text-sm text-blue-200 dark:text-gray-300 relative z-10">
                <Link href="/Articulos" passHref legacyBehavior>
                  <Button
                    variant="link"
                    className="text-blue-200 dark:text-gray-300 hover:text-white dark:hover:text-white p-0 h-auto"
                    asChild
                  >
                    <a className="flex items-center text-blue-100 hover:text-white transition-colors">
                      <Filter className="h-3 w-3 mr-1" /> Búsqueda avanzada
                    </a>
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 1440 120"
            className="w-full h-auto text-white dark:text-gray-900"
          >
            <path
              fill="currentColor"
              d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,120L1360,120C1280,120,1120,120,960,120C800,120,640,120,480,120C320,120,160,120,80,120L0,120Z"
            ></path>
          </svg>
        </div>
      </section>

      <section id="stats-section" className="py-8 sm:py-12 lg:py-16 relative z-10">
        <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8">
          <motion.div
            initial={animationVariants.hidden}
            animate={animationVariants.visible}
            transition={animationTransition}
            className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6"
          >
            {[
              {
                icon: <BookOpen className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />,
                label: "Interacciones",
                value: userStats.totalInteractions,
              },
              {
                icon: <Heart className="h-5 w-5 text-red-500 fill-red-500" />,
                label: "Favoritos",
                value: userStats.favoriteCount,
              },
              {
                icon: <History className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />,
                label: "Actividad Reciente",
                value: userStats.activityCount,
              },
              {
                icon: <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-purple-600" />,
                label: "Días Activo",
                value: userStats.activeDays,
              },
            ].map((stat, i) => (
              <StatItem
                key={i}
                icon={stat.icon}
                label={stat.label}
                value={stat.value}
                isVisible={isVisible.stats}
              />
            ))}
          </motion.div>
        </div>
      </section>

      <section
        id="featured-section"
        className="py-12 sm:py-16 bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-900/30 dark:to-indigo-900/30 relative"
      >
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-indigo-500/5 dark:bg-indigo-400/5 rounded-full blur-3xl"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Artículos Destacados
              </h2>
              <p className="text-sm xs:text-base text-gray-600 dark:text-gray-300">
                Selección especial de documentos históricos relevantes
              </p>
            </div>
            <Button
              variant="outline"
              className="mt-4 md:mt-0 border-blue-500 text-blue-600 hover:bg-blue-100 dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-800/40"
              onClick={() => router.push("/Articulos")}
            >
              Ver todos <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <motion.div
            initial={animationVariants.hidden}
            animate={animationVariants.visible}
            transition={animationTransition}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {featuredArticles.map((article) => (
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
                        className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 dark:text-gray-500"
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
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
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
                        <span>
                          {new Date(article.publishedAt).toLocaleDateString(
                            "es-ES",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )}
                        </span>
                      </time>
                    </div>
                    <Link
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block px-4 py-2 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-800/60 text-blue-700 dark:text-blue-300 rounded-md text-xs sm:text-sm transition-colors"
                    >
                      Leer artículo
                    </Link>
                  </footer>
                </div>
              </article>
            ))}
          </motion.div>
        </div>
      </section>

      <section id="collections-section" className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h2 className="text-xl xs:text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">
                Categorías
              </h2>
              <p className="text-sm xs:text-base text-gray-600 dark:text-gray-300">
                Explora documentos históricos por categoría temática
              </p>
            </div>
          </div>

          <motion.div
            initial={animationVariants.hidden}
            animate={animationVariants.visible}
            transition={animationTransition}
            className="relative"
          >
            <div
              ref={horizontalScroll}
              className="flex gap-4 overflow-x-auto scrollbar-none pb-6 snap-x snap-mandatory cursor-grab active:cursor-grabbing select-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
            >
              {categories.map((category, i) => {
                const englishCategory = category.toLowerCase();
                const spanishCategory = getSpanishCategory(englishCategory);
                const gradientClass = getCategoryGradient(englishCategory);
                const resolvedBgImage = getCategoryImage(englishCategory, isDarkMode);
                
                return (
                <motion.div
                  key={i}
                  initial={animationVariants.hidden}
                  animate={animationVariants.visible}
                  transition={animationTransition}
                  className="snap-start flex-shrink-0 relative"
                  style={{ width: "280px", minWidth: "180px" }}
                >
                  <div className="group relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 h-32 xs:h-36 sm:h-40 w-full">
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                      style={{
                        backgroundImage: `url(${resolvedBgImage})`,
                      }}
                    />
                    <div className={`absolute inset-0 bg-gradient-to-t ${gradientClass} opacity-70`} />
                    <div className="absolute bottom-0 left-0 right-0 p-3 xs:p-4 sm:p-5 select-none">
                      <h3 className="text-base xs:text-lg sm:text-xl font-bold text-white">
                        {spanishCategory}
                      </h3>
                      <div className="flex items-center mt-1 xs:mt-2 text-xs sm:text-sm text-blue-50">
                        <Link
                          href={`/categories/${encodeURIComponent(englishCategory)}`}
                          className="flex items-center text-blue-100 hover:text-white transition-colors"
                        >
                          Explorar{" "}
                          <ArrowRight className="ml-1 w-3 h-3 xs:w-4 xs:h-4 inline-block text-white" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )})}
            </div>
            
            {/* Controles de navegación */}
            <div className="flex justify-center mt-4 space-x-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 xs:h-8 xs:w-8 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg text-gray-800 dark:text-gray-200 flex items-center justify-center"
                onClick={scrollLeftHandler}
              >
                <span className="text-lg font-bold">&lt;</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-7 w-7 xs:h-8 xs:w-8 rounded-full bg-white dark:bg-gray-800 shadow-md hover:shadow-lg text-gray-800 dark:text-gray-200 flex items-center justify-center"
                onClick={scrollRightHandler}
              >
                <span className="text-lg font-bold">&gt;</span>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="recent-section" className="py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-2 xs:px-3 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8">
            <motion.div
              initial={animationVariants.hidden}
              animate={animationVariants.visible}
              transition={animationTransition}
            >
              <Card className="border-blue-100 dark:border-blue-900/30 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base xs:text-lg sm:text-xl font-bold text-gray-800 dark:text-white flex flex-wrap items-center">
                    <Clock className="h-4 w-4 xs:h-5 xs:w-5 mr-1.5 sm:mr-2 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="leading-tight">Actividad Reciente de Usuarios Seguidos</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="min-h-[400px] flex flex-col">
                    {isLoadingFollowingActivity ? (
                      <div className="text-center py-12 flex flex-col items-center justify-center h-full min-h-[320px]">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                        <p className="text-gray-600 dark:text-gray-400 mt-3">
                          Cargando actividades...
                        </p>
                      </div>
                    ) : followingActivity.length === 0 ? (
                      <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl h-full min-h-[320px] flex flex-col items-center justify-center">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-800/30 mb-4">
                          <Clock className="h-8 w-8 text-blue-500 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-2">
                          Sin actividad reciente
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-4">
                          Los usuarios que sigues no han realizado actividades
                          recientemente.
                        </p>
                        <Button
                          variant="outline"
                          className="border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40"
                          onClick={() => router.push("/explore")}
                        >
                          Explorar usuarios
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3 min-h-[320px]">
                        {followingActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg shadow-sm transition-all duration-300 hover:shadow-md hover:bg-blue-100 dark:hover:bg-blue-800/30"
                          >
                            <div className="flex items-center w-full">
                              <Avatar className="h-10 w-10 flex-shrink-0 border-2 border-white dark:border-gray-800 shadow-sm mr-3 sm:mr-4">
                                {activity.user.image?.startsWith("https://") ? (
                                  <CldImage
                                    src={activity.user.image}
                                    alt={activity.user.name || "Usuario"}
                                    width={40}
                                    height={40}
                                    className="h-full w-full rounded-full object-cover"
                                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = "/images/AvatarPredeterminado.webp";
                                    }}
                                  />
                                ) : (
                                  <Image
                                    src={activity.user.image || "/images/AvatarPredeterminado.webp"}
                                    alt={activity.user.name || "Usuario"}
                                    width={40}
                                    height={40}
                                    className="h-full w-full rounded-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.src = "/images/AvatarPredeterminado.webp";
                                    }}
                                  />
                                )}
                              </Avatar>
                              
                              <div className="flex flex-grow items-center justify-between flex-wrap sm:flex-nowrap gap-2">
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <span className="font-medium text-sm text-gray-800 dark:text-white">
                                    {activity.user.username}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="inline-flex items-center">
                                      {(() => {
                                        switch (activity.type) {
                                          case "favorite_added":
                                          case "favorite":
                                            return <Heart className="h-3.5 w-3.5 text-red-500 fill-red-500" />;
                                          case "favorite_removed":
                                            return <Heart className="h-3.5 w-3.5 text-red-500" />;
                                          case "comment":
                                          case "comment_reply":
                                            return <MessageSquare className="h-3.5 w-3.5 text-green-500" />;
                                          case "rating_added":
                                            return <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />;
                                          case "rating_removed":
                                            return <Star className="h-3.5 w-3.5 text-purple-500" />;
                                          case "follow":
                                            return <User2 className="h-3.5 w-3.5 text-blue-500" />;
                                          case "unfollow":
                                            return <User2 className="h-3.5 w-3.5 text-red-500" />;
                                          case "comment_deleted":
                                            return <MessageSquare className="h-3.5 w-3.5 text-red-500" />;
                                          default:
                                            return null;
                                        }
                                      })()}
                                    </span>
                                    <span className="text-xs text-gray-600 dark:text-gray-400">
                                      {(() => {
                                        switch (activity.type) {
                                          case "favorite_added":
                                          case "favorite":
                                            return "agregó favorito";
                                          case "favorite_removed":
                                            return "eliminó favorito";
                                          case "comment":
                                            return "comentó";
                                          case "rating_added":
                                            return "calificó";
                                          case "rating_removed":
                                            return "quitó calificación";
                                          case "follow":
                                            return "siguió a";
                                          case "unfollow":
                                            return "dejó de seguir";
                                          case "comment_reply":
                                            return "respondió";
                                          case "comment_deleted":
                                            return "eliminó comentario";
                                          default:
                                            return "";
                                        }
                                      })()}
                                    </span>
                                  </div>
                                  <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                                    {activity.sourceName || activity.targetName || ""}
                                  </span>
                                </div>
                                
                                <p className="text-xs text-gray-500 dark:text-gray-400 sm:ml-auto">
                                  {new Date(activity.createdAt).toLocaleString(
                                    "es-ES",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {followingActivity.length > 0 && <PaginationControls />}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={animationVariants.hidden}
              animate={animationVariants.visible}
              transition={animationTransition}
            >
              <TrendsSection />
            </motion.div>
          </div>
        </div>
      </section>
    </main>
  );
}
