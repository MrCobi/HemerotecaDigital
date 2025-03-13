"use client";

import React, { createContext, useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

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
      const res = await fetch('/api/messages/unread/count');
      if (res.ok) {
        const data = await res.json();
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
      
      // Configurar un intervalo para actualizar periódicamente
      const interval = setInterval(updateUnreadCount, 30000); // cada 30 segundos
      
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
