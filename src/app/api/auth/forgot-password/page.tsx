"use client";

import { Suspense } from "react";
import ForgotPasswordForm from "./_components/forgot-password-form";
import { useSearchParams } from "next/navigation";

// Configuración clave para resolver el error
export const dynamic = 'force-dynamic';

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  return (
    <div>
      <ForgotPasswordForm />
      {status === "success" && (
        <p className="text-green-500 text-center mt-4">
          Si tu correo existe en nuestra base de datos, recibirás un enlace para restablecer tu contraseña.
        </p>
      )}
      {status === "error" && (
        <p className="text-red-500 text-center mt-4">
          Ha ocurrido un error. Por favor, intenta nuevamente.
        </p>
      )}
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center p-8">Cargando formulario...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  );
}
