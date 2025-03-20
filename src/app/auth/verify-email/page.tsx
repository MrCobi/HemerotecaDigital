"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { API_ROUTES } from "@/src/config/api-routes";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [userData, setUserData] = useState<{id: string; email: string; name?: string} | null>(null);

  useEffect(() => {
    if (!token) {
      console.error("No token found in URL parameters");
      setStatus("error");
      setMessage("Token de verificación inválido o ausente.");
      return;
    }

    console.log("Token found:", token.substring(0, 10) + "...");

    const verifyEmail = async () => {
      try {
        console.log("Calling API with token");
        const response = await fetch(`${API_ROUTES.auth.verifyEmail}?token=${encodeURIComponent(token)}`);
        console.log("API response status:", response.status);
        
        const data = await response.json().catch(() => ({ error: "Error desconocido" }));
        
        if (response.ok) {
          console.log("Email verification success:", data);
          setStatus("success");
          
          if (data.user) {
            setUserData(data.user);
            
            // Intento de inicio de sesión automático
            try {
              console.log("Attempting auto-login with:", data.user.email);
              
              // Usamos signIn con credentials y los datos del usuario verificado
              const result = await signIn("credentials", {
                redirect: false,
                email: data.user.email,
                callbackUrl: "/home",
                autoVerified: "true" // Un flag especial para indicar que viene de verificación
              });
              
              console.log("Auto-login result:", result);
              
              if (result?.ok) {
                console.log("Login successful, redirecting to home");
                // Redirección a la página principal/home
                setTimeout(() => {
                  router.push("/home");
                }, 1000);
                return;
              } else {
                console.error("Auto-login failed:", result?.error);
              }
            } catch (loginError) {
              console.error("Error during auto-login:", loginError);
            }
          }
          
          // Si el auto-login falló o no hay datos de usuario, redirigimos al éxito normal
          setTimeout(() => {
            router.push("/auth/verify-success");
          }, 2000);
        } else {
          console.error("Email verification error:", data);
          setStatus("error");
          setMessage(data.error || "Error al verificar el correo electrónico.");
          
          // Redirigir a la página de error
          setTimeout(() => {
            router.push("/auth/verify-error");
          }, 2000);
        }
      } catch (error) {
        console.error("Exception during verification:", error);
        setStatus("error");
        setMessage("Error al procesar la solicitud de verificación.");
        
        // Redirigir a la página de error
        setTimeout(() => {
          router.push("/auth/verify-error");
        }, 2000);
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          {status === "loading" && "Verificando correo electrónico..."}
          {status === "success" && "¡Verificación exitosa!"}
          {status === "error" && "Error de verificación"}
        </h1>
        
        {status === "loading" && (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {status === "success" && (
          <div className="space-y-4 text-center">
            <p className="text-green-600">Tu correo electrónico ha sido verificado correctamente.</p>
            <p className="text-gray-600">
              {userData ? "Iniciando sesión automáticamente..." : "Serás redirigido automáticamente..."}
            </p>
            <Link href="/home">
              <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
                Ir a la página principal
              </button>
            </Link>
          </div>
        )}
        
        {status === "error" && (
          <div className="space-y-4 text-center">
            <p className="text-red-600">{message}</p>
            <p className="text-gray-600">Serás redirigido automáticamente...</p>
            <div className="flex flex-col space-y-2">
              <Link href="/auth/resend-verification">
                <button className="w-full border border-gray-300 bg-white hover:bg-gray-50 text-gray-800 font-medium py-2 px-4 rounded">
                  Reenviar verificación
                </button>
              </Link>
              <Link href="/api/auth/signin">
                <button className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded">
                  Volver al inicio de sesión
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
