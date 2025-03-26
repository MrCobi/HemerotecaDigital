"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_ROUTES } from "@/src/config/api-routes";
import { useTheme } from "next-themes";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const { setTheme } = useTheme();

  // Aplicar el tema según la preferencia del sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch(API_ROUTES.auth.resendVerification, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar el correo de verificación');
      }

      setStatus('success');
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 shadow-md rounded-lg overflow-hidden">
        <div className="p-5 border-b dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reenviar correo de verificación</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Introduce tu correo electrónico para recibir un nuevo enlace de verificación
          </p>
        </div>
        <div className="p-5">
          {status === 'success' ? (
            <div className="flex flex-col items-center space-y-4 p-4 text-center">
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Si tu dirección de correo electrónico está registrada, te hemos enviado un nuevo enlace de verificación.
                Por favor, revisa tu bandeja de entrada y sigue las instrucciones.
              </p>
              <button className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded mt-2">
                <Link href="/api/auth/signin" className="text-white no-underline">Volver al inicio de sesión</Link>
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {status === 'error' && (
                <div className="flex items-center space-x-2 p-3 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{errorMessage}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-gray-800"
                disabled={isLoading}
              >
                {isLoading ? 'Enviando...' : 'Enviar enlace de verificación'}
              </button>
            </form>
          )}
        </div>
        <div className="border-t dark:border-gray-700 p-4 text-center">
          <Link href="/api/auth/signin" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
            Volver al inicio de sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
