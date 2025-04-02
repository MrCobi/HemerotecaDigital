import { useEffect } from 'react';
import { useUnreadMessages } from '@/src/app/contexts/UnreadMessagesContext';

export const useConversationUpdates = (onUpdate: () => void) => {
  const { unreadCount } = useUnreadMessages();

  // Cuando cambie el contador de mensajes no leídos, actualizamos la lista
  useEffect(() => {
    // Si hay cambios en los mensajes no leídos, actualizamos la lista
    onUpdate();
  }, [unreadCount, onUpdate]);
};
