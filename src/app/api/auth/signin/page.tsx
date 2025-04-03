// src/app/api/auth/signin/page.tsx
"use client";

import { Suspense } from "react";
import SigninForm from "./_components/signin-form";
import { useSearchParams } from "next/navigation";

// Configuración clave para resolver el error
export const dynamic = 'force-dynamic';

function SignInContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  return (
    <div>
      <SigninForm isVerified={false} />
      {error === "auth_error" && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900/80 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-400 p-4 rounded-md shadow-lg max-w-md w-full mx-auto">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Credenciales inválidas. Verifique su email y contraseña.</span>
          </div>
        </div>
      )}
      {error === "OAuthAccountNotLinked" && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-amber-100 dark:bg-amber-900/80 border-l-4 border-amber-500 dark:border-amber-700 text-amber-700 dark:text-amber-400 p-4 rounded-md shadow-lg max-w-md w-full mx-auto z-50">
          <div className="flex">
            <svg className="h-5 w-5 text-amber-500 dark:text-amber-400 mr-2 flex-shrink-0 mt-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-medium mb-1">No se pudo vincular la cuenta</div>
              <p className="text-sm">Ya existe una cuenta con este email. Inicia sesión con email y contraseña en lugar de usar Google.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
        <div className="text-center p-8 bg-white/80 dark:bg-blue-900/80 rounded-xl shadow-lg">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent dark:border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-700 dark:text-blue-200">Cargando formulario...</p>
        </div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}