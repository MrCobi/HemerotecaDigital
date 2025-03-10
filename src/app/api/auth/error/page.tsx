// src/app/api/auth/error/page.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthErrorPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/api/auth/signin?error=auth_error");
  }, [router]); // Se agrega router como dependencia

  return <div>Redirigiendo...</div>;
}
