// src/app/messages/hooks/useChatContent.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Message, ConversationData, User } from '../types';
import useSocket from '@/src/hooks/useSocket';

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
  const markMessageAsRead = useCallback(async (messageId: string) => {
    if (!messageId || !conversationId || !session?.user?.id) return;
    
    // Evitar intentos repetidos para mensajes que ya fallaron
    if (failedMessageMarkReadAttempts.current[messageId]) {
      console.log(`Omitiendo intento de marcar mensaje como leído para ${messageId} debido a fallo previo`);
      return;
    }
    
    try {
      // Obtener la URL base correcta (evitar hardcodear el puerto)
      const baseUrl = window.location.origin;
      const response = await fetch(`${baseUrl}/api/messages/${messageId}/read`, {
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
      if (message.conversationId === conversationId) {
        // Añadir mensaje a la lista, reemplazando cualquier mensaje temporal si existe
        addNewMessage(message);
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

  // Enviar mensaje con imagen
  const sendImageMessage = useCallback(async () => {
    if (!conversationId || !session?.user?.id || !imageToSend) return;
    
    try {
      setSendingMessage(true);
      
      // Crear FormData para la imagen
      const formData = new FormData();
      formData.append('file', imageToSend);
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'image');
      
      if (newMessageContent.trim()) {
        formData.append('content', newMessageContent);
      }
      
      // Configurar para seguimiento de progreso
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/messages/conversations/${conversationId}/upload`, true);
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          // Éxito
          console.log('Imagen enviada correctamente');
          // Recargar mensajes para mostrar la imagen
          fetchMessages();
          // Limpiar estado
          setNewMessageContent('');
          setImageToSend(null);
          setImagePreview(null);
          setUploadProgress(0);
        } else {
          // Error
          console.error('Error al enviar imagen:', xhr.statusText);
        }
        setSendingMessage(false);
      };
      
      xhr.onerror = () => {
        console.error('Error de red al enviar imagen');
        setSendingMessage(false);
      };
      
      // Enviar
      xhr.send(formData);
      
    } catch (error) {
      console.error('Error sending image message:', error);
      setSendingMessage(false);
    }
  }, [conversationId, session?.user?.id, imageToSend, newMessageContent, fetchMessages]);

  // Enviar mensaje (texto o imagen)
  const handleSendMessage = useCallback(async () => {
    if (imageToSend) {
      await sendImageMessage();
    } else {
      await sendTextMessage();
    }
  }, [imageToSend, sendImageMessage, sendTextMessage]);

  // Añadir nuevo mensaje recibido
  const addNewMessage = useCallback((message: Partial<Message>) => {
    setMessages(prevMessages => {
      // Comprobar si ya existe un mensaje con el mismo ID o tempId
      const existingMessageIndex = prevMessages.findIndex(m => 
        (message.id && m.id === message.id) || 
        (message.tempId && (m.id === message.tempId || m.tempId === message.tempId))
      );
      
      // Log para depuración
      console.log(`[useChatContent] addNewMessage - mensaje existente: ${existingMessageIndex !== -1}, tempId: ${message.tempId}, id: ${message.id}`);
      
      // Si ya existe, actualizarlo
      if (existingMessageIndex !== -1) {
        const updatedMessages = [...prevMessages];
        // Actualizar propiedades pero mantener las que no vienen en el mensaje nuevo
        updatedMessages[existingMessageIndex] = {
          ...updatedMessages[existingMessageIndex],
          ...message,
          // Si el mensaje tiene ID confirmado, eliminar el tempId
          tempId: message.id ? undefined : updatedMessages[existingMessageIndex].tempId || message.tempId
        };
        return updatedMessages;
      }
      
      // Crear objeto de mensaje completo
      const newMessage: Message = {
        id: message.id || message.tempId || `temp-${Date.now()}`,
        content: message.content || '',
        senderId: message.senderId || '',
        receiverId: message.receiverId,
        conversationId: message.conversationId || conversationId || '',
        createdAt: message.createdAt || new Date().toISOString(),
        read: message.read || false,
        status: message.status || 'sending',
        mediaUrl: message.mediaUrl,
        messageType: message.messageType || 'text',
        sender: message.sender,
        tempId: !message.id ? (message.tempId || `temp-${Date.now()}`) : undefined
      };
      
      // Si el mensaje es de otro usuario, marcarlo como leído si la conversación está abierta
      if (newMessage.senderId !== session?.user?.id && conversationId && newMessage.id) {
        markMessageAsRead(newMessage.id);
      }
      
      // Agregar mensaje al principio si es más reciente o al final si es más antiguo
      const sortedMessages = [...prevMessages, newMessage].sort((a, b) => {
        // Ordenar por createdAt
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
      
      return sortedMessages;
    });
    
    // Si es un mensaje recibido, marcar la conversación como leída
    if (message.senderId !== session?.user?.id && conversationId) {
      markConversationAsRead(conversationId);
    }
  }, [conversationId, markConversationAsRead, markMessageAsRead, session?.user?.id]);

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
    const container = messagesContainerRef.current;
    if (!container) return;
    
    // Si el usuario está cerca de la parte superior, cargar más mensajes
    if (container.scrollTop < 100 && hasMoreMessages && !loading) {
      loadMoreMessages();
    }
  }, [hasMoreMessages, loading, loadMoreMessages]);

  // Efecto para desplazar al final al cargar inicialmente
  useEffect(() => {
    if (firstLoadRef.current && messages.length > 0) {
      scrollToBottom();
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
  };
}
