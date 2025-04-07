"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FavoritesTable from "./FavoritesTable";
import { Favorite } from "./types";

export default function FavoritesPage() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadFavorites() {
      try {
        // Verificar sesión
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (!sessionData || !sessionData.user) {
          router.push("/api/auth/signin");
          return;
        }
        
        if (sessionData.user.role !== "admin") {
          router.push("/acceso-denegado");
          return;
        }

        // Cargar datos de favoritos desde la API
        const res = await fetch('/api/admin/favorites');
        
        if (!res.ok) {
          throw new Error('Error al cargar favoritos');
        }
        
        const data = await res.json();
        
        // Añadir un ID único a cada favorito para la tabla
        const favoritesWithIds = data.map((favorite: Omit<Favorite, 'id'>) => ({
          ...favorite,
          id: `fav_${favorite.userId}_${favorite.sourceId}`,
          // Asegurar que las fechas sean objetos Date
          createdAt: new Date(favorite.createdAt),
          updatedAt: new Date(favorite.updatedAt)
        }));
        
        setFavorites(favoritesWithIds);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar favoritos:", err);
        setError("Error al cargar datos de favoritos");
        setLoading(false);
      }
    }

    loadFavorites();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Favoritos</h1>
        <p className="text-muted-foreground">
          Gestiona los favoritos guardados por los usuarios.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow">
        <FavoritesTable favorites={favorites} />
      </div>
    </div>
  );
}
