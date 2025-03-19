"use client";

import React, { createContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { API_ROUTES } from "@/src/config/api-routes";

// Definir la interfaz del contexto
export interface UnreadMessagesContextType {
  unreadCount: number;
  updateUnreadCount: () => Promise<void>;
}

// Crear el contexto con un valor inicial
export const UnreadMessagesContext = createContext<UnreadMessagesContextType>({
  unreadCount: 0,
  updateUnreadCount: async () => {}
});

// Proveedor del contexto
export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  // Función para actualizar el contador de mensajes no leídos
  const updateUnreadCount = useCallback(async () => {
    if (status !== "authenticated" || !session?.user) return;

    try {
      // Agregar parámetro de tiempo para evitar caché
      const res = await fetch(`${API_ROUTES.messages.unreadCount}?t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        console.log(`Contador de mensajes no leídos actualizado: ${data.count}`);
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error("Error al obtener mensajes no leídos:", error);
    }
  }, [session, status]);

  // Actualizar el contador al cargar el componente y cuando cambie la sesión
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      updateUnreadCount();
      
      // Configurar un intervalo para actualizar más frecuentemente
      const interval = setInterval(updateUnreadCount, 15000); // cada 15 segundos
      
      return () => clearInterval(interval);
    }
  }, [session, status, updateUnreadCount]);

  return (
    <UnreadMessagesContext.Provider
      value={{
        unreadCount,
        updateUnreadCount
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}
