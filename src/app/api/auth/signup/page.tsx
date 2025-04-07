// app/api/auth/signup/page.tsx
"use client";

import SignUpForm from './_components/signup-form';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Nota: No podemos exportar metadata desde un componente de cliente
// La metadata se maneja automáticamente o debe estar en un archivo layout.tsx

export default function SignUpPage() {
  const router = useRouter();
  const { data: session } = useSession();

  // Redirección si el usuario ya ha iniciado sesión
  useEffect(() => {
    if (session) {
      router.push("/home");
    }
  }, [session, router]);

  return (
    <main>
      <SignUpForm />
    </main>
  );
}