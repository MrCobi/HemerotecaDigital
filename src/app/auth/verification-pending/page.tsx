"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTheme } from "next-themes";

export default function VerificationPendingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { setTheme } = useTheme();

  // Aplicar el tema según la preferencia del sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);

  // If the user is already verified or logged in, redirect to home
  useEffect(() => {
    if (session?.user?.emailVerified) {
      router.push('/home');
    }
  }, [session, router]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-amber-300 to-orange-400 dark:from-amber-400/20 dark:to-orange-500/20 rounded-full opacity-60 blur-xl"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-tr from-blue-400 to-blue-500 dark:from-blue-500/20 dark:to-blue-600/20 rounded-full opacity-60 blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-br from-pink-300 to-purple-400 dark:from-pink-400/20 dark:to-purple-500/20 rounded-full opacity-40 blur-xl"></div>

      <div className="max-w-md w-full bg-white dark:bg-gray-800/80 rounded-2xl shadow-xl overflow-hidden z-10">
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="inline-flex flex-col items-center justify-center mb-4">
            <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-blue-600 mb-4">
              {/* Icono de correo electrónico SVG */}
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-8 w-8 text-white" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
              >
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
              Verificación Pendiente
            </h2>
            <p className="text-gray-600 dark:text-blue-200 mt-2">
              Hemos enviado un correo electrónico a tu dirección para verificar tu cuenta.
            </p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl p-6 mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 dark:text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700 dark:text-blue-300 text-left">
                  Por favor, revisa tu bandeja de entrada y haz clic en el enlace de verificación para activar tu cuenta.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Si no has recibido el correo, verifica tu carpeta de spam o solicita un nuevo enlace de verificación usando el botón a continuación.
              </p>
            </div>
          </div>
        </div>

        <div className="px-8 pb-8 space-y-3">
          <Link 
            href="/auth/resend-verification" 
            className="block w-full py-3 px-4 rounded-xl text-center font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-400 dark:hover:to-blue-500 shadow-lg hover:shadow-xl transition-all"
          >
            Reenviar correo de verificación
          </Link>
          
          <Link 
            href="/api/auth/signin" 
            className="block w-full py-3 px-4 rounded-xl text-center font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 transition-all"
          >
            Volver al inicio de sesión
          </Link>
        </div>

        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center text-xs text-gray-500 dark:text-blue-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Conexión segura
            </div>
            <div className="h-4 border-r border-gray-300 dark:border-gray-700"></div>
            <div className="flex items-center text-xs text-gray-500 dark:text-blue-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
              Verificación por correo
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
