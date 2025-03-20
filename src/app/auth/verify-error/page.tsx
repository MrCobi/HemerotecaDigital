"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from "next-themes";

export default function VerificationErrorPage() {
  const { setTheme } = useTheme();

  // Aplicar el tema según la preferencia del sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-900">
      <div className="max-w-md w-full mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-red-500 dark:text-red-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M6 18L18 6M6 6l12 12" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Error de verificación</h1>
          
          <p className="text-center text-gray-600 dark:text-gray-300">
            No hemos podido verificar tu correo electrónico. El enlace puede haber expirado o no ser válido.
          </p>
          
          <div className="flex flex-col w-full space-y-3 mt-4">
            <Link href="/auth/resend-verification">
              <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                Reenviar enlace de verificación
              </button>
            </Link>
            
            <Link href="/api/auth/signin">
              <button className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
                Volver al inicio de sesión
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
