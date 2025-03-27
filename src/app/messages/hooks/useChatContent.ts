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
      await fetch(`/api/messages/read/${conversationId}`, {
        method: 'PUT',
      });
    } catch (error) {
      console.error('Error al marcar conversación como leída:', error);
    }
  }, [conversationId, session?.user?.id]);

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
        setMessages(prevMessages => 
          prevMessages.map(msg => {
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
          })
        );
      }
    }
  });

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
      
      const response = await fetch(
        `/api/messages?with=${conversationId}&page=${pageToLoad}&limit=${MESSAGE_PAGE_SIZE}`
      );
      
      if (!response.ok) {
        throw new Error(`Error cargando mensajes: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Formatear mensajes
      const formattedMessages = data.messages.map((msg: Partial<Message>) => ({
        id: msg.id,
        content: msg.content || '',
        createdAt: new Date(msg.createdAt as string),
        read: Boolean(msg.read),
        senderId: msg.senderId as string,
        sender: {
          id: msg.senderId as string,
          username: msg.sender ? (msg.sender as { username?: string | null }).username || 'Usuario' : 'Usuario',
          image: msg.sender ? (msg.sender as { image?: string | null }).image || '/placeholders/user.png' : '/placeholders/user.png',
        },
        messageType: msg.messageType || 'text',
        imageUrl: msg.imageUrl,
        status: msg.status || 'sent',
      }));
      
      // Actualizar estado
      if (firstLoadRef.current) {
        setMessages(formattedMessages);
      } else {
        setMessages(prev => [...formattedMessages, ...prev]);
      }
      
      // Actualizar si hay más mensajes
      setHasMoreMessages(formattedMessages.length >= MESSAGE_PAGE_SIZE);
      
      // Si es primera carga y hay mensajes, marcar como leídos
      if (firstLoadRef.current && formattedMessages.length > 0) {
        markConversationAsRead();
        firstLoadRef.current = false;
      }
      
      // Incrementar página para próxima carga
      if (!firstLoadRef.current) {
        setPage(prev => prev + 1);
      }
      
    } catch (error) {
      console.error('Error fetching messages:', error);
      setError('Error al cargar los mensajes. Inténtalo de nuevo más tarde.');
    } finally {
      setLoading(false);
      loadingMoreRef.current = false;
    }
  }, [conversationId, page, session?.user?.id, markConversationAsRead]);

  // Cargar participantes del grupo
  const fetchParticipants = useCallback(async () => {
    if (!conversationId || !conversation?.isGroup) return;
    
    try {
      // Usar participantes ya disponibles en los datos de la conversación si existen
      if (conversation.participants && conversation.participants.length > 0) {
        const users = conversation.participants.map(p => p.user);
        setParticipants(users);
        return;
      }
      
      // Si no están en los datos de la conversación, cargarlos desde la API
      const response = await fetch(`/api/messages/conversations/${conversationId}/participants`);
      
      if (!response.ok) {
        throw new Error(`Error cargando participantes: ${response.status}`);
      }
      
      const data = await response.json();
      setParticipants(data);
      
    } catch (error) {
      console.error('Error fetching participants:', error);
    }
  }, [conversationId, conversation]);

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
      // Verificar si ya existe un mensaje temporal que debemos reemplazar
      const tempIndex = prevMessages.findIndex(m => 
        // Buscar por tempId o por un ID temporal (que empiece con "temp-")
        m.tempId === formattedMessage.tempId || 
        (m.id && formattedMessage.tempId && m.id.toString() === formattedMessage.tempId) ||
        (formattedMessage.id && m.id && typeof m.id === 'string' && m.id.startsWith('temp-') && 
          m.content === formattedMessage.content && m.senderId === formattedMessage.senderId)
      );

      // Si encontramos un mensaje temporal para reemplazar
      if (tempIndex !== -1) {
        const updatedMessages = [...prevMessages];
        updatedMessages[tempIndex] = { ...formattedMessage, status: 'sent' as Message['status'] };
        return updatedMessages;
      }

      // Si no hay mensaje temporal para reemplazar, añadir el nuevo
      return [...prevMessages, formattedMessage];
    });

    // Si el mensaje es del otro participante, marcar conversación como leída
    if (message.senderId !== session?.user?.id && message.conversationId) {
      markConversationAsRead();
    }
  }, [session?.user?.id, markConversationAsRead]);

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

  // Efecto para cargar mensajes cuando cambia la conversación
  useEffect(() => {
    if (conversationId) {
      firstLoadRef.current = true;
      fetchMessages();
      fetchParticipants();
      
      // Unirse a la conversación por socket
      if (connected) {
        joinConversation(conversationId);
      }
      
      // Limpiar estado
      setNewMessageContent('');
      setImageToSend(null);
      setImagePreview(null);
      setUploadProgress(0);
      
      // Limpieza al cambiar de conversación
      return () => {
        if (connected && conversationId) {
          leaveConversation(conversationId);
        }
      };
    }
  }, [conversationId, connected, joinConversation, leaveConversation, fetchMessages, fetchParticipants]);

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
