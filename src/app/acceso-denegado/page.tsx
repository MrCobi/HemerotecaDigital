"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function AccessDenied() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => router.push("/"), 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <Image
        src="/images/acceso-denegado.png"
        alt="Acceso denegado"
        width={300}
        height={300}
        className="mb-8"
      />
      <h1 className="text-3xl font-bold text-red-600 mb-4">
        Acceso no autorizado
      </h1>
      <p className="text-gray-600 text-lg">
        Serás redirigido automáticamente a la página principal
      </p>
    </div>
  );
}