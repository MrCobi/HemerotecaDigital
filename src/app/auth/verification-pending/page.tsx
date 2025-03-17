"use client";

import { useEffect } from 'react';
import Link from 'next/link';
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function VerificationPendingPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // If the user is already verified or logged in, redirect to home
  useEffect(() => {
    if (session?.user?.emailVerified) {
      router.push('/home');
    }
  }, [session, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-md p-8 space-y-8 bg-white shadow-md rounded-lg">
        <div className="text-center">
          <h2 className="mt-6 text-2xl font-extrabold text-gray-900">Verificación Pendiente</h2>
          <p className="mt-2 text-sm text-gray-600">
            Hemos enviado un correo electrónico a tu dirección de correo para verificar tu cuenta.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="w-24 h-24 relative">
            <Image
              src="/images/email-verification.png"
              alt="Email verification"
              fill
              style={{ objectFit: "contain" }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-500 text-center">
            Por favor, revisa tu bandeja de entrada y haz clic en el enlace de verificación para activar tu cuenta.
          </p>
          <p className="text-sm text-gray-500 text-center">
            Si no has recibido el correo electrónico, comprueba tu carpeta de spam o solicita un nuevo enlace de verificación.
          </p>
        </div>

        <div className="flex flex-col space-y-3">
          <button className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Link href="/auth/resend-verification" className="text-white no-underline">
              Reenviar correo de verificación
            </Link>
          </button>
          <button className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
            <Link href="/login" className="text-gray-700 no-underline">
              Volver al inicio de sesión
            </Link>
          </button>
        </div>
      </div>
    </div>
  );
}
