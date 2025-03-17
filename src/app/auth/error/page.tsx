"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get('error');
  const [errorMessage, setErrorMessage] = useState('Ha ocurrido un error durante la autenticación');
  const [errorTitle, setErrorTitle] = useState('Error de autenticación');

  useEffect(() => {
    if (error === 'email_not_verified') {
      setErrorTitle('Email no verificado');
      setErrorMessage('Tu cuenta no ha sido verificada. Por favor, verifica tu correo electrónico para acceder.');
    } else if (error === 'CredentialsSignin') {
      setErrorTitle('Credenciales incorrectas');
      setErrorMessage('El correo electrónico o la contraseña son incorrectos. Por favor, inténtalo de nuevo.');
    }
  }, [error]);

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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
              />
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-800">{errorTitle}</h1>
          
          <p className="text-center text-gray-600">
            {errorMessage}
          </p>
          
          <div className="flex flex-col w-full space-y-3 mt-4">
            {error === 'email_not_verified' && (
              <button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition duration-150"
                onClick={() => window.location.href = '/auth/resend-verification'}
              >
                Reenviar correo de verificación
              </button>
            )}
            
            <Link 
              href="/login"
              className="w-full bg-transparent hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 border border-gray-300 rounded text-center transition duration-150"
            >
              Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
