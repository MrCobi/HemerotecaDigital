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

  // Función para desplazarse al final de los mensajes
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesEndRef]);

  // Marcar conversación como leída
  const markConversationAsRead = useCallback(async () => {
    if (!conversationId || !session?.user?.id) return;
    
    try {
      // Verificar si ya está marcada como leída usando el ref
      if (readStatusRef.current && readStatusRef.current[conversationId]) {
        return; // Ya está marcada como leída, evitamos peticiones duplicadas
      }
      
      // Marcar localmente como leída antes de la petición
      if (!readStatusRef.current) readStatusRef.current = {};
      readStatusRef.current[conversationId] = true;
      
      // Usar una petición no bloqueante
      fetch(`/api/messages/read/${conversationId}`, {
        method: 'PUT',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      }).catch(error => {
        console.error('Error al marcar conversación como leída:', error);
        // En caso de error, revertimos el estado local
        if (readStatusRef.current) {
          readStatusRef.current[conversationId] = false;
        }
      });
    } catch (error) {
      console.error('Error al marcar conversación como leída:', error);
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
          markConversationAsRead();
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
      if (message.conversationId === conversationId) {
        // Añadir mensaje a la lista, reemplazando cualquier mensaje temporal si existe
        addNewMessage(message);
      }
    },
    // El servidor ahora envía message_ack con tempId incluido
    onMessageStatus: (status: { messageId: string; status: string; tempId?: string }) => {
      if (status.tempId) {
        // Actualizar el estado de un mensaje temporal cuando llega su confirmación
        setMessages(prevMessages => {
          // Primero verificar si el mensaje ya existe con el messageId (puede haber duplicados)
          const existingMessageIndex = prevMessages.findIndex(m => m.id === status.messageId);
          const tempMessageIndex = prevMessages.findIndex(m => 
            m.id === status.tempId || (m.tempId && m.tempId === status.tempId)
          );
          
          // Si ya existe un mensaje con el ID final y también tenemos un mensaje temporal
          if (existingMessageIndex !== -1 && tempMessageIndex !== -1 && existingMessageIndex !== tempMessageIndex) {
            // Eliminar el mensaje temporal y mantener solo el confirmado
            const updatedMessages = [...prevMessages];
            updatedMessages.splice(tempMessageIndex, 1);
            return updatedMessages;
          }
          
          // Solo actualizar el mensaje temporal a confirmado
          return prevMessages.map(msg => {
            // Si es el mensaje temporal que estamos buscando
            if (msg.id === status.tempId || (msg.tempId && msg.tempId === status.tempId)) {
              // Actualizar sus propiedades manteniendo el tipo Message
              return { 
                ...msg, 
                id: status.messageId, 
                status: status.status as Message['status'], 
                tempId: undefined 
              };
            }
            return msg;
          });
        });
      }
    }
  });

  // Efecto para unirse/salir de la conversación
  useEffect(() => {
    if (conversationId && connected && session?.user?.id) {
      // Usar un ID estable para evitar reconexiones innecesarias
      const stableConversationId = conversationId;
      
      // Solo unirse si es una nueva conversación o la primera carga
      joinConversation(stableConversationId);
      
      // Limpiar al desmontar o cambiar de conversación
      return () => {
        leaveConversation(stableConversationId);
      };
    }
  }, [conversationId, connected, session?.user?.id, joinConversation, leaveConversation]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // Formatear el mensaje
    const formattedMessage: Message = {
      id: message.id,
      tempId: message.tempId,
      conversationId: message.conversationId as string || conversationId || '',
      content: message.content || '',
      createdAt: message.createdAt ? new Date(message.createdAt as string) : new Date(),
      read: Boolean(message.read),
      senderId: message.senderId as string,
      sender: {
        id: message.senderId as string,
        username: message.sender ? (message.sender as { username?: string | null }).username || 'Usuario' : 'Usuario',
        image: message.sender ? (message.sender as { image?: string | null }).image || '/placeholders/user.png' : '/placeholders/user.png',
      },
      messageType: message.messageType || 'text',
      imageUrl: message.mediaUrl,
      status: message.status || 'sent',
    };

    // Actualizar la lista de mensajes
    setMessages(prevMessages => {
      // Verificar si ya existe un mensaje confirmado con el mismo ID
      const confirmedIndex = message.id ? 
        prevMessages.findIndex(m => m.id === message.id && !m.tempId) : -1;
      
      if (confirmedIndex !== -1) {
        // Si ya existe un mensaje confirmado con este ID, no añadir duplicado
        return prevMessages;
      }
      
      // Verificar si ya existe un mensaje temporal que debemos reemplazar
      const tempIndex = prevMessages.findIndex(m => 
        // Buscar por tempId o por un ID temporal (que empiece con "temp-")
        (formattedMessage.tempId && m.tempId === formattedMessage.tempId) || 
        (formattedMessage.tempId && m.id === formattedMessage.tempId) ||
        (formattedMessage.id && m.tempId === formattedMessage.id) ||
        (formattedMessage.id && m.id && typeof m.id === 'string' && m.id.startsWith('temp-') && 
          m.content === formattedMessage.content && m.senderId === formattedMessage.senderId)
      );

      // Si encontramos un mensaje temporal para reemplazar
      if (tempIndex !== -1) {
        const updatedMessages = [...prevMessages];
        updatedMessages[tempIndex] = { ...formattedMessage, status: 'sent' as Message['status'] };
        return updatedMessages;
      }

      // Verificar si este mensaje ya existe en la lista (por contenido y remitente)
      const duplicateIndex = prevMessages.findIndex(m => 
        m.content === formattedMessage.content && 
        m.senderId === formattedMessage.senderId &&
        Math.abs(new Date(m.createdAt).getTime() - new Date(formattedMessage.createdAt).getTime()) < 5000
      );
      
      if (duplicateIndex !== -1) {
        // Actualizar el mensaje existente en vez de añadir uno nuevo
        const updatedMessages = [...prevMessages];
        // Mantener el ID del mensaje actual si el nuevo es temporal
        const finalId = formattedMessage.id?.toString().startsWith('temp-') ? 
          updatedMessages[duplicateIndex].id : formattedMessage.id;
          
        updatedMessages[duplicateIndex] = { 
          ...updatedMessages[duplicateIndex],
          ...formattedMessage,
          id: finalId,
        };
        return updatedMessages;
      }

      // Si no hay mensaje temporal para reemplazar, añadir el nuevo
      return [...prevMessages, formattedMessage];
    });

    // Si el mensaje es del otro participante, marcar conversación como leída
    if (message.senderId !== session?.user?.id && message.conversationId) {
      markConversationAsRead();
    }
  }, [session?.user?.id, markConversationAsRead, conversationId]);

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
