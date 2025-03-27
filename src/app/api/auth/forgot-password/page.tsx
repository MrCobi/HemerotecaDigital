"use client";

import { Suspense } from "react";
import ForgotPasswordForm from "./_components/forgot-password-form";
import { useSearchParams } from "next/navigation";
import { Metadata } from 'next';

// Configuración clave para resolver el error
export const dynamic = 'force-dynamic';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  return (
    <div>
      <ForgotPasswordForm />
      {status === "success" && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-100 dark:bg-green-900/80 border-l-4 border-green-500 dark:border-green-700 text-green-700 dark:text-green-400 p-4 rounded-md shadow-lg max-w-md w-full mx-auto">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-green-500 dark:text-green-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Si tu correo existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.</span>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-red-100 dark:bg-red-900/80 border-l-4 border-red-500 dark:border-red-700 text-red-700 dark:text-red-400 p-4 rounded-md shadow-lg max-w-md w-full mx-auto">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-500 dark:text-red-400 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Ha ocurrido un error. Por favor, intenta nuevamente.</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center p-8 bg-white/80 dark:bg-blue-900/80 rounded-xl shadow-lg">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 dark:border-blue-400 border-t-transparent dark:border-t-transparent rounded-full mb-4"></div>
          <p className="text-gray-700 dark:text-blue-200">Cargando formulario...</p>
        </div>
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
