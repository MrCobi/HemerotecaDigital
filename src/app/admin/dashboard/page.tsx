"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function AdminDashboard() {
  const [stats, setStats] = useState<{
    userCount: number;
    sourceCount: number;
    commentCount: number;
    ratingCount: number;
    favoriteCount: number;
    messageCount: number;
    conversationCount: number;
  }>({ 
    userCount: 0, 
    sourceCount: 0, 
    commentCount: 0, 
    ratingCount: 0, 
    favoriteCount: 0, 
    messageCount: 0,
    conversationCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch session and statistics data
    const fetchData = async () => {
      try {
        // Fetch session (could be moved to a separate API route for client components)
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (!sessionData || !sessionData.user) {
          window.location.href = '/api/auth/signin';
          return;
        }
        
        if (sessionData.user.role !== 'admin') {
          window.location.href = '/acceso-denegado';
          return;
        }
        
        // Fetch dashboard stats from an API endpoint
        const statsRes = await fetch('/api/admin/stats');
        const statsData = await statsRes.json();
        
        // Uso del operador coalescente nulo para proporcionar valores predeterminados
        // y manejar cualquier formato de respuesta
        setStats({
          userCount: statsData?.userCount ?? statsData?.users ?? 0,
          sourceCount: statsData?.sourceCount ?? statsData?.sources ?? 0,
          commentCount: statsData?.commentCount ?? statsData?.comments ?? 0,
          ratingCount: statsData?.ratingCount ?? statsData?.ratings ?? 0,
          favoriteCount: statsData?.favoriteCount ?? statsData?.favorites ?? 0,
          messageCount: statsData?.messageCount ?? statsData?.messages ?? 0,
          conversationCount: statsData?.conversationCount ?? statsData?.conversations ?? 0
        });
        setLoading(false);
      } catch (err) {
        console.error('Error loading dashboard data:', err);
        setError('Error al cargar los datos del dashboard');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

  // Definir los módulos del panel de administración
  const adminModules = [
    {
      title: "Usuarios",
      description: "Gestionar cuentas de usuario, roles y permisos",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      count: stats.userCount,
      href: "/admin/users",
      color: "bg-blue-500"
    },
    {
      title: "Fuentes",
      description: "Administrar fuentes de información y categorías",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      count: stats.sourceCount,
      href: "/admin/sources",
      color: "bg-purple-500"
    },
    {
      title: "Comentarios",
      description: "Moderar y administrar los comentarios de los usuarios",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      count: stats.commentCount,
      href: "/admin/comments",
      color: "bg-green-500"
    },
    {
      title: "Valoraciones",
      description: "Gestionar las valoraciones de las fuentes",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      count: stats.ratingCount,
      href: "/admin/ratings",
      color: "bg-amber-500"
    },
    {
      title: "Favoritos",
      description: "Ver las fuentes favoritas de los usuarios",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      count: stats.favoriteCount,
      href: "/admin/favorites",
      color: "bg-red-500"
    },
    {
      title: "Conversaciones",
      description: "Administrar las conversaciones entre usuarios",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2h2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
        </svg>
      ),
      count: stats.conversationCount,
      href: "/admin/conversations",
      color: "bg-teal-500"
    },
    {
      title: "Mensajes",
      description: "Administrar mensajes directos entre usuarios",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      count: stats.messageCount,
      href: "/admin/messages",
      color: "bg-indigo-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
        <Link
          href="/home"
          className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 sm:mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
          <span className="whitespace-nowrap">Volver al inicio</span>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((module) => (
          <Link key={module.title} href={module.href} className="block">
            <div className="rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 bg-card">
              <div className={`p-4 ${module.color} text-white flex justify-between items-center`}>
                <div className="flex-shrink-0">
                  {module.icon}
                </div>
                <span className="text-2xl font-bold">{module.count}</span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-foreground">{module.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-foreground">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/admin/users/create"
            className="flex items-center p-3 rounded-md hover:bg-accent/50 transition-colors duration-200"
          >
            <div className="flex-shrink-0 mr-3 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Añadir usuario</h3>
              <p className="text-xs text-muted-foreground">Crear una nueva cuenta de usuario</p>
            </div>
          </Link>

          <Link
            href="/admin/sources/new"
            className="flex items-center p-3 rounded-md hover:bg-accent/50 transition-colors duration-200"
          >
            <div className="flex-shrink-0 mr-3 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Añadir fuente</h3>
              <p className="text-xs text-muted-foreground">Crear una nueva fuente de información</p>
            </div>
          </Link>

          <Link
            href="/admin/conversations"
            className="flex items-center p-3 rounded-md hover:bg-accent/50 transition-colors duration-200"
          >
            <div className="flex-shrink-0 mr-3 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Gestionar conversaciones</h3>
              <p className="text-xs text-muted-foreground">Ver y administrar conversaciones</p>
            </div>
          </Link>

          <Link
            href="/admin/comments"
            className="flex items-center p-3 rounded-md hover:bg-accent/50 transition-colors duration-200"
          >
            <div className="flex-shrink-0 mr-3 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">Moderar comentarios</h3>
              <p className="text-xs text-muted-foreground">Revisar los comentarios recientes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
