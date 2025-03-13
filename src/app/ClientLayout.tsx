"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthButton from "@/src/app/api/auth/AuthButton/AuthButton";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Suspense } from "react";
import { MessageBadge } from "@/src/app/components/MessageBadge";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />

      <main className="flex-1 mt-16 sm:mt-20">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="animate-pulse text-blue-600">Cargando...</div>
            </div>
          }
        >
          {children}
        </Suspense>
      </main>

      <footer className="bg-gradient-to-br from-blue-600 to-indigo-900 text-white py-8 mt-auto">
        <div className="border-blue-400/20 text-center text-sm text-blue-100">
          <p> 2025 Hemeroteca Digital. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
}

function Navbar() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? "bg-gradient-to-r from-blue-600 to-indigo-900 shadow-lg"
          : "bg-gradient-to-r from-blue-600/95 to-indigo-900/95 backdrop-blur-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                href={session ? "/home" : "/"}
                className="flex items-center group"
              >
                <div className="relative w-8 h-8 sm:w-10 sm:h-10 overflow-hidden rounded-lg transform transition-transform group-hover:scale-105">
                  <Image
                    src="/images/default_periodico.jpg"
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="ml-3 text-white font-semibold text-lg hidden sm:block transform transition-all group-hover:scale-105">
                  Hemeroteca Digital
                </span>
              </Link>
            </div>

            {/* Navigation links (authenticated users only) */}
            {session && (
              <nav className="hidden sm:ml-6 sm:flex sm:space-x-1">
                {[
                  { href: "/home", label: "Home" },
                  { href: "/Articulos", label: "Artículos" },
                  { href: "/sources", label: "Fuentes" },
                  { href: "/explore", label: "Descubrir Usuarios" },
                  {
                    href: "/messages",
                    label: (
                      <div className="flex items-center">
                        Mensajes
                        <MessageBadge />
                      </div>
                    ),
                  },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-blue-100 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-white/10"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Mobile menu and AuthButton */}
          <div className="flex items-center space-x-4">
            {/* Mobile menu button (authenticated users only) */}
            {session && (
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="sm:hidden inline-flex items-center justify-center p-2 rounded-md text-blue-100 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors"
              >
                <span className="sr-only">Abrir menú principal</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d={
                      isMenuOpen
                        ? "M6 18L18 6M6 6l12 12"
                        : "M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                    }
                  />
                </svg>
              </button>
            )}

            {/* AuthButton */}
            <div className="relative z-20">
              <AuthButton />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {session && (
        <div
          className={`sm:hidden transition-all duration-300 ease-in-out ${
            isMenuOpen
              ? "max-h-64 opacity-100"
              : "max-h-0 opacity-0 overflow-hidden"
          }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gradient-to-r from-blue-700 to-indigo-800">
            {[
              { href: "/", label: "Home" },
              { href: "/Articulos", label: "Artículos" },
              { href: "/sources", label: "Fuentes" },
              { href: "/explore", label: "Explorar Usuarios" },
              {
                href: "/messages",
                label: (
                  <div className="flex items-center">
                    Mensajes
                    <MessageBadge />
                  </div>
                ),
              },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-blue-100 hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-white/10 transition-colors"
                onClick={() => setIsMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
