"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { PrivacySettings } from "@/src/app/components/PrivacySettings";
import { getUserPrivacySettings } from "@/lib/api";
import { redirect } from "next/navigation";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [settings, setSettings] = useState({
    showFavorites: true,
    showActivity: true,
  });
  const [loading, setLoading] = useState(true);

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
      </div>
    </div>
  );
}
