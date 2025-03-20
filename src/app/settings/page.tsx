"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PrivacySettings } from "@/src/app/components/PrivacySettings";
import { getUserPrivacySettings } from "@/lib/api";
import { redirect } from "next/navigation";
import { toast } from "react-hot-toast";
import { useTheme } from "@/src/app/components/ThemeProvider";
import Link from "next/link";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { theme, setTheme } = useTheme();
  const [settings, setSettings] = useState({
    showFavorites: true,
    showActivity: true,
  });
  const [loading, setLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      if (session?.user) {
        try {
          const userSettings = await getUserPrivacySettings();
          setSettings(userSettings);
        } catch (error) {
          console.error("Error al cargar configuración de privacidad:", error);
        } finally {
          setLoading(false);
        }
      }
    };

    if (status === "authenticated") {
      loadSettings();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [session, status]);

  // Redireccionar si no está autenticado
  if (status === "unauthenticated") {
    redirect("/api/auth/signin");
  }

  const handleDeleteAccount = async () => {
    if (!session?.user?.email) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch('/api/user/delete-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Correo de confirmación enviado. Por favor revisa tu bandeja de entrada.');
      } else {
        toast.error(data.message || 'Error al enviar el correo de confirmación');
      }
    } catch (error) {
      console.error('Error al solicitar eliminación de cuenta:', error);
      toast.error('Error al procesar la solicitud');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800/80 p-6 rounded-lg shadow-lg dark:shadow-blue-900/20 transition-all duration-200">
          <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-blue-100">Configuración</h1>
          <div className="text-gray-800 dark:text-blue-100">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800/80 p-6 rounded-lg shadow-lg dark:shadow-blue-900/20 transition-all duration-200">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-blue-100">Configuración</h1>
        
        {/* Sección de Apariencia */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-blue-200">Apariencia</h2>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
            <label className="block text-gray-600 dark:text-blue-200/80 mb-2">Tema</label>
            <div className="flex gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`px-4 py-2 rounded-md flex items-center justify-center ${
                  theme === "light" 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="M4.93 4.93l1.41 1.41"></path>
                  <path d="M17.66 17.66l1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="M6.34 17.66l-1.41 1.41"></path>
                  <path d="M19.07 4.93l-1.41 1.41"></path>
                </svg>
                Claro
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`px-4 py-2 rounded-md flex items-center justify-center ${
                  theme === "dark" 
                    ? "bg-blue-600 text-white" 
                    : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
                Oscuro
              </button>
              <button
                onClick={() => setTheme("system")}
                className={`px-4 py-2 rounded-md flex items-center justify-center ${
                  theme === "system" 
                    ? "bg-blue-500 text-white" 
                    : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                }`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                  <rect width="16" height="12" x="4" y="6" rx="2"></rect>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="M12 22v-4"></path>
                  <path d="M12 2v4"></path>
                </svg>
                Sistema
              </button>
            </div>
          </div>
          <div className="mt-3 text-right">
            <Link href="/appearance" className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:underline text-sm flex items-center justify-end">
              Opciones avanzadas de apariencia
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                <path d="M5 12h14"></path>
                <path d="m12 5 7 7-7 7"></path>
              </svg>
            </Link>
          </div>
        </div>
        
        {/* Sección de Privacidad */}
        <div className="mb-8 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-blue-200">Privacidad</h2>
          <PrivacySettings initialSettings={settings} />
        </div>

        {/* Sección de Eliminar Cuenta */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-blue-200">Eliminar cuenta</h2>
          <div className="bg-gray-100 dark:bg-gray-800/70 p-4 rounded-md mb-4 text-gray-600 dark:text-blue-200/80">
            <p>Una vez elimines tu cuenta, no hay vuelta atrás. Por favor, ten la certeza de que deseas hacerlo.</p>
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800 text-white py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/50 disabled:opacity-50"
          >
            {isDeleting ? 'Enviando...' : 'Eliminar tu cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
