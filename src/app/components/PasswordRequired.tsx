"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function PasswordRequired({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Ignorar la verificación si ya estamos en la página de configuración de contraseña
    // o si la sesión aún está cargando
    if (pathname === "/setup-password" || status === "loading") {
      return;
    }

    // Verificar si el usuario necesita configurar una contraseña
    if (
      status === "authenticated" && 
      session?.user && 
      session.user.needsPasswordChange === true
    ) {
      // Prevenir redirecciones múltiples con una bandera local
      const redirectFlag = sessionStorage.getItem('redirectingToPasswordSetup');
      if (!redirectFlag) {
        console.log("Redirigiendo a setup-password");
        sessionStorage.setItem('redirectingToPasswordSetup', 'true');
        router.push("/setup-password");
      }
    } else if (status === "authenticated") {
      // Limpiar la bandera si ya no necesita cambiar contraseña
      sessionStorage.removeItem('redirectingToPasswordSetup');
    }
  }, [session, status, router, pathname]);

  // No bloquear el renderizado del contenido, la redirección ocurrirá si es necesaria
  return <>{children}</>;
}
