import React from 'react';
import Link from 'next/link';

export default function VerificationSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full mx-auto bg-white shadow-lg rounded-lg p-8">
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-green-100 p-3 rounded-full">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-16 w-16 text-green-500" 
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
          
          <h1 className="text-2xl font-bold text-gray-800">Email verificado correctamente</h1>
          
          <p className="text-center text-gray-600">
            Tu dirección de correo electrónico ha sido verificada correctamente. 
            Ahora puedes acceder a todas las funcionalidades de la plataforma.
          </p>
          
          <Link href="/login" className="w-full mt-6">
            <button className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Iniciar sesión
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
