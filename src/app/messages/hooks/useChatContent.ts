// src/app/messages/hooks/useChatContent.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Message, ConversationData, User } from '../types';
import useSocket from '@/src/hooks/useSocket';
import cuid from 'cuid';

const MESSAGE_PAGE_SIZE = 20;

export function useChatContent(
  conversation: ConversationData | null,
  conversationId: string | null,
) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [page, setPage] = useState(1);
  const [newMessageContent, setNewMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [imageToSend, setImageToSend] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [participants, setParticipants] = useState<User[]>([]);
  const firstLoadRef = useRef(true);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const loadingMoreRef = useRef(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const readStatusRef = useRef<Record<string, boolean>>({});
  const failedMarkReadAttempts = useRef<Record<string, boolean>>({});
  const failedMessageMarkReadAttempts = useRef<Record<string, boolean>>({});

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
          const errorData = await response.json();
          const errorMessage = errorData.error || "No tienes permisos para acceder a esta conversación";
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
            const errorData = await response.json();
            const errorMessage = errorData.error || "No tienes permisos para acceder a esta conversación";
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
      // Pequeño retraso para asegurar que la UI se haya renderizado
      const timer = setTimeout(() => {
        markAllMessagesAsRead();
      }, 1000);
      
      return () => clearTimeout(timer);
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
  const shouldUpdateStatus = useCallback((currentStatus?: string, newStatus?: string) => {
    if (!newStatus) return false;
    if (!currentStatus) return true;
    
    const statusPriority: Record<string, number> = {
      'sending': 1,
      'sent': 2,
      'delivered': 3,
      'read': 4,
      'failed': 0
    };
    
    // Solo actualizar si el nuevo estado tiene mayor prioridad
    return (statusPriority[newStatus] || 0) > (statusPriority[currentStatus] || 0);
  }, []);

  // Función para añadir un nuevo mensaje a la lista
  const addNewMessage = useCallback((newMessage: Message) => {
    console.log('[useChatContent] Añadiendo mensaje:', newMessage);
    console.log('[useChatContent] Tipo de mensaje:', newMessage.messageType);
    console.log('[useChatContent] ConversationId del mensaje:', newMessage.conversationId);
    console.log('[useChatContent] ConversationId actual:', conversation?.id);
    
    setMessages(prevMessages => {
      // Verificar si ya existe un mensaje con el mismo ID
      const existingIndex = prevMessages.findIndex(msg => msg.id === newMessage.id);
      
      // Verificar si existe un mensaje temporal que corresponda a este mensaje
      const tempIndex = prevMessages.findIndex(msg => 
        msg.tempId && newMessage.tempId && msg.tempId === newMessage.tempId
      );
      
      console.log('[useChatContent] Actualización de estado - existingIndex:', existingIndex, 'tempIndex:', tempIndex);
      
      // Si ya existe un mensaje con este ID, no lo añadimos de nuevo
      if (existingIndex !== -1) {
        // Solo actualizamos algunos campos específicos si es necesario
        const updatedMessages = [...prevMessages];
        
        // Solo actualizamos el estado si el nuevo tiene un estado más "avanzado"
        const currentStatus = prevMessages[existingIndex].status;
        const newStatus = newMessage.status;
        
        if (shouldUpdateStatus(currentStatus, newStatus)) {
          updatedMessages[existingIndex] = {
            ...updatedMessages[existingIndex],
            status: newStatus,
            read: newMessage.read || updatedMessages[existingIndex].read
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

  // Manejar nuevo mensaje recibido
  const handleNewMessage = useCallback((message: Message) => {
    console.log('[useChatContent] Recibido nuevo mensaje:', message);
    
    // Verificar si el mensaje pertenece a la conversación actual
    const currentConvId = conversation?.id;
    const messageConvId = message.conversationId;
    
    console.log('[useChatContent] Conversación actual:', currentConvId);
    console.log('[useChatContent] Conversación del mensaje:', messageConvId);
    
    if (!currentConvId || !messageConvId) return;
    
    // Normalizar IDs para comparación consistente, igual que en onNewMessage
    const normalizedCurrentId = (currentConvId || '').replace(/^(group_|conv_)/, '');
    const normalizedMessageId = (messageConvId || '').replace(/^(group_|conv_)/, '');
    
    console.log('[useChatContent] IDs normalizados - Actual:', normalizedCurrentId, 'Mensaje:', normalizedMessageId);
    
    // Verificar coincidencia exacta tras normalización
    const belongsToCurrentConversation = normalizedCurrentId === normalizedMessageId;
    
    console.log('[useChatContent] ¿Coinciden?', belongsToCurrentConversation);
    
    if (belongsToCurrentConversation) {
      console.log('[useChatContent] El mensaje pertenece a esta conversación, añadiendo...');
      addNewMessage(message);
    } else {
      console.log('[useChatContent] El mensaje NO pertenece a esta conversación, ignorando');
    }
  }, [conversation, addNewMessage]);

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
        // Actualizar el estado de un mensaje temporal cuando llega su confirmación
        setMessages(prevMessages => {
          // Primero verificar si el mensaje ya existe con el messageId (puede haber duplicados)
          const existingMessageIndex = prevMessages.findIndex(m => m.id === status.messageId);
          const tempMessageIndex = prevMessages.findIndex(m => 
            m.id === status.tempId || (m.tempId && m.tempId === status.tempId)
          );
          
          console.log(`[useChatContent] Actualización de estado - existingIndex: ${existingMessageIndex}, tempIndex: ${tempMessageIndex}`);
          
          // Si ya existe un mensaje con el ID final y también tenemos un mensaje temporal
          if (existingMessageIndex !== -1 && tempMessageIndex !== -1 && existingMessageIndex !== tempMessageIndex) {
            // Eliminar el mensaje temporal y mantener solo el confirmado
            console.log(`[useChatContent] Eliminando mensaje temporal duplicado`);
            const updatedMessages = [...prevMessages];
            updatedMessages.splice(tempMessageIndex, 1);
            
            // También actualizar el mensaje confirmado con el estado más reciente
            updatedMessages[existingMessageIndex] = {
              ...updatedMessages[existingMessageIndex],
              status: status.status as Message['status']
            };
            
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
              tempId: undefined
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
    if (conversationId && connected && session?.user?.id) {
      console.log(`[useChatContent] Uniendo a conversación: ${conversationId}`);
      // Usar un ID estable para evitar reconexiones innecesarias
      const stableConversationId = conversationId;
      
      // Unirse a la conversación
      joinConversation(stableConversationId);
      
      // Cargar mensajes iniciales
      fetchMessages();
      
      // Obtener participantes si es necesario
      if (!participants || participants.length === 0) {
        fetchParticipants();
      }
      
      // Limpiar al desmontar
      return () => {
        console.log(`[useChatContent] Saliendo de conversación: ${stableConversationId}`);
        leaveConversation(stableConversationId);
      };
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, connected, session?.user?.id]);

  useEffect(() => {
    if (!conversationId || !session?.user?.id) return;
    
    // Prevenir cargas duplicadas o innecesarias
    const currentConvId = conversationId;
    firstLoadRef.current = true;
    
    // Evitar múltiples cargas
    const controller = new AbortController();
    const loadData = async () => {
      try {
        if (!readStatusRef.current) readStatusRef.current = {};
        
        // Solo cargar si no hemos cargado ya para esta conversación
        if (messages.length === 0 || messages[0]?.conversationId !== currentConvId) {
          await fetchMessages();
        }
        
        // Solo cargar participantes si es necesario
        if (!readStatusRef.current[currentConvId]) {
          await fetchParticipants();
        }
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          console.error('Error cargando datos:', error);
        }
      }
    };
    
    // Usar un pequeño timeout para evitar cargas repetidas
    const timeoutId = setTimeout(() => {
      loadData();
    }, 100);
    
    // Limpiar estado
    setNewMessageContent('');
    setImageToSend(null);
    setImagePreview(null);
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
      };
      
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
        });
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
  }, [conversationId, session?.user, newMessageContent, connected, sendMessage, scrollToBottom]);

  // Enviar mensaje de imagen
  const sendImageMessage = useCallback(async (file: File) => {
    if (!file || !session?.user?.id) return;
    
    // Generar un ID temporal único para identificar este mensaje
    const tempId = cuid();
    
    // Crear un mensaje temporal para mostrar en la UI mientras se envía
    const tempMessage: Message = {
      tempId,
      content: '',
      mediaUrl: URL.createObjectURL(file),
      senderId: session.user.id,
      receiverId: conversation?.otherId,
      conversationId: conversation?.id || '',
      messageType: 'image',
      status: 'sending',
      createdAt: new Date().toISOString(),
    };
    
    // Agregar a la lista de mensajes localmente (actualización optimista)
    setMessages(prev => [...prev, tempMessage]);
    
    try {
      // Establecer estado de envío
      setSendingMessage(true);
      
      // Subir la imagen a Cloudinary mediante la API de upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'image');
      
      const uploadRes = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) {
        throw new Error('Error al subir la imagen');
      }
      
      const { url: imageUrl } = await uploadRes.json();
      
      if (!imageUrl) {
        throw new Error('No se obtuvo URL de la imagen');
      }
      
      // Ahora, enviar el mensaje con la URL de Cloudinary
      if (connected) {
        // Enviar mediante Socket.io usando la URL de Cloudinary
        sendMessage({
          messageType: 'image',
          conversationId: conversation?.id,
          senderId: session.user.id,
          receiverId: conversation?.otherId,
          tempId,
          content: '', // Contenido vacío para imágenes
          mediaUrl: imageUrl, // Usar la URL de Cloudinary en lugar del base64
          createdAt: new Date().toISOString(),
          status: 'sending'
        });
      } else {
        // Fallback: Enviar por API REST
        const payload = {
          messageType: 'image',
          conversationId: conversation?.id,
          senderId: session.user.id,
          receiverId: conversation?.otherId,
          mediaUrl: imageUrl,
          content: ''
        };
        
        const response = await fetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          throw new Error('Error al enviar la imagen');
        }
        
        const data = await response.json();
        
        // Actualizar el mensaje temporal con la información real
        setMessages(prev => prev.map(msg => 
          msg.tempId === tempId 
            ? { ...data.message, status: 'delivered' } 
            : msg
        ));
      }
      
      // Limpiar la vista previa y restablecer estados
      setImageToSend(null);
      setImagePreview(null);
      setUploadProgress(0);
      
      // Desplazar al final después de enviar
      scrollToBottom();
      
    } catch (error) {
      console.error('Error enviando imagen:', error);
      
      // Marcar el mensaje como fallido
      setMessages(prev => prev.map(msg => 
        msg.tempId === tempId 
          ? { ...msg, status: 'failed' } 
          : msg
      ));
      
      // Mostrar mensaje de error en UI
      // toast?.({
      //   title: "Error",
      //   description: "No se pudo enviar la imagen",
      //   variant: "destructive",
      // });
    } finally {
      setSendingMessage(false);
    }
  }, [conversation, session?.user?.id, connected, sendMessage, scrollToBottom]);

  // Enviar mensaje de voz
  const sendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    if (!conversationId || !session?.user?.id || !audioBlob) return;
    
    try {
      setSendingMessage(true);
      
      // Crear un data URL temporal para mostrar en la UI inmediatamente
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      // Esperar a que se cargue el archivo
      const audioDataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
      });
      
      // ID temporal para el mensaje
      const tempId = `temp-voice-${Date.now()}`;
      
      // Crear objeto de mensaje temporal para UI
      const tempMessage: Message = {
        id: tempId,
        content: audioDataUrl,
        createdAt: new Date(),
        read: true,
        senderId: session.user.id,
        sender: {
          id: session.user.id,
          username: session.user.name || session.user.username || 'Usuario',
          image: session.user.image || null
        },
        messageType: 'voice'
      };
      
      // Añadir mensaje temporalmente a la lista
      setMessages(prev => [...prev, tempMessage]);
      
      // Iniciar carga a Cloudinary
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      formData.append('upload_preset', 'hemeroteca_digital');
      formData.append('resource_type', 'video'); // Para archivos de audio
      
      // Cargar archivo a Cloudinary
      const cloudinaryResponse = await fetch('https://api.cloudinary.com/v1_1/hemeroteca-digital/upload', {
        method: 'POST',
        body: formData
      });
      
      const cloudinaryData = await cloudinaryResponse.json();
      
      if (!cloudinaryData.secure_url) {
        throw new Error('Error al cargar archivo de audio');
      }
      
      // URL del audio en Cloudinary
      const audioUrl = cloudinaryData.secure_url;
      
      // Enviar mensaje por socket
      if (connected) {
        await sendMessage({
          conversationId,
          content: audioUrl,
          messageType: 'voice',
          senderId: session.user.id
        });
      } else {
        // Fallback si no hay conexión socket
        await fetch(`/api/messages/conversations/${conversationId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: audioUrl, 
            messageType: 'voice' 
          })
        });
      }
      
      // Actualizar el mensaje temporal con la URL de Cloudinary
      setMessages(prev => prev.map(msg => 
        msg.id === tempId 
          ? { ...msg, content: audioUrl } 
          : msg
      ));
      
      // Desplazar al final después de enviar
      scrollToBottom();
      
    } catch (error) {
      console.error('Error sending voice message:', error);
      // Eliminar mensaje temporal en caso de error
      setMessages(prev => prev.filter(msg => !msg.id?.startsWith('temp-voice-')));
    } finally {
      setSendingMessage(false);
    }
  }, [conversationId, session?.user, connected, sendMessage, scrollToBottom]);

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
      setImagePreview(null);
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
    
    setNewMessageContent,
    handleSendMessage,
    handleImageChange,
    loadMoreMessages,
    scrollToBottom,
    handleScroll,
    
    messagesEndRef,
    messagesContainerRef,
    sendVoiceMessage,
    markNewMessageAsRead
  };
}
