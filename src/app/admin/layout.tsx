"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ReactNode } from "react";
import MobileMenu from "./components/MobileMenu";
import SafeImage from "@/src/components/ui/SafeImage";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [session, setSession] = useState<{
    user?: {
      name?: string;
      email?: string;
      image?: string;
      role?: string;
    };
    expires?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/auth/session');
        const sessionData = await res.json();

        if (!sessionData || !sessionData.user) {
          router.push("/api/auth/signin");
          return;
        }

        if (sessionData.user.role !== "admin") {
          router.push("/acceso-denegado");
          return;
        }

        setSession(sessionData);
        setLoading(false);
      } catch (error) {
        console.error("Error checking session:", error);
        router.push("/api/auth/signin");
      }
    }

    checkSession();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar de navegación */}
      <aside className="w-64 bg-white dark:bg-gray-800 shadow-md hidden md:block h-screen sticky top-0">
        <div className="p-6">
          <Link href="/admin/dashboard" className="flex items-center space-x-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xl font-bold text-foreground">Hemeroteca</span>
          </Link>
        </div>

        <nav className="px-4 py-2">
          <p className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">General</p>
          <div className="space-y-1">
            <Link href="/admin/dashboard" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Dashboard
            </Link>
            <Link href="/admin/users" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Usuarios
            </Link>
          </div>

          <p className="px-4 mt-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contenido</p>
          <div className="space-y-1">
            <Link href="/admin/sources" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v6a2 2 0 01-2 2z" />
              </svg>
              Fuentes
            </Link>
            <Link href="/admin/comments" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Comentarios
            </Link>
            <Link href="/admin/ratings" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              Valoraciones
            </Link>
            <Link href="/admin/favorites" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Favoritos
            </Link>
          </div>

          <p className="px-4 mt-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Social</p>
          <div className="space-y-1">
            <Link href="/admin/messages" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Mensajes
            </Link>
            <Link href="/admin/activity" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Actividad
            </Link>
            <Link href="/admin/follows" className="group flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent transition-colors text-foreground">
              <svg xmlns="http://www.w3.org/2000/svg" className="mr-3 h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Seguidores
            </Link>
          </div>
        </nav>

        <div className="px-4 py-6 border-t border-gray-200 dark:border-gray-700 mt-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {session?.user?.image ? (
                <SafeImage 
                  className="h-10 w-10 rounded-full" 
                  src={session.user.image} 
                  alt={session?.user?.name || "Administrator"}
                  width={40}
                  height={40}
                  fallbackSrc="/images/AvatarPredeterminado.webp"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {session?.user?.name ? session.user.name.charAt(0).toUpperCase() : "A"}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-foreground">{session?.user?.name || "Administrator"}</p>
              <p className="text-xs text-muted-foreground">Administrador</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 flex flex-col">
        {/* Barra superior para móviles */}
        <header className="bg-white dark:bg-gray-800 shadow-sm z-10 md:hidden">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
            <Link href="/admin/dashboard" className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="text-xl font-bold text-foreground">Hemeroteca</span>
            </Link>
            
            <MobileMenu 
              username={session?.user?.name || "Administrador"} 
              userImage={session?.user?.image || `/images/AvatarPredeterminado.webp`} 
            />
          </div>
        </header>

        {/* Contenido de la página */}
        <main className="flex-1 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
      </div>
    </div>
  );
}
