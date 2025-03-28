"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import AuthButton from "@/src/app/api/auth/AuthButton/AuthButton";
import Image from "next/image";
import { useState, useEffect } from "react";
import { Suspense } from "react";
import { MessageBadge } from "@/src/app/components/MessageBadge";
import { UnreadMessagesProvider } from "@/src/app/contexts/UnreadMessagesContext";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <UnreadMessagesProvider>
        <Navbar />

        <main className="flex-1 mt-16 sm:mt-16 md:mt-20">
          <Suspense
            fallback={
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-pulse text-blue-600 dark:text-blue-400">Cargando...</div>
              </div>
            }
          >
            {children}
          </Suspense>
        </main>

        <footer className="bg-gradient-to-br from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950 text-white py-6 sm:py-8 w-full">
          <div className="border-blue-400/20 dark:border-blue-800/20 text-center text-sm text-blue-100 px-4">
            <p> 2025 Hemeroteca Digital. Todos los derechos reservados.</p>
          </div>
        </footer>
      </UnreadMessagesProvider>
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
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${isScrolled
          ? "bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg dark:from-blue-900 dark:to-indigo-950"
          : "bg-gradient-to-r from-blue-600/95 to-indigo-700/95 backdrop-blur-sm dark:from-blue-900/95 dark:to-indigo-950/95"
        }`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12 sm:h-16 md:h-20">
          {/* Logo and main navigation */}
          <div className="flex items-center">
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <Link
                href={session ? "/home" : "/"}
                className="flex items-center group"
              >
                <div className="relative w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 overflow-hidden rounded-lg transform transition-transform group-hover:scale-105">
                  <Image
                    src="/images/default_periodico.jpg"
                    alt="Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="ml-1.5 sm:ml-2 md:ml-3 text-white font-semibold text-sm sm:text-base md:text-lg hidden xs:block transform transition-all group-hover:scale-105">
                  Hemeroteca Digital
                </span>
              </Link>
            </div>

            {/* Navigation links (authenticated users only) */}
            {session && (
              <nav className="hidden sm:ml-3 md:ml-6 sm:flex sm:space-x-0.5 md:space-x-2">
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
                    className="text-blue-100 hover:text-white px-1.5 sm:px-2 md:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 hover:bg-blue-800/50"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}
          </div>

          {/* Mobile menu and AuthButton */}
          <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
            {/* Mobile menu button (authenticated users only) */}
            {session && (
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="sm:hidden inline-flex items-center justify-center p-1 rounded-md text-blue-100 hover:text-white hover:bg-blue-800/50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors"
              >
                <span className="sr-only">Abrir menú principal</span>
                <svg
                  className="h-4 w-4"
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
          className={`sm:hidden transition-all duration-300 ease-in-out ${isMenuOpen
              ? "max-h-[16rem] opacity-100 shadow-lg"
              : "max-h-0 opacity-0 overflow-hidden"
            }`}
        >
          <div className="px-2 pt-2 pb-3 space-y-1 bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-blue-900 dark:to-indigo-950">
            {[
              { href: "/home", label: "Home" },
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
                className="text-blue-100 hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-blue-800/50 transition-colors"
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
