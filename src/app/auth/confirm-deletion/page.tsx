"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { useTheme } from "next-themes";

export default function ConfirmDeletionPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const { theme } = useTheme();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("Token no válido. Por favor, solicita un nuevo enlace de eliminación.");
      return;
    }

    const confirmDeletion = async () => {
      try {
        const response = await fetch("/api/user/delete-account/confirm", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus("success");
          // Cerrar sesión después de que la cuenta se ha eliminado
          setTimeout(() => {
            signOut({ callbackUrl: "/" });
          }, 3000);
        } else {
          setStatus("error");
          setErrorMessage(data.message || "Error al procesar la solicitud");
        }
      } catch (error) {
        console.error("Error al confirmar eliminación:", error);
        setStatus("error");
        setErrorMessage("Error de conexión. Por favor, inténtalo de nuevo más tarde.");
      }
    };

    confirmDeletion();
  }, [token]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Procesando tu solicitud</h1>
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent dark:border-blue-500 dark:border-t-transparent rounded-full animate-spin"></div>
          </div>
          <p className="text-center text-gray-600 dark:text-gray-300">Estamos verificando tu solicitud de eliminación de cuenta...</p>
        </div>
      </div>
    );
  }

  if (status === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Cuenta eliminada correctamente</h1>
          </div>
          <p className="text-center text-gray-600 dark:text-gray-300">
            Tu cuenta ha sido eliminada permanentemente. Serás redirigido a la página principal en unos segundos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 dark:text-white">Error</h1>
        </div>
        <p className="text-center text-gray-600 dark:text-gray-300">{errorMessage}</p>
        <div className="flex justify-center">
          <Link href="/settings" className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300">
            Volver a configuración
          </Link>
        </div>
      </div>
    </div>
  );
}
