"use client";

import { useContext } from "react";
import { UnreadMessagesContext } from "@/src/app/contexts/UnreadMessagesContext";

export function MessageBadge() {
  const { unreadCount } = useContext(UnreadMessagesContext);
  
  // Si no hay mensajes no leídos, no mostrar nada
  if (unreadCount === 0) {
    return null;
  }
  
  return (
    <span className="inline-flex items-center justify-center ml-1 w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  );
}
