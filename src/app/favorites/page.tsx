"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useCallback } from "react";
import { Source } from "@/src/interface/source";
import SourcesPage from "@/src/app/components/SourceList";
import { Button } from "@/src/app/components/ui/button";
import { Star, ExternalLink, Heart } from "lucide-react";
import Link from "next/link";

export default function FavoritesPage() {
  const { data: session } = useSession();
  const [favoriteSources, setFavoriteSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFavorites = useCallback(async () => {
    if (session?.user?.id) {
      try {
        setLoading(true);
        const favoritesResponse = await fetch("/api/favorites/list");
        const favoritesData = await favoritesResponse.json();
        const favoriteIds = favoritesData.favoriteIds;

        const detailsResponse = await fetch("/api/sources/details", {
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
  }, [session?.user?.id]); // Dependencia necesaria

  useEffect(() => {
    loadFavorites();
  }, [session, loadFavorites]); // Dependencia actualizada

  const handleFavoriteUpdate = (sourceId: string) => {
    setFavoriteSources((prev) =>
      prev.filter((source) => source.id !== sourceId)
    );
  };

  
  return (
    <div className="min-h-screen ">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
            <Heart className="h-8 w-8 mr-2 text-red-500" />
            Todos mis periódicos favoritos
          </h1>
          <Link href="/api/auth/dashboard">
            <Button variant="outline" className="flex items-center">
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
      ) : favoriteSources.length === 0 ? (
        <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
          <Star className="h-16 w-16 mx-auto text-blue-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No tienes periódicos favoritos
          </p>
          <Link href="/sources">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white transition-transform hover:scale-105">
              Explorar periódicos
            </Button>
          </Link>
        </div>
      ) : (
        <div>
          <SourcesPage
            sources={favoriteSources}
            showFilters={true}
            showPagination={true}
            isFavoritePage={true}
            onFavoriteUpdate={handleFavoriteUpdate}
          />
        </div>
      )}
    </div>
  );
}
