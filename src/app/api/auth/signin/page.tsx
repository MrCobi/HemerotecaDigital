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
        <p className="text-red-500 text-center mt-4">
          Credenciales inválidas. Verifique su email y contraseña.
        </p>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div className="text-center p-8">Cargando formulario...</div>}>
      <SignInContent />
    </Suspense>
  );
}