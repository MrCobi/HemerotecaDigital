"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PasswordRequired({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Log para debugging
    console.log("Estado actual de la sesión:", session?.user?.needsPasswordChange);
    
    // Ignorar la verificación si ya estamos en la página de configuración de contraseña
    if (pathname === "/setup-password") {
      return;
    }

    // Verificar si el usuario necesita configurar una contraseña
    // Re-activado para nuevos usuarios de Google
    if (
      status === "authenticated" && 
      session?.user && 
      session.user.needsPasswordChange === true
    ) {
      console.log("Redirigiendo a setup-password desde el componente cliente");
      router.push("/setup-password");
    }
  }, [session, status, router, pathname]);

  // No bloquear el renderizado del contenido, la redirección ocurrirá si es necesaria
  return <>{children}</>;
}
