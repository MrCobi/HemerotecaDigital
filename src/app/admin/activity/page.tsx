"use client";

import ActivityTable from "./ActivityTable";
import { ActivityItem } from "./types";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// Quitamos la exportación de metadata ya que no es compatible con componentes cliente
// La metadata debe ir en un archivo separado como metadata.ts en la misma carpeta

export default function ActivityPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadActivities() {
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

        // Cargar datos de actividad
        const res = await fetch('/api/admin/activity');
        
        if (!res.ok) {
          throw new Error('Error al cargar actividad');
        }
        
        const data = await res.json();
        
        // Manejo de diferentes formatos de respuesta
        let activitiesArray = [];
        if (Array.isArray(data)) {
          // Si es un array directamente
          activitiesArray = data;
        } else if (data.activities && Array.isArray(data.activities)) {
          // Si tiene una propiedad activities que es un array
          activitiesArray = data.activities;
        } else if (data.id) {
          // Si es una sola actividad
          activitiesArray = [data];
        }
        
        setActivities(activitiesArray);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar actividad:", err);
        setError("Error al cargar datos de actividad");
        setLoading(false);
      }
    }

    loadActivities();
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="sm:flex sm:items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Actividad de Usuarios</h1>
      </div>

      <div className="bg-card shadow rounded-lg overflow-hidden mt-8">
        <ActivityTable activities={activities} />
      </div>
    </div>
  );
}
