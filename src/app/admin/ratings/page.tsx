"use client";

import { useRouter } from "next/navigation";
import RatingsTable from "./RatingsTable";
import { useEffect, useState } from "react";

export default function RatingsPage() {
  const router = useRouter();
  const [ratings, setRatings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRatings = async () => {
    setLoading(true);
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

      // Cargar datos de valoraciones
      const res = await fetch('/api/admin/ratings');
      
      if (!res.ok) {
        throw new Error('Error al cargar valoraciones');
      }
      
      const data = await res.json();
      
      // Manejo de diferentes formatos de respuesta
      let ratingsArray = [];
      if (Array.isArray(data)) {
        // Si es un array directamente
        ratingsArray = data;
      } else if (data.ratings && Array.isArray(data.ratings)) {
        // Si tiene una propiedad ratings que es un array
        ratingsArray = data.ratings;
      } else if (data.id) {
        // Si es un solo rating
        ratingsArray = [data];
      }
      
      setRatings(ratingsArray);
      setError(null);
    } catch (err) {
      console.error("Error al cargar valoraciones:", err);
      setError("Error al cargar datos de valoraciones");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, [router, loadRatings]);

  // Esta función ya no es necesaria porque RatingsTable maneja las actualizaciones localmente
  // La dejamos como respaldo por si se necesita recargar toda la tabla en algún momento
  const handleRatingDeleted = () => {
    // Comentado para no recargar la página completa, ahora se actualiza localmente
    // loadRatings();
  };

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Gestión de Valoraciones</h1>
      </div>

      <div className="bg-card shadow rounded-lg overflow-hidden mt-8">
        <RatingsTable ratings={ratings} onRatingDeleted={handleRatingDeleted} />
      </div>
    </div>
  );
}
