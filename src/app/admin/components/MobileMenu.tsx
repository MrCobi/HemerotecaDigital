"use client";

import { useState } from "react";
import Link from "next/link";
import SafeImage from "@/src/components/ui/SafeImage";

export default function MobileMenu({
  username,
  userImage,
}: {
  username: string;
  userImage: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="text-gray-500 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-card rounded-md p-2"
        onClick={toggleMenu}
        aria-label="Toggle mobile menu"
      >
        <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-16 left-0 right-0 bg-card shadow-lg border-t border-border z-50">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10">
                <SafeImage
                  className="h-10 w-10 rounded-full object-cover"
                  src={userImage}
                  alt={username || "Administrador"}
                  width={40}
                  height={40}
                  fallbackSrc="/images/AvatarPredeterminado.webp"
                />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-foreground">{username || "Administrador"}</p>
                <Link
                  href="/api/auth/signout"
                  className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
                >
                  Cerrar sesión
                </Link>
              </div>
            </div>
            
            <button
              onClick={toggleMenu}
              className="p-2 rounded-md text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              aria-label="Cerrar menú"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <nav className="px-4 py-2">
            <div className="space-y-1 mb-4">
              <Link href="/admin/dashboard" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Dashboard
              </Link>
              <Link href="/admin/users" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Usuarios
              </Link>
            </div>

            <div className="space-y-1 mb-4">
              <Link href="/admin/sources" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Fuentes
              </Link>
              <Link href="/admin/comments" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Comentarios
              </Link>
              <Link href="/admin/ratings" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Valoraciones
              </Link>
              <Link href="/admin/favorites" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Favoritos
              </Link>
            </div>

            <div className="space-y-1">
              <Link href="/admin/messages" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Mensajes
              </Link>
              <Link href="/admin/activity" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Actividad
              </Link>
              <Link href="/admin/follows" className="block px-4 py-2 text-sm font-medium rounded-md hover:bg-primary/10 transition-colors">
                Seguidores
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
