"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from "next-themes";

export default function VerificationSuccessPage() {
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
          <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-green-500 dark:text-green-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M5 13l4 4L19 7" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Email verificado correctamente</h1>
          
          <p className="text-center text-gray-600 dark:text-gray-300">
            Tu dirección de correo electrónico ha sido verificada correctamente. 
            Ahora puedes acceder a todas las funcionalidades de la plataforma.
          </p>
          
          <Link href="/api/auth/signin" className="w-full mt-6">
            <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800">
              Iniciar sesión
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
