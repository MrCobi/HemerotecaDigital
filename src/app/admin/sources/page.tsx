"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import SourcesTable from "./SourcesTable";
import { useEffect, useState } from "react";

export default function SourcesPage() {
  const router = useRouter();
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSources() {
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

        // Cargar datos de fuentes
        const res = await fetch('/api/admin/sources');
        
        if (!res.ok) {
          throw new Error('Error al cargar fuentes');
        }
        
        const data = await res.json();
        
        // Manejo de diferentes formatos de respuesta
        let sourcesArray = [];
        if (Array.isArray(data)) {
          // Si es un array directamente
          sourcesArray = data;
        } else if (data.sources && Array.isArray(data.sources)) {
          // Si tiene una propiedad sources que es un array
          sourcesArray = data.sources;
        } else if (data.id) {
          // Si es un solo source
          sourcesArray = [data];
        }
        
        setSources(sourcesArray);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar fuentes:", err);
        setError("Error al cargar datos de fuentes");
        setLoading(false);
      }
    }

    loadSources();
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
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <h1 className="text-3xl font-bold text-foreground">Gestión de Fuentes</h1>
        <Link 
          href="/admin/sources/create" 
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors duration-200"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Añadir Fuente
        </Link>
      </div>

      <div className="bg-card shadow rounded-lg overflow-hidden mt-8">
        <SourcesTable sources={sources} />
      </div>
    </div>
  );
}
