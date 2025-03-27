"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { API_ROUTES } from "@/src/config/api-routes";
import { useTheme } from "next-themes";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");
  const [userData, setUserData] = useState<{id: string; email: string; name?: string} | null>(null);
  const { setTheme } = useTheme();

  // Aplicar el tema según la preferencia del sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setTheme(systemPrefersDark ? 'dark' : 'light');
    }
  }, [setTheme]);

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
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 dark:from-gray-900 dark:to-gray-800 p-4 relative overflow-hidden">
      {/* Elementos decorativos */}
      <div className="absolute top-20 left-20 w-32 h-32 bg-gradient-to-br from-amber-300/50 to-orange-400/50 dark:from-amber-400/10 dark:to-orange-500/10 rounded-full opacity-60 blur-xl"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-gradient-to-tr from-blue-400/50 to-blue-500/50 dark:from-blue-500/10 dark:to-blue-600/10 rounded-full opacity-60 blur-xl"></div>
      <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-gradient-to-br from-pink-300/50 to-purple-400/50 dark:from-pink-400/10 dark:to-purple-500/10 rounded-full opacity-40 blur-xl"></div>

      <div className="max-w-md w-full bg-white dark:bg-gray-800/80 rounded-2xl shadow-xl overflow-hidden z-10">
        {/* Cabecera con icono */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="inline-flex flex-col items-center justify-center mb-6">
            {status === "loading" ? (
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-blue-500/20 dark:bg-blue-500/30">
                <svg className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : status === "success" ? (
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            ) : (
              <div className="w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            )}
            
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mt-4">
              {status === "loading" ? "Verificando email" : 
               status === "success" ? "¡Verificación completa!" :
               "Verificación fallida"}
            </h2>
            
            {status !== "loading" && (
              <p className="text-gray-600 dark:text-blue-200 mt-2">
                {status === "success" 
                  ? "Tu correo electrónico ha sido verificado correctamente." 
                  : message || "Ha ocurrido un error durante la verificación."}
              </p>
            )}
            
            {status === "success" && userData && (
              <div className="mt-4 text-sm text-green-600 dark:text-green-400">
                Iniciando sesión automáticamente...
              </div>
            )}
          </div>

          {status !== "loading" && (
            <div className={`rounded-xl p-4 mb-6 ${
              status === "success" ? "bg-green-50 dark:bg-green-900/30 border border-green-100 dark:border-green-800" :
              "bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800"
            }`}>
              <div className="flex items-start">
                <div className="flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${
                    status === "success" ? "text-green-500 dark:text-green-400" :
                    "text-red-500 dark:text-red-400"
                  }`} viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className={`text-sm text-left ${
                    status === "success" ? "text-green-700 dark:text-green-300" :
                    "text-red-700 dark:text-red-300"
                  }`}>
                    {status === "success" 
                      ? "Tu cuenta ha sido activada correctamente. " + (userData ? "Estás siendo conectado automáticamente." : "Ahora puedes iniciar sesión y acceder a todas las funcionalidades.")
                      : "No se pudo verificar tu correo electrónico. Por favor, intenta de nuevo o contacta con soporte."}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Botones de acción */}
        <div className="px-8 pb-8 space-y-3">
          {status === "success" && (
            <Link 
              href="/home"
              className="block w-full py-3 px-4 rounded-xl text-center font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
            >
              Ir a la página principal
            </Link>
          )}
          
          {status === "error" && (
            <>
              <Link 
                href="/auth/resend-verification"
                className="block w-full py-3 px-4 rounded-xl text-center font-medium text-white bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-lg hover:shadow-xl transition-all"
              >
                Reenviar verificación
              </Link>
              
              <Link 
                href="/api/auth/signin"
                className="block w-full py-3 px-4 rounded-xl text-center font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-500 dark:to-blue-600 dark:hover:from-blue-400 dark:hover:to-blue-500 shadow-lg hover:shadow-xl transition-all"
              >
                Volver al inicio de sesión
              </Link>
            </>
          )}
          
          <Link 
            href="/"
            className="block w-full py-3 px-4 rounded-xl text-center font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 transition-all"
          >
            Volver a la página principal
          </Link>
        </div>

        {/* Pie de página */}
        <div className="px-8 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center text-xs text-gray-500 dark:text-blue-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Conexión segura
            </div>
            <div className="h-4 border-r border-gray-300 dark:border-gray-700"></div>
            <div className="flex items-center text-xs text-gray-500 dark:text-blue-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Verificación segura
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
