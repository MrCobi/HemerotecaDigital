"use client";

import { createContext, useState, useEffect, useCallback, useRef, useContext } from "react";
import { useSession } from "next-auth/react";

// Definir la interfaz del contexto
export interface UnreadMessagesContextType {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
}

// Crear el contexto con un valor inicial
export const UnreadMessagesContext = createContext<UnreadMessagesContextType>({
  unreadCount: 0,
  setUnreadCount: () => {}
});

// Proveedor del contexto
export function UnreadMessagesProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const sseRef = useRef<EventSource | null>(null);

  // Función para establecer la conexión SSE
  const setupSseConnection = useCallback(() => {
    if (status !== "authenticated" || !session?.user) return;

    // Cerrar conexión anterior si existe
    if (sseRef.current) {
      sseRef.current.close();
    }

    // Crear nueva conexión SSE
    const sse = new EventSource('/api/messages/unread/sse');

    // Manejar eventos
    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'initial' || data.type === 'update') {
          setUnreadCount(data.count);
        }
      } catch (error) {
        console.error('Error al procesar evento SSE:', error);
      }
    };

    // Manejar errores
    sse.onerror = () => {
      console.error('Error en la conexión SSE');
      sse.close();
      // Intentar reconectar después de 5 segundos
      setTimeout(setupSseConnection, 5000);
    };

    sseRef.current = sse;
  }, [status, session?.user]);

  // Inicializar el contador al cargar
  useEffect(() => {
    setupSseConnection();

    return () => {
      // Limpiar la conexión SSE al desmontar
      if (sseRef.current) {
        sseRef.current.close();
      }
    };
  }, [setupSseConnection]);

  return (
    <UnreadMessagesContext.Provider
      value={{
        unreadCount,
        setUnreadCount
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  );
}

// Exportar el hook para usar el contexto
export const useUnreadMessages = () => {
  const context = useContext(UnreadMessagesContext);
  if (!context) {
    throw new Error('useUnreadMessages debe ser usado dentro de un UnreadMessagesProvider');
  }
  return context;
};
