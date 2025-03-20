"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PrivacySettings } from "@/src/app/components/PrivacySettings";
import { getUserPrivacySettings } from "@/lib/api";
import { redirect } from "next/navigation";
import { toast } from "react-hot-toast";

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
        <div className="max-w-2xl mx-auto bg-blue-900 p-6 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold mb-6 text-white">Configuración</h1>
          <div className="text-white">Cargando configuración...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-2xl mx-auto bg-blue-900 p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-white">Configuración</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-white">Privacidad</h2>
          <PrivacySettings initialSettings={settings} />
        </div>

        <div className="border-t border-blue-700 pt-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 text-white">Eliminar cuenta</h2>
          <div className="text-white mb-4">
            <p>Una vez elimines tu cuenta, no hay vuelta atrás. Por favor, ten la certeza de que deseas hacerlo.</p>
          </div>
          <button
            onClick={handleDeleteAccount}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition-colors"
          >
            {isDeleting ? 'Enviando...' : 'Eliminar tu cuenta'}
          </button>
        </div>
      </div>
    </div>
  );
}
