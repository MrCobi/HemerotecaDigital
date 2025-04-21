// src/app/messages/hooks/useChatContent.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Message, ConversationData, User } from '../types';
import useSocket from '@/src/hooks/useSocket';
import cuid from 'cuid';

const MESSAGE_PAGE_SIZE = 20;

// Tipos para payloads de mensajes
interface MessagePayload {
  conversationId: string;
  content: string;
  messageType: 'text';
  senderId: string;
}

interface ImageMessagePayload {
  conversationId: string;
  content: string;
  mediaUrl: string;
  messageType: 'image';
  senderId: string;
  tempId: string;
}

// Extender el tipo Window para incluir nuestras propiedades personalizadas
declare global {
  interface Window {
    __invalidConversationsCache?: Record<string, boolean>;
    // Para ParticipantRemovalBlock, definido en GroupManagementModal
    __lastParticipantRemoval?: {
      [userId: string]: {
        groupId: string;
        timestamp: number;
      }
    };
  }
}

/**
 * Hook personalizado para gestionar el contenido de chat
 * Encapsula la lógica de mensajes, socket, y estado de la conversación
 */
export function useChatContent(
  conversation: ConversationData | null,
  conversationId: string | null,
) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [page, setPage] = useState(1);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [imageToSend, setImageToSend] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [participants, setParticipants] = useState<User[]>([]);
  const [hasMutualFollow, setHasMutualFollow] = useState<boolean | null>(null);
  const firstLoadRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const readStatusRef = useRef<Record<string, boolean>>({});
  const failedMarkReadAttempts = useRef<Record<string, boolean>>({});
  const failedMessageMarkReadAttempts = useRef<Record<string, boolean>>({});

  // Función para actualizar las URL temporales por las finales
  const updateMediaUrlInMessage = useCallback((tempId: string, mediaUrl: string) => {
    console.log(`Actualizando mensaje temporal ${tempId} con URL real:`, mediaUrl);
    setMessages(prev => prev.map(msg => {
      if (msg.id === tempId || msg.tempId === tempId) {
        return { 
          ...msg, 
          mediaUrl,
          status: 'sent'
        };
      }
      return msg;
    }));
  }, []);

  // Función para desplazarse al final de los mensajes
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesEndRef]);

  // Marcar conversación como leída
  const markConversationAsRead = useCallback(async (conversationIdToMark: string) => {
    if (!conversationIdToMark || !session?.user?.id) return;
    
    // Evitar intentos repetidos para conversaciones que ya fallaron
    if (failedMarkReadAttempts.current[conversationIdToMark]) {
      console.log(`Omitiendo intento de marcar como leído para ${conversationIdToMark} debido a fallo previo`);
      return;
    }
    
    try {
      const response = await fetch(`/api/messages/read/${conversationIdToMark}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      
      if (response.ok) {
        // Actualizar estado local
        if (readStatusRef.current) {
          readStatusRef.current[conversationIdToMark] = true;
        }
        // Si había un error previo, eliminarlo
        localStorage.removeItem(`chat_access_error_${conversationIdToMark}`);
      } else if (response.status === 403) {
        // Si recibimos un 403, significa que el usuario no tiene permisos
        // Guardamos esta conversación para no intentar marcarla como leída nuevamente
        console.log(`No se tienen permisos para marcar como leído: ${conversationIdToMark}`);
        failedMarkReadAttempts.current[conversationIdToMark] = true;
        
        // También guardar en localStorage para que otros componentes puedan detectarlo
        try {
          const _errorData = await response.json();
          const errorMessage = _errorData.error || "No tienes permisos para acceder a esta conversación";
          localStorage.setItem(`chat_access_error_${conversationIdToMark}`, errorMessage);
        } catch  {
          localStorage.setItem(`chat_access_error_${conversationIdToMark}`, "No tienes permisos para acceder a esta conversación");
        }
      }
    } catch (error) {
      console.error('Error al marcar conversación como leída:', error);
    }
  }, [session?.user?.id]);

  // Marcar un mensaje específico como leído
  const _markMessageAsRead = useCallback(async (messageId: string) => {
    if (!messageId || !conversationId || !session?.user?.id) return;
    
    // Evitar intentos repetidos para mensajes que ya fallaron
    if (failedMessageMarkReadAttempts.current[messageId]) {
      console.log(`Omitiendo intento de marcar mensaje como leído para ${messageId} debido a fallo previo`);
      return;
    }
    
    try {
      // Usar el nuevo endpoint messages/read/message?messageId=XXX
      const response = await fetch(`/api/messages/read/message?messageId=${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      
      if (response.ok) {
        // Actualizar estado local si es necesario
        console.log(`[useChatContent] Mensaje ${messageId} marcado como leído`);
        // Si había un error previo, eliminarlo
        if (conversationId) {
          localStorage.removeItem(`chat_access_error_${conversationId}`);
        }
        
        // Actualizar el estado local también
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (msg.id === messageId && !msg.read) {
              return { ...msg, read: true };
            }
            return msg;
          })
        );
      } else if (response.status === 403) {
        // Si recibimos un 403, significa que el usuario no tiene permisos
        // Guardamos este mensaje para no intentar marcarlo como leído nuevamente
        console.log(`No se tienen permisos para marcar el mensaje como leído: ${messageId}`);
        failedMessageMarkReadAttempts.current[messageId] = true;
        
        // También guardar en localStorage para que otros componentes puedan detectarlo
        if (conversationId) {
          try {
            const _errorData = await response.json();
            const errorMessage = _errorData.error || "No tienes permisos para acceder a esta conversación";
            localStorage.setItem(`chat_access_error_${conversationId}`, errorMessage);
          } catch {
            localStorage.setItem(`chat_access_error_${conversationId}`, "No tienes permisos para acceder a esta conversación");
          }
        }
      }
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
    }
  }, [conversationId, session?.user?.id]);

  // Marcar todas los mensajes no leídos como leídos
  const markAllMessagesAsRead = useCallback(async () => {
    if (!conversationId || !session?.user?.id || !messages.length) return;
    
    console.log(`[useChatContent] Marcando todos los mensajes como leídos en conversación: ${conversationId}`);
    
    try {
      // Primero intentamos marcar toda la conversación como leída
      await markConversationAsRead(conversationId);
      
      // Además, marcamos individualmente los mensajes no leídos que no son del usuario actual
      // Esto es importante especialmente para grupos
      const unreadMessages = messages.filter(
        msg => !msg.read && msg.senderId !== session.user?.id
      );
      
      if (unreadMessages.length > 0) {
        console.log(`[useChatContent] Marcando ${unreadMessages.length} mensajes individuales como leídos`);
        
        // Marcamos los mensajes en paralelo
        await Promise.all(
          unreadMessages.map(msg => 
            msg.id ? _markMessageAsRead(msg.id) : Promise.resolve()
          )
        );
        
        // Actualizamos el estado local de los mensajes
        setMessages(prevMessages => 
          prevMessages.map(msg => {
            if (!msg.read && msg.senderId !== session.user?.id) {
              return { ...msg, read: true };
            }
            return msg;
          })
        );
      }
    } catch (error) {
      console.error('[useChatContent] Error al marcar mensajes como leídos:', error);
    }
  }, [conversationId, session?.user?.id, messages, markConversationAsRead, _markMessageAsRead]);

  // Auto-marcar mensajes como leídos cuando la conversación cambia o se carga
  useEffect(() => {
    if (conversationId && messages.length > 0 && !loading) {
      markAllMessagesAsRead();
    }
  }, [conversationId, messages.length, loading, markAllMessagesAsRead]);

  // Marcar mensajes como leídos cuando llegan nuevos
  const markNewMessageAsRead = useCallback((messageId: string, senderId: string) => {
    // Solo marcar mensajes de otros usuarios y si estamos en la misma conversación
    if (senderId !== session?.user?.id && messageId) {
      _markMessageAsRead(messageId);
    }
  }, [_markMessageAsRead, session?.user?.id]);

  // Función auxiliar para determinar si se debe actualizar el estado del mensaje
  // Eliminar el estado 'read' para evitar duplicaciones
  const shouldUpdateStatus = useCallback((currentStatus?: string, newStatus?: string) => {
    if (!newStatus) return false;
    if (!currentStatus) return true;
    
    // Ignorar actualizaciones a estado 'read' para evitar duplicaciones
    if (newStatus === 'read') return false;
    
    const statusPriority: Record<string, number> = {
      'sending': 1,
      'sent': 2,
      'delivered': 3,
      // 'read': 4, -- Eliminado para evitar duplicaciones
      'failed': 0
    };
    
    // Solo actualizar si el nuevo estado tiene mayor prioridad
    return (statusPriority[newStatus] || 0) > (statusPriority[currentStatus] || 0);
  }, []);

  // Registro de mensajes procesados para evitar duplicaciones - Cambiamos a un Map para guardar también timestamp
  const processedMessagesRef = useRef<Map<string, number>>(new Map());
  
  // Función para añadir un nuevo mensaje a la lista
  const addNewMessage = useCallback((newMessage: Message) => {
    // Verificación mejorada de duplicados
    if (newMessage.id && processedMessagesRef.current.has(newMessage.id)) {
      console.log(`[useChatContent] Ignorando mensaje duplicado con ID: ${newMessage.id}`);
      return; // No procesar el mismo mensaje dos veces
    }
    
    if (newMessage.id) {
      // Registrar este ID con timestamp para mejor manejo de duplicados
      processedMessagesRef.current.set(newMessage.id, Date.now());
      
      // Limpieza de mensajes procesados más antiguos que 5 minutos para evitar crecimiento excesivo
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      processedMessagesRef.current.forEach((timestamp, msgId) => {
        if (timestamp < fiveMinutesAgo) {
          processedMessagesRef.current.delete(msgId);
        }
      });
    }
    
    console.log('[useChatContent] Añadiendo mensaje:', newMessage);
    console.log('[useChatContent] Tipo de mensaje:', newMessage.messageType);
    console.log('[useChatContent] ConversationId del mensaje:', newMessage.conversationId);
    console.log('[useChatContent] ConversationId actual:', conversation?.id);
    
    setMessages(prevMessages => {
      // Verificar si ya existe un mensaje con el mismo ID
      const existingIndex = prevMessages.findIndex(msg => msg.id === newMessage.id);
      
      // Verificar si existe un mensaje temporal que corresponda a este mensaje
      const tempIndex = prevMessages.findIndex(msg => 
        msg.id === newMessage.tempId || (msg.tempId && msg.tempId === newMessage.tempId)
      );
      
      console.log('[useChatContent] Actualización de estado - existingIndex:', existingIndex, 'tempIndex:', tempIndex);
      

      
      // Si ya existe un mensaje con este ID, no lo añadimos de nuevo
      if (existingIndex !== -1) {
        // Solo actualizamos algunos campos específicos si es necesario
        const updatedMessages = [...prevMessages];
        
        // Solo actualizamos el estado si el nuevo tiene un estado más "avanzado"
        // Evitamos actualizar a estado 'read' para prevenir duplicaciones
        const currentStatus = prevMessages[existingIndex].status;
        const newStatus = newMessage.status;
        
        // Ignorar actualizaciones a estado 'read' en la UI, para evitar duplicaciones
        // En lugar de ignorar completamente, actualizamos el estado del mensaje existente sin crear uno nuevo
        if (newStatus === 'read') {
          console.log('[useChatContent] Actualizando estado a "read" sin crear duplicado');
          updatedMessages[existingIndex] = {
            ...updatedMessages[existingIndex],
            read: true  // Marcar como leído pero mantener el mismo objeto de mensaje
          };
          return updatedMessages;
        }
        
        if (shouldUpdateStatus(currentStatus, newStatus)) {
          updatedMessages[existingIndex] = {
            ...updatedMessages[existingIndex],
            status: newStatus,
            // Ya no actualizamos la propiedad 'read'
          };
          console.log('[useChatContent] Actualizado estado de mensaje:', updatedMessages[existingIndex]);
        }
        
        return updatedMessages;
      }
      
      // Si hay un mensaje temporal que corresponde a este, lo reemplazamos
      if (tempIndex !== -1) {
        const updatedMessages = [...prevMessages];
        
        console.log('[useChatContent] addNewMessage - mensaje existente:', true, 'tempId:', prevMessages[tempIndex].tempId, 'id:', newMessage.id);
        console.log('[useChatContent] Mensajes actuales:', prevMessages.length);
        
        // Actualizar el mensaje temporal con los datos del mensaje real
        updatedMessages[tempIndex] = {
          ...newMessage,
          tempId: prevMessages[tempIndex].tempId // Mantener el tempId para referencia
        };
        
        console.log('[useChatContent] Mensaje actualizado:', updatedMessages[tempIndex]);
        return updatedMessages;
      }
      
      // Si es un mensaje completamente nuevo, lo añadimos
      console.log('[useChatContent] addNewMessage - mensaje existente:', false, 'tempId:', newMessage.tempId, 'id:', newMessage.id);
      console.log('[useChatContent] Mensajes actuales:', prevMessages.length);
      
      // Crear un nuevo mensaje procesado
      const processedMessage: Message = {
        ...newMessage,
        createdAt: newMessage.createdAt || new Date().toISOString(),
      };
      
      console.log('[useChatContent] Nuevo mensaje creado:', processedMessage);
      
      // Devolver una nueva lista con el mensaje añadido
      return [...prevMessages, processedMessage];
    });
    
    // Reproducir el sonido de notificación si es un mensaje entrante
    if (newMessage.senderId !== session?.user?.id) {
      // playMessageSound();
    }
    
    // Marcar la conversación como leída localmente
    // setConversation(prev => prev ? { ...prev, unreadCount: 0 } : null);
    
    // Desplazarse al final del chat
    if (scrollToBottom) {
      setTimeout(scrollToBottom, 100);
    }
  }, [conversation?.id, session?.user?.id, scrollToBottom, shouldUpdateStatus]);

  // Registro de mensajes recibidos para evitar procesarlos dos veces
  const receivedMessageIdsRef = useRef<Set<string>>(new Set());
  
  // Manejar nuevo mensaje recibido
  const handleNewMessage = useCallback((message: Message) => {
    // Verificación para evitar procesar el mismo mensaje dos veces
    if (message.id && receivedMessageIdsRef.current.has(message.id)) {
      console.log(`[useChatContent] Ignorando mensaje ya recibido: ${message.id}`);
      return;
    }
    
    // Registrar este mensaje como procesado
    if (message.id) {
      receivedMessageIdsRef.current.add(message.id);
    }
    
    console.log('[useChatContent] Recibido nuevo mensaje:', message);
    
    // Verificar si el mensaje pertenece a la conversación actual
    const currentConvId = conversation?.id;
    const messageConvId = message.conversationId;
    
    console.log('[useChatContent] Conversación actual:', currentConvId);
    console.log('[useChatContent] Conversación del mensaje:', messageConvId);
    
    if (!currentConvId || !messageConvId) return;
    
    // Normalizar IDs para compararlos correctamente - MEJORADO
    // Eliminar cualquier prefijo (group_, conv_) y asegurar que ambos son strings
    const normalizedConversationId = (conversationId || '').replace(/^(group_|conv_)/, '');
    const normalizedMessageConversationId = (messageConvId || '').replace(/^(group_|conv_)/, '');
    
    console.log('[useChatContent] IDs normalizados - Actual:', normalizedConversationId, 'Mensaje:', normalizedMessageConversationId);
    
    // Verificar coincidencia exacta tras normalización
    const belongsToCurrentConversation = normalizedConversationId === normalizedMessageConversationId;
    
    console.log('[useChatContent] ¿Coinciden?', belongsToCurrentConversation);
    
    if (belongsToCurrentConversation) {
      console.log('[useChatContent] El mensaje pertenece a esta conversación, añadiendo...');
      addNewMessage(message);
    } else {
      console.log('[useChatContent] El mensaje NO pertenece a esta conversación, ignorando');
    }
  }, [conversation, addNewMessage, conversationId]);



  // Cargar mensajes
  const fetchMessages = useCallback(async () => {
    if (!conversationId || !session?.user?.id || loadingMoreRef.current) return;
    
    const pageToLoad = firstLoadRef.current ? 1 : page;
    if (firstLoadRef.current) {
      setPage(1);
      setHasMoreMessages(true);
    }
    
    try {
      setLoading(true);
      loadingMoreRef.current = true;
      
      const response = await fetch(`/api/messages?with=${conversationId}&page=${pageToLoad}&limit=${MESSAGE_PAGE_SIZE}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const _errorData = await response.json().catch(() => ({}));
        
        // Manejar errores específicos según el código de estado
        if (response.status === 404) {
          console.log(`[useChatContent] Conversación no encontrada: ${conversationId}. Puede que haya sido eliminada.`);
          
          // Añadir a la lista negra para evitar futuros intentos
          if (window.__invalidConversationsCache && conversationId) {
            window.__invalidConversationsCache[conversationId] = true;
            console.log(`[useChatContent] Añadida conversación a lista negra: ${conversationId}`);
          }
          
          // Emitir un evento para notificar que esta conversación ya no existe
          // Esto permitirá que otros componentes (como page.tsx) reaccionen a la eliminación
          const deleteEvent = new CustomEvent('conversation-deleted', {
            detail: {
              conversationId,
              reason: 'not_found'
            }
          });
          window.dispatchEvent(deleteEvent);
          
          // Establecer un error más explicativo
          setError('Esta conversación ya no está disponible.');
          throw new Error('Conversación no encontrada');
        } else if (response.status === 403) {
          console.log(`[useChatContent] Sin acceso a la conversación: ${conversationId}`);
          
          // También añadir a lista negra - sin acceso es permanente
          if (window.__invalidConversationsCache && conversationId) {
            window.__invalidConversationsCache[conversationId] = true;
            console.log(`[useChatContent] Añadida conversación sin acceso a lista negra: ${conversationId}`);
          }
          
          // También emitir un evento similar para conversaciones sin acceso
          const accessEvent = new CustomEvent('conversation-access-denied', {
            detail: {
              conversationId,
              reason: 'forbidden'
            }
          });
          window.dispatchEvent(accessEvent);
          
          setError('No tienes permiso para acceder a esta conversación.');
          throw new Error('Acceso denegado a la conversación');
        }
        
        throw new Error('Error al cargar mensajes');
      }
      
      const data = await response.json();
      
      // Verificar si hay más mensajes para cargar
      if (data.messages.length < MESSAGE_PAGE_SIZE) {
        setHasMoreMessages(false);
      }
      
      // Si es la primera carga, reemplazar mensajes
      if (firstLoadRef.current) {
        setMessages(data.messages);
        firstLoadRef.current = false;
        
        // Después de cargar, marcar como leído (solo si no está ya marcada)
        if (!readStatusRef.current || !readStatusRef.current[conversationId]) {
          markConversationAsRead(conversationId);
        }
      } else {
        // Sino, agregar al principio (son mensajes más antiguos)
        setMessages(prevMessages => [...data.messages, ...prevMessages]);
      }
      
      if (pageToLoad === 1) {
        scrollToBottom();
      }
      
      if (pageToLoad > 1) {
        setPage(pageToLoad + 1);
      } else {
        setPage(2); // Siguiente página a cargar
      }
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      setError('No se pudieron cargar los mensajes. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, [conversationId, session?.user?.id, page, scrollToBottom, markConversationAsRead]);

  // Cargar participantes de la conversación
  const fetchParticipants = useCallback(async () => {
    if (!conversationId || !session?.user?.id) return;
    
    try {
      // Usar los participantes de la propia conversación si están disponibles
      if (conversation && conversation.participants) {
        setParticipants(conversation.participants);
        return;
      }
      
      // Si no hay conversación o no tiene participantes, intentar cargarlos desde la API de mensajes
      const response = await fetch(`/api/messages?with=${conversationId}&page=1&limit=1`);
      
      if (!response.ok) {
        throw new Error('Error al cargar participantes');
      }
      
      const data = await response.json();
      if (data.conversation && data.conversation.participants) {
        setParticipants(data.conversation.participants);
      }
    } catch (error) {
      console.error('Error al cargar participantes:', error);
    }
  }, [conversationId, session?.user?.id, conversation]);

  // Función para comprobar si existe seguimiento mutuo
  const checkMutualFollow = useCallback(async () => {
    console.log(`[useChatContent] Iniciando checkMutualFollow:`, {
      conversationId,
      userId: session?.user?.id,
      isPrivate: conversationId?.startsWith('conv_'),
      participantsCount: participants?.length || 0
    });
    
    if (!conversationId || !session?.user?.id) {
      console.log('[useChatContent] No hay conversationId o userId, cancelando checkMutualFollow');
      return;
    }
    
    // Verificar si es una conversación privada basado en el ID
    const isPrivateConversation = conversationId?.startsWith('conv_');
    if (!isPrivateConversation) {
      // Si no es una conversación privada, no se requiere seguimiento mutuo
      console.log('[useChatContent] No es conversación privada (ID no comienza con conv_), estableciendo hasMutualFollow=true');
      setHasMutualFollow(true);
      return;
    }
    
    try {
      // Necesitamos cargar directamente desde la base de datos
      console.log('[useChatContent] Cargando información de los participantes para la conversación:', conversationId);
      
      // Llamar directamente a una API para obtener los participantes de la conversación
      const participantsResponse = await fetch(`/api/messages/conversation-participants?conversationId=${conversationId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      
      if (!participantsResponse.ok) {
        console.error('[useChatContent] Error al cargar participantes de la conversación:', participantsResponse.statusText);
        return;
      }
      
      const participantsData = await participantsResponse.json();
      console.log('[useChatContent] Datos de participantes obtenidos:', participantsData);
      
      // Encontrar el participante que no es el usuario actual
      const currentUserId = session.user?.id;
      const otherParticipant = participantsData.participants?.find(
        (p: { userId: string }) => p.userId !== currentUserId
      );
      
      if (!otherParticipant) {
        console.error('[useChatContent] No se encontró al otro participante en esta conversación');
        return;
      }
      
      const otherUserId = otherParticipant.userId;
      console.log('[useChatContent] ID del otro usuario encontrado:', otherUserId);
      
      // Log detallado para depuración
      console.log(`[useChatContent] Datos para verificación de seguimiento mutuo:`, {
        currentUserId: session.user?.id,
        otherUserId
      });
      
      // Llamar al endpoint correcto para verificar el seguimiento mutuo
      console.log(`[useChatContent] Verificando seguimiento mutuo con usuario: ${otherUserId}`);
      const response = await fetch(`/api/relationships/check-mutual?userId=${otherUserId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[useChatContent] Resultado verificación seguimiento mutuo:`, data);
        setHasMutualFollow(data.mutualFollow);
      } else {
        console.error('[useChatContent] Error al verificar seguimiento mutuo:', response.status);
        setHasMutualFollow(false);
      }
    } catch (error) {
      console.error('[useChatContent] Error al verificar seguimiento mutuo:', error);
      setHasMutualFollow(false);
    }
  }, [conversationId, session?.user?.id, participants]);

  // Socket para mensajes en tiempo real
  const { 
    connected, 
    sendMessage, 
    joinConversation, 
    leaveConversation 
  } = useSocket({
    userId: session?.user?.id,
    username: session?.user?.name || session?.user?.username || 'Usuario',
    onNewMessage: (message) => {
      console.log('[useChatContent] Recibido nuevo mensaje:', message);
      console.log('[useChatContent] Conversación actual:', conversationId);
      console.log('[useChatContent] Conversación del mensaje:', message.conversationId);
      
      // Normalizar los IDs para compararlos correctamente - MEJORADO
      // Eliminar cualquier prefijo (group_, conv_) y asegurar que ambos son strings
      const normalizedConversationId = (conversationId || '').replace(/^(group_|conv_)/, '');
      const normalizedMessageConversationId = (message.conversationId || '').replace(/^(group_|conv_)/, '');
      
      console.log('[useChatContent] IDs normalizados - Actual:', normalizedConversationId, 'Mensaje:', normalizedMessageConversationId);
      
      // Verificar coincidencia exacta tras normalización
      const belongsToCurrentConversation = normalizedConversationId === normalizedMessageConversationId;
      
      console.log('[useChatContent] ¿Coinciden?', belongsToCurrentConversation);
      
      if (belongsToCurrentConversation) {
        console.log('[useChatContent] El mensaje pertenece a esta conversación, añadiendo...');
        handleNewMessage(message);
      } else {
        console.log('[useChatContent] El mensaje NO pertenece a esta conversación, ignorando');
      }
    },
    // El servidor ahora envía message_ack con tempId incluido
    onMessageStatus: (status: { messageId: string; status: string; tempId?: string }) => {
      console.log('[useChatContent] Recibido status update:', status);
      if (status.tempId) {
        // SOLUCIÓN MEJORADA: Actualizar el estado de un mensaje temporal cuando llega su confirmación
        setMessages(prevMessages => {
          // Primero verificar si el mensaje ya existe con el messageId (puede haber duplicados)
          const existingMessageIndex = prevMessages.findIndex(m => m.id === status.messageId);
          const tempMessageIndex = prevMessages.findIndex(m => 
            m.id === status.tempId || (m.tempId && m.tempId === status.tempId)
          );
          
          console.log(`[useChatContent] Actualización de estado - existingIndex: ${existingMessageIndex}, tempIndex: ${tempMessageIndex}`);
          
          // Si ya existe un mensaje con el ID final y también tenemos un mensaje temporal
          if (existingMessageIndex !== -1 && tempMessageIndex !== -1 && existingMessageIndex !== tempMessageIndex) {
            // MEJORA: Si ambos existen, SIEMPRE eliminar el mensaje con ID temporal
            // y mantener solo el permanente (evita duplicados en la UI)
            console.log(`[useChatContent] Eliminando mensaje temporal duplicado y conservando el permanente`);
            const updatedMessages = [...prevMessages];
            
            // Conservar cualquier atributo importante del mensaje temporal que pudiera faltar en el permanente
            const tempMessage = updatedMessages[tempMessageIndex];
            const permanentMessage = updatedMessages[existingMessageIndex];
            
            // Crear un mensaje actualizado combinando ambos
            const mergedMessage = {
              ...tempMessage,
              ...permanentMessage,
              id: status.messageId, // Asegurar ID permanente
              status: status.status as Message['status'], // Actualizar estado
              tempId: undefined // Eliminar referencia temporal
            };
            
            // Eliminar mensaje temporal
            updatedMessages.splice(tempMessageIndex, 1);
            
            // Actualizar mensaje permanente con la versión combinada
            updatedMessages[existingMessageIndex < tempMessageIndex ? existingMessageIndex : existingMessageIndex - 1] = mergedMessage;
            
            return updatedMessages;
          }
          
          // Si solo tenemos el mensaje temporal, actualizarlo con el ID confirmado
          if (tempMessageIndex !== -1) {
            console.log(`[useChatContent] Actualizando mensaje temporal a confirmado`);
            const updatedMessages = [...prevMessages];
            updatedMessages[tempMessageIndex] = {
              ...updatedMessages[tempMessageIndex],
              id: status.messageId,
              status: status.status as Message['status'],
              tempId: undefined // Eliminar completamente el tempId para evitar problemas futuros
            };
            return updatedMessages;
          }
          
          // Si solo tenemos el mensaje con ID confirmado, actualizar su estado
          if (existingMessageIndex !== -1) {
            console.log(`[useChatContent] Actualizando estado de mensaje existente`);
            const updatedMessages = [...prevMessages];
            updatedMessages[existingMessageIndex] = {
              ...updatedMessages[existingMessageIndex],
              status: status.status as Message['status']
            };
            return updatedMessages;
          }
          
          // Si ninguno de los casos anteriores, mantener los mensajes sin cambios
          return prevMessages;
        });
      } else if (status.messageId) {
        // Este es un caso para actualizaciones de estado sin tempId (ej: marcado como leído)
        setMessages(prevMessages => {
          const messageIndex = prevMessages.findIndex(m => m.id === status.messageId);
          if (messageIndex === -1) return prevMessages;
          
          console.log(`[useChatContent] Actualizando estado de mensaje directo (sin tempId)`);
          const updatedMessages = [...prevMessages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            status: status.status as Message['status']
          };
          return updatedMessages;
        });
      }
    }
  });

  // Efecto para unirse/salir de la conversación
  useEffect(() => {
    // Lista negra de conversaciones inválidas/eliminadas para evitar
    // intentos repetidos de cargar conversaciones que sabemos que ya no existen
    const invalidConversationsCache = window.__invalidConversationsCache || (window.__invalidConversationsCache = {});
    
    // Si la conversación está en la lista negra, no intentar cargarla
    if (conversationId && invalidConversationsCache[conversationId]) {
      console.log(`[useChatContent] Evitando intentar cargar conversación inválida conocida: ${conversationId}`);
      setError('Esta conversación ya no está disponible o ha sido eliminada.');
      
      // Emitir el evento para que la UI pueda responder adecuadamente
      const deleteEvent = new CustomEvent('conversation-deleted', {
        detail: {
          conversationId,
          reason: 'blacklisted'
        }
      });
      window.dispatchEvent(deleteEvent);
      
      // No continuar con la lógica de unirse/cargar
      return;
    }
    
    if (conversationId && connected && session?.user?.id) {
      console.log(`[useChatContent] Uniendo a conversación: ${conversationId}`);
      // Usar un ID estable para evitar reconexiones innecesarias
      const stableConversationId = conversationId;
      
      // Unirse a la conversación
      joinConversation(stableConversationId);
      
      // Ya no cargamos los mensajes aquí para evitar duplicados
      // fetchMessages se llamará desde el segundo useEffect
      
      // Obtener participantes si es necesario
      if (!participants || participants.length === 0) {
        fetchParticipants();
      }
      
      // Verificar si hay seguimiento mutuo (solo para conversaciones privadas)
      console.log(`[useChatContent] Verificando tipo de conversación:`, {
        conversationId,
        isGroup: conversation?.isGroup,
        isConvIdPrivate: conversationId?.startsWith('conv_'),
        isConvIdGroup: conversationId?.startsWith('group_'),
        participantsCount: participants?.length || 0,
        userId: session?.user?.id
      });
      
      // Determinar si es una conversación privada basado en el formato del ID
      const isPrivateConversation = conversationId?.startsWith('conv_');
      console.log(`[useChatContent] ¿Es conversación privada? ${isPrivateConversation}`);
      
      if (isPrivateConversation) {
        console.log(`[useChatContent] Conversación privada detectada por ID, iniciando verificación de seguimiento mutuo`);
        checkMutualFollow();
      } else {
        // Para conversaciones grupales, siempre permitir mensajes
        console.log(`[useChatContent] Conversación grupal (ID no comienza con conv_), estableciendo hasMutualFollow=true`);
        setHasMutualFollow(true);
      }
      
      // Limpiar al desmontar
      return () => {
        console.log(`[useChatContent] Saliendo de conversación: ${stableConversationId}`);
        leaveConversation(stableConversationId);
      };
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, connected, session?.user?.id]);

  // Control de carga único por conversación para prevenir cargas dobles
  const loadedConversationsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!conversationId || !session?.user?.id) return;
    
    // Prevenir cargas duplicadas verificando si ya se cargó esta conversación
    const isAlreadyLoaded = loadedConversationsRef.current.has(conversationId);
    console.log(`[useChatContent] Verificando carga de conversación ${conversationId} - Ya cargada: ${isAlreadyLoaded}, Mensajes actuales: ${messages.length}`);

    // Reiniciar el estado cuando cambia la conversación
    if (!isAlreadyLoaded) {
      // Limpiar mensajes anteriores al cambiar de conversación
      setMessages([]);
      setLoading(true);
      firstLoadRef.current = true;
      console.log(`[useChatContent] Nueva conversación ${conversationId} - Iniciando carga inicial`);
    }
    
    // Evitar múltiples cargas
    const controller = new AbortController();
    const loadData = async () => {
      try {
        if (!readStatusRef.current) readStatusRef.current = {};
        
        // Solo cargar mensajes si:
        // 1. No hemos cargado antes esta conversación O
        // 2. La conversación cambió y necesitamos nuevos mensajes
        if (!isAlreadyLoaded || messages.length === 0) {
          console.log(`[useChatContent] Cargando mensajes para conversación ${conversationId}`);
          await fetchMessages();
          // Marcar esta conversación como cargada después de completar fetchMessages
          loadedConversationsRef.current.add(conversationId);
        } else {
          console.log(`[useChatContent] Omitiendo carga de mensajes para conversación ${conversationId} - Ya cargada`);
        }
        
        // Solo cargar participantes si es necesario
        if (!readStatusRef.current[conversationId]) {
          await fetchParticipants();
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error cargando datos:', error);
        }
      } finally {
        setLoading(false);
      }
    };
    
    // Usar un pequeño timeout para evitar cargas repetidas
    const timeoutId = setTimeout(() => {
      loadData();
    }, 100);
    
    // Limpiar estado
    setNewMessageContent('');
    setImageToSend(null);
    setImagePreview('');
    setUploadProgress(0);
    
    return () => {
      clearTimeout(timeoutId);
      controller.abort();
      // No limpiamos el readStatusRef para mantener el cache entre cambios
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, session?.user?.id]);

  // Enviar mensaje de texto
  const sendTextMessage = useCallback(async () => {
    if (!conversationId || !session?.user?.id || !newMessageContent.trim()) return;
    
    // Verificar si hay seguimiento mutuo para conversaciones privadas
    if (conversation?.type === 'private' && hasMutualFollow === false) {
      console.log('[useChatContent] No se puede enviar mensaje: no hay seguimiento mutuo');
      return;
    }
    
    try {
      setSendingMessage(true);
      
      // Crear objeto de mensaje temporal para UI
      const tempMessage: Message = {
        id: `temp-${Date.now()}`,
        content: newMessageContent,
        createdAt: new Date(),
        read: true,
        senderId: session.user.id,
        sender: {
          id: session.user.id,
          username: session.user.name || session.user.username || 'Usuario',
          image: session.user.image || null
        },
        messageType: 'text'
      } as Message; // Forzar el tipo para evitar problemas de tipado
      
      // Añadir mensaje temporalmente a la lista
      setMessages(prev => [...prev, tempMessage]);
      
      // Limpiar entrada de texto
      setNewMessageContent('');
      
      // Enviar mensaje por socket
      if (connected) {
        await sendMessage({
          conversationId,
          content: newMessageContent,
          messageType: 'text',
          senderId: session.user.id
        } as MessagePayload); // Usar un tipo más específico en lugar de any
      } else {
        // Fallback si no hay conexión socket
        await fetch(`/api/messages/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: newMessageContent, messageType: 'text' })
        });
      }
      
      // Desplazar al final después de enviar
      scrollToBottom();
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Eliminar mensaje temporal en caso de error
      setMessages(prev => prev.filter(msg => msg.id !== `temp-${Date.now()}`));
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, session?.user, newMessageContent, connected, sendMessage, scrollToBottom, hasMutualFollow, conversation?.type]);

  // Enviar mensaje de imagen
  const sendImageMessage = useCallback(async (file: File) => {
    if (!file || !session?.user?.id) return;
    
    // Verificar si hay seguimiento mutuo para conversaciones privadas
    if (conversation?.type === 'private' && hasMutualFollow === false) {
      setError('No puedes enviar mensajes a este usuario hasta que os sigáis mutuamente');
      return;
    }

    setSendingMessage(true);
    const tempId = `temp-${cuid()}`;
    
    try {
      // Crear una URL temporal para mostrar la imagen durante la carga
      const tempImageUrl = URL.createObjectURL(file);
      
      // Crear mensaje temporal con fecha válida y tipos correctos
      const tempMessage: Message = {
        id: tempId,
        content: '',
        mediaUrl: tempImageUrl,
        messageType: 'image',
        senderId: session.user.id,
        conversationId: conversationId,
        createdAt: new Date().toISOString(),
        status: 'sending',
        tempId
      } as Message; // Forzar el tipo para evitar problemas de tipado
      
      // Añadir mensaje temporal a la lista
      setMessages(prev => [...prev, tempMessage]);
      
      // Crear FormData para la imagen
      const formData = new FormData();
      formData.append('file', file);
      
      // Subir imagen a Cloudinary a través de nuestra API de mensajes
      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!uploadResponse || !uploadResponse.ok) {
        throw new Error('Error al subir imagen');
      }
      
      const { url: cloudinaryUrl } = await uploadResponse.json();
      
      if (!cloudinaryUrl) {
        throw new Error('No se recibió URL de imagen');
      }
      
      // Actualizar mensaje temporal con la URL real de Cloudinary
      updateMediaUrlInMessage(tempId, cloudinaryUrl);
      
      // Enviar mensaje por socket o API REST
      if (connected) {
        await sendMessage({
          conversationId,
          content: '',
          mediaUrl: cloudinaryUrl,
          messageType: 'image',
          senderId: session.user.id,
          tempId
        } as ImageMessagePayload); // Usar un tipo más específico en lugar de any
      } else {
        // Fallback si no hay conexión socket
        const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '',
            mediaUrl: cloudinaryUrl,
            messageType: 'image',
            tempId
          })
        });
        
        if (!response.ok) {
          throw new Error('Error al enviar mensaje de imagen');
        }
        
        const savedMessage = await response.json();
        
        // Actualizar el mensaje temporal con los datos del mensaje guardado
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { 
                ...savedMessage,
                mediaUrl: cloudinaryUrl, // Asegurar que mediaUrl esté presente
                status: 'sent',
                createdAt: savedMessage.createdAt || new Date().toISOString()
              } 
            : msg
        ));
        
        console.log('Respuesta del servidor (fallback HTTP):', savedMessage);
      }
      
      // Limpiar estado de imagen
      setImageToSend(null);
      setImagePreview('');
      setUploadProgress(0);
      
      // Desplazar al final
      scrollToBottom();
      
    } catch (error) {
      console.error('Error sending image:', error);
      // Eliminar mensaje temporal en caso de error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setError('Error al enviar la imagen');
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, session?.user?.id, connected, sendMessage, scrollToBottom, hasMutualFollow, updateMediaUrlInMessage, conversation?.type]);

  // Enviar mensaje de voz
  const sendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    if (!conversationId || !session?.user?.id || !audioBlob) return;
    
    // Verificar si hay seguimiento mutuo para conversaciones privadas
    if (conversation?.type === 'private' && hasMutualFollow === false) {
      setError('No puedes enviar mensajes a este usuario hasta que os sigáis mutuamente');
      return;
    }
    
    setSendingMessage(true);
    const tempId = `temp-voice-${cuid()}`;
    
    try {
      // Crear un data URL temporal para mostrar en la UI inmediatamente
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      // Esperar a que se cargue el archivo
      const audioDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      
      // Crear objeto de mensaje temporal para UI con todos los campos necesarios
      const now = new Date();
      const tempMessage: Message = {
        id: tempId,
        content: '',
        mediaUrl: audioDataUrl,
        messageType: 'voice',
        senderId: session.user.id,
        conversationId: conversationId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        status: 'sending',
        read: false,
        tempId,
        sender: {
          id: session.user.id,
          name: session.user.name || '',
          username: session.user.username || session.user.name || 'Usuario',
          image: session.user.image || null
        }
      } as Message;
      
      // Añadir mensaje temporalmente a la lista
      setMessages(prev => [...prev, tempMessage]);
      
      // Crear FormData para el audio
      const formData = new FormData();
      
      // Convertir a mp3 o formato compatible si es posible
      // Si es webm u otro formato, Cloudinary lo convertirá, pero asignemos un nombre con extensión apropiada
      let fileName = 'voice-message.mp3';
      if (audioBlob.type.includes('webm')) {
        fileName = 'voice-message.webm';
      } else if (audioBlob.type.includes('mp4')) {
        fileName = 'voice-message.mp4';
      }
      
      formData.append('file', audioBlob, fileName);
      
      // Opcionalmente agregar metadatos para indicar formato deseado
      formData.append('format', 'mp3');
      
      // Intentar subir hasta 3 veces en caso de errores
      let uploadResponse = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && !uploadResponse) {
        try {
          if (retryCount > 0) {
            console.log(`Reintentando subida de audio (intento ${retryCount + 1}/${maxRetries})...`);
          }
          
          // Subir audio a Cloudinary a través de nuestra API
          uploadResponse = await fetch('/api/messages/upload', {
            method: 'POST',
            body: formData
          });
          
          if (!uploadResponse || !uploadResponse.ok) {
            const _errorData = await uploadResponse?.json().catch(() => ({}));
            console.error('Error en respuesta de API:', _errorData);
            const errorMessage = uploadResponse ? `Error al subir archivo de audio: ${uploadResponse.statusText}` : 'Error al conectar con el servidor';
            uploadResponse = null; // Para que siga reintentando
            throw new Error(errorMessage);
          }
        } catch (error) {
          console.error(`Error en intento ${retryCount + 1}:`, error);
          retryCount++;
          
          if (retryCount >= maxRetries) {
            throw error;
          }
          
          // Esperar antes de reintentar (backoff exponencial)
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
        }
      }
      
      if (!uploadResponse || !uploadResponse.ok) {
        throw new Error('No se pudo subir el archivo de audio después de varios intentos');
      }
      
      const responseData = await uploadResponse.json();
      const cloudinaryUrl = responseData.url;
      
      if (!cloudinaryUrl) {
        throw new Error('No se recibió URL de audio');
      }
      
      console.log("URL de Cloudinary recibida:", cloudinaryUrl);
      
      // Actualizar mensaje temporal con la URL real de Cloudinary
      updateMediaUrlInMessage(tempId, cloudinaryUrl);
      
      // Enviar mensaje por socket o API REST
      if (connected) {
        await sendMessage({
          conversationId,
          content: '',
          mediaUrl: cloudinaryUrl,
          messageType: 'voice',
          senderId: session.user.id,
          tempId
        });
      } else {
        // Fallback si no hay conexión socket
        const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '',
            mediaUrl: cloudinaryUrl,
            messageType: 'voice',
            tempId
          })
        });
        
        if (!response.ok) {
          throw new Error('Error al enviar mensaje de voz');
        }
        
        const savedMessage = await response.json();
        
        // Actualizar el mensaje temporal con los datos del mensaje guardado
        setMessages(prev => prev.map(msg => 
          msg.id === tempId 
            ? { 
                ...savedMessage,
                mediaUrl: cloudinaryUrl, // Asegurar que mediaUrl esté presente
                status: 'sent',
                createdAt: savedMessage.createdAt || new Date().toISOString()
              } 
            : msg
        ));
        
        console.log('Respuesta del servidor (fallback HTTP):', savedMessage);
      }
      
      // Desplazar al final después de enviar
      scrollToBottom();
      
    } catch (error) {
      console.error('Error sending voice message:', error);
      // Eliminar mensaje temporal en caso de error
      setMessages(prev => prev.filter(msg => msg.id !== tempId));
      setError('Error al enviar el mensaje de voz');
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, session?.user, connected, sendMessage, scrollToBottom, hasMutualFollow, updateMediaUrlInMessage, conversation?.type]);

  // Enviar mensaje (texto o imagen)
  const handleSendMessage = useCallback(async () => {
    if (imageToSend) {
      await sendImageMessage(imageToSend);
    } else {
      await sendTextMessage();
    }
  }, [imageToSend, sendImageMessage, sendTextMessage]);

  // Preparar carga de imagen
  const handleImageChange = useCallback((file: File | null) => {
    setImageToSend(file);
    
    if (file) {
      // Crear URL para previsualización
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setImagePreview('');
    }
    
    setUploadProgress(0);
  }, []);

  // Cargar más mensajes (scroll hacia arriba)
  const loadMoreMessages = useCallback(() => {
    if (hasMoreMessages && !loading && !loadingMoreRef.current) {
      fetchMessages();
    }
  }, [hasMoreMessages, loading, fetchMessages]);

  // Manejar scroll para cargar más mensajes
  const handleScroll = useCallback(() => {
    // Eliminar la carga automática de mensajes en scroll
    // Ahora la carga de mensajes anteriores sólo ocurrirá cuando se pulse el botón explícitamente
    
    // Código original comentado:
    // const container = messagesContainerRef.current;
    // if (!container) return;
    // 
    // // Si el usuario está cerca de la parte superior, cargar más mensajes
    // if (container.scrollTop < 100 && hasMoreMessages && !loading) {
    //   loadMoreMessages();
    // }
  }, []);

  // Efecto para desplazar al final al cargar inicialmente
  useEffect(() => {
    if (messages.length > 0) {
      // Siempre desplazar al último mensaje al cargar la conversación, sin importar si es la primera carga
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Efecto para desplazar al final cuando llegan nuevos mensajes
  useEffect(() => {
    // Verificar si estamos cerca del final antes de que lleguen nuevos mensajes
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      // Si estamos cerca del final o es la carga inicial, desplazar automáticamente
      if (isNearBottom || firstLoadRef.current) {
        scrollToBottom();
      }
    }
  }, [messages, scrollToBottom]);

  // Hook useEffect para limpiar el Set de mensajes procesados cuando cambia la conversación
  useEffect(() => {
    // Limpiar la caché de mensajes procesados cuando cambiamos de conversación
    // pero preservar los del grupo o conversación actual
    if (conversationId) {
      const currentConversationMessages = new Map<string, number>();
      
      // Solo preservar mensajes de la conversación actual
      messages.forEach(msg => {
        if (msg.id) {
          currentConversationMessages.set(msg.id, Date.now());
        }
      });
      
      processedMessagesRef.current = currentConversationMessages;
    }
  }, [conversationId, messages]);

  return {
    messages,
    loading,
    error,
    hasMoreMessages,
    newMessageContent,
    sendingMessage,
    imageToSend,
    imagePreview,
    uploadProgress,
    participants,
    hasMutualFollow,
    
    setNewMessageContent,
    handleSendMessage,
    handleImageChange,
    loadMoreMessages,
    scrollToBottom,
    handleScroll,
    
    messagesEndRef,
    messagesContainerRef,
    sendVoiceMessage,
    markNewMessageAsRead,
    markAllMessagesAsRead, // Exportando la función para que esté disponible en los componentes
  };
}
