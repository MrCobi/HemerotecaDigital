// app/api/auth/signup/page.tsx
"use client";

import SignUpForm from './_components/signup-form';
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";


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
    <main className="overflow-x-hidden max-w-full">
      <SignUpForm />
    </main>
  );
}