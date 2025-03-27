"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PrivacySettings } from "@/src/app/components/PrivacySettings";
import { getUserPrivacySettings } from "@/lib/api";
import { redirect } from "next/navigation";
import { toast } from "react-hot-toast";
import { ThemeSelector } from "@/src/app/components/ThemeSelector";

export default function SettingsPage() {
  const { data: session, status } = useSession();
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
        
        {/* Sección Tema */}
        <div className="mb-6">
          <h3 className="text-xl font-semibold mb-4 dark:text-white">Personalización</h3>
          <ThemeSelector />
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
