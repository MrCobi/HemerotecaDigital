import React from 'react';
import { Button } from '@/src/app/components/ui/button';
import Link from 'next/link';

export default function VerificationErrorPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full mx-auto bg-white shadow-lg rounded-lg p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-red-100 p-3 rounded-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-red-500" 
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
          
          <h1 className="text-2xl font-bold text-gray-800">Error de verificación</h1>
          
          <p className="text-center text-gray-600">
            No hemos podido verificar tu correo electrónico. El enlace puede haber expirado o no ser válido.
          </p>
          
          <div className="flex flex-col w-full space-y-3 mt-4">
            <Button asChild className="w-full">
              <Link href="/auth/resend-verification">Reenviar enlace de verificación</Link>
            </Button>
            
            <Button asChild variant="outline" className="w-full">
              <Link href="/login">Volver al inicio de sesión</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
