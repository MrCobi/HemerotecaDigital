"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export function MessageBadge() {
  const { data: session, status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  
  useEffect(() => {
    // Solo verificar mensajes no leídos si el usuario está autenticado
    if (status === "authenticated" && session?.user?.id) {
      const checkUnreadMessages = async () => {
        try {
          const res = await fetch('/api/messages/unread/count');
          if (res.ok) {
            const data = await res.json();
            setUnreadCount(data.count);
          }
        } catch (error) {
          console.error("Error al verificar mensajes no leídos:", error);
        }
      };
      
      // Verificar al cargar el componente
      checkUnreadMessages();
      
      // Configurar un intervalo para verificar periódicamente
      const interval = setInterval(checkUnreadMessages, 30000); // cada 30 segundos
      
      return () => clearInterval(interval);
    }
  }, [session, status]);
  
  // Si no hay mensajes no leídos o el usuario no está autenticado, no mostrar nada
  if (unreadCount === 0 || status !== "authenticated") {
    return null;
  }
  
  return (
    <span className="inline-flex items-center justify-center ml-1 w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}
