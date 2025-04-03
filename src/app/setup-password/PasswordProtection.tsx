"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function PasswordProtection({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // Si el usuario ya está autenticado pero no necesita cambiar contraseña
    if (session?.user && status === "authenticated" && !session.user.needsPasswordChange) {
      router.push("/home");
    }
    
    // Si el usuario no está autenticado
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }
  }, [session, status, router]);

  // Mostrar pantalla de carga mientras verificamos
  if (status === "loading" || !session?.user?.needsPasswordChange) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Verificando usuario...</h2>
        </div>
      </div>
    );
  }

  // Solo mostrar el contenido si el usuario necesita cambiar contraseña
  return <>{children}</>;
}
