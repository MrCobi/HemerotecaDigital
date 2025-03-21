"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import CommentsTable from "./CommentsTable";
import { useEffect, useState } from "react";

export default function CommentsPage() {
  const router = useRouter();
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadComments() {
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

        // Cargar datos de comentarios
        const res = await fetch('/api/admin/comments');
        
        if (!res.ok) {
          throw new Error('Error al cargar comentarios');
        }
        
        const data = await res.json();
        
        // Manejo de diferentes formatos de respuesta
        let commentsArray = [];
        if (Array.isArray(data)) {
          // Si es un array directamente
          commentsArray = data;
        } else if (data.comments && Array.isArray(data.comments)) {
          // Si tiene una propiedad comments que es un array
          commentsArray = data.comments;
        } else if (data.id) {
          // Si es un solo comentario
          commentsArray = [data];
        }
        
        setComments(commentsArray);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar comentarios:", err);
        setError("Error al cargar datos de comentarios");
        setLoading(false);
      }
    }

    loadComments();
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
        <h1 className="text-3xl font-bold text-foreground">Gestión de Comentarios</h1>
        <div className="flex space-x-4">
          <Link
            href="/admin/dashboard"
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Dashboard
          </Link>
        </div>
      </div>

      <div className="bg-card shadow rounded-lg overflow-hidden mt-8">
        <CommentsTable comments={comments} />
      </div>
    </div>
  );
}
