"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, X, Mic, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { flushSync } from 'react-dom';
import useSocket, { MessageType } from '@/src/hooks/useSocket';
import { API_ROUTES } from '@/src/config/api-routes';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import VoiceMessageRecorder from './VoiceMessageRecorder';

type User = {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

type Message = {
  id?: string;
  tempId?: string;
  content: string;
  senderId: string;
  receiverId?: string;
  createdAt: Date | string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  conversationId?: string;
  read?: boolean;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
};

type ChatWindowContentProps = {
  otherUser: User | null;
  conversationId?: string;
  className?: string;
};

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export const ChatWindowContent: React.FC<ChatWindowContentProps> = ({
  otherUser,
  conversationId,
  className,
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVoiceRecorderVisible, setIsVoiceRecorderVisible] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState<boolean | null>(null);
  const [isCheckingRelationship, setIsCheckingRelationship] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Estado para controlar la carga de mensajes
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [errorLoadingMessages, setErrorLoadingMessages] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;
  
  // Para controlar el scroll mientras se cargan más mensajes
  const [preserveScrollPosition, setPreserveScrollPosition] = useState(false);
  const scrollHeightBeforeLoad = useRef(0);
  const scrollTopBeforeLoad = useRef(0);
  
  // Para prevenir solicitudes duplicadas
  const isFetchingRef = useRef(false);
  
  // Estado para el socket
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  
  // Al principio del componente, asegurar que conversationId siempre sea string
  const safeConversationId = conversationId || '';

  // Socket.io
  const { 
    socketInstance,
    connected,
    sendMessage: socketSendMessage,
    updateTypingStatus: socketUpdateTypingStatus,
    markMessageAsRead: socketMarkMessageAsRead,
    joinConversation,
    leaveConversation
  } = useSocket({
    userId: currentUserId,
    username: session?.user?.name || session?.user?.username || undefined,
    onConnect: () => {
      if (!connected) {
        console.log('Socket conectado pero aún no listo');
        return;
      }
      console.log(`Socket conectado en ChatWindow (${conversationId})`);
      setSocketInitialized(true);
      
      // Al conectar, unirse a la conversación si hay un ID válido
      if (safeConversationId) {
        joinConversation(safeConversationId);
        
        // Marcar mensajes como leídos
        if (messages && messages.length > 0 && messages[messages.length - 1].id) {
          socketMarkMessageAsRead({
            conversationId: safeConversationId,
            messageId: messages[messages.length - 1].id as string
          });
        }
      }
    },
    onDisconnect: () => {
      console.log('Socket desconectado en ChatWindow');
      setSocketInitialized(false);
    },
    onNewMessage: (message) => {
      console.log('Nuevo mensaje recibido en ChatWindow:', message);
      
      // Si el mensaje pertenece a esta conversación, añadirlo
      if (message.conversationId === safeConversationId || 
          (message.senderId === otherUser?.id && message.receiverId === currentUserId) ||
          (message.senderId === currentUserId && message.receiverId === otherUser?.id)) {
            
        // Actualizar el estado de los mensajes
        setMessages(prevMessages => {
          // Evitar duplicados con mismo id o tempId
          const exists = prevMessages.some(m => 
            m.id === message.id || 
            m.tempId === message.tempId ||
            (m.tempId && message.tempId && m.tempId === message.tempId)
          );
          
          if (exists) {
            return prevMessages.map(m => {
              if (m.tempId === message.tempId || m.id === message.id) {
                return { ...m, ...message };
              }
              return m;
            });
          } else {
            return [...prevMessages, message];
          }
        });
        
        // Marcar automáticamente como leídos los mensajes recibidos
        if (message.senderId !== currentUserId && message.id) {
          socketMarkMessageAsRead({
            conversationId: message.conversationId || safeConversationId,
            messageId: message.id
          });
        }
      }
    },
    onTypingStatus: (status) => {
      if (status.userId === otherUser?.id) {
        setPeerIsTyping(status.isTyping);
      }
    },
    onMessageStatus: (status: { messageId: string; status: string }) => {
      console.log(`Actualizando estado del mensaje ${status.messageId} a ${status.status}`);
      updateMessageStatus(status.messageId, status.status as MessageStatus);
    },
    onMessageRead: (data) => {
      // Actualizar mensaje como leído
      setMessages(prev => 
        prev.map((msg: Message) => 
          (msg.id === data.messageId || msg.tempId === data.messageId) 
            ? { ...msg, read: true, status: 'read' } 
            : msg
        )
      );
    }
  });

  // Verificar si los usuarios se siguen mutuamente
  useEffect(() => {
    if (!otherUser?.id || !currentUserId) return;
    
    const checkMutualFollow = async () => {
      // Evitar verificaciones repetidas usando sessionStorage
      const relationshipKey = `mutual_follow_${currentUserId}_${otherUser.id}`;
      const cachedRelationship = sessionStorage.getItem(relationshipKey);
      
      if (cachedRelationship) {
        console.log('Usando relación de seguimiento en caché');
        setCanSendMessages(cachedRelationship === 'true');
        return;
      }
      
      try {
        setIsCheckingRelationship(true);
        const response = await fetch(`/api/relationships/check?targetUserId=${otherUser.id}`);
        
        if (response.ok) {
          const data = await response.json();
          // Solo permitir enviar mensajes si ambos usuarios se siguen mutuamente
          setCanSendMessages(data.isMutualFollow);
          
          // Guardar en caché
          sessionStorage.setItem(relationshipKey, data.isMutualFollow.toString());
        } else {
          console.error('Error al verificar relación de seguimiento');
          setCanSendMessages(false);
        }
      } catch (error) {
        console.error('Error al verificar relación de seguimiento:', error);
        setCanSendMessages(false);
      } finally {
        setIsCheckingRelationship(false);
      }
    };
    
    checkMutualFollow();
  }, [currentUserId, otherUser?.id]);

  // Cargar mensajes
  useEffect(() => {
    if (!safeConversationId || !currentUserId || isFetchingRef.current) return;
    
    const fetchMessages = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoadingMessages(true);
      setErrorLoadingMessages(null);
      
      try {
        const response = await fetch(
          `${API_ROUTES.messages.list}?with=${safeConversationId}&page=${page}&limit=${pageSize}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar los mensajes');
        }
        
        const data = await response.json();
        // Garantizar que data.messages siempre es un array, incluso si está vacío
        const fetchedMessages = Array.isArray(data.messages) ? data.messages : [];
        
        // Marcar automáticamente como leídos los mensajes recibidos
        const unreadMessages = fetchedMessages.filter(
          (msg: Message) => msg.senderId === otherUser?.id && !msg.read
        );
        
        if (unreadMessages.length > 0) {
          unreadMessages.forEach((msg: Message) => {
            markMessageAsRead(msg.id, safeConversationId);
          });
        }
        
        setMessages(fetchedMessages);
        setHasMore(fetchedMessages.length === pageSize);
        
      } catch (error) {
        console.error('Error al cargar los mensajes:', error);
        setErrorLoadingMessages('No se pudieron cargar los mensajes. Inténtalo de nuevo.');
      } finally {
        setIsLoadingMessages(false);
        isFetchingRef.current = false;
      }
    };
    
    fetchMessages();
  }, [safeConversationId, currentUserId, otherUser?.id]);

  // Cargar más mensajes
  const loadMoreMessages = async () => {
    if (!safeConversationId || isLoadingMore || !hasMore || isFetchingRef.current) return;
    
    // Guardar la posición de scroll actual
    if (chatContainerRef.current) {
      setPreserveScrollPosition(true);
      scrollHeightBeforeLoad.current = chatContainerRef.current.scrollHeight;
      scrollTopBeforeLoad.current = chatContainerRef.current.scrollTop;
    }
    
    isFetchingRef.current = true;
    setIsLoadingMore(true);
    
    try {
      const nextPage = page + 1;
      const response = await fetch(
        `${API_ROUTES.messages.list}?with=${safeConversationId}&page=${nextPage}&limit=${pageSize}`
      );
      
      if (!response.ok) {
        throw new Error('Error al cargar más mensajes');
      }
      
      const data = await response.json();
      const oldMessages = Array.isArray(data.messages) ? data.messages : [];
      
      setMessages(prev => [...oldMessages, ...prev]);
      setPage(nextPage);
      setHasMore(oldMessages.length === pageSize);
      
    } catch (error) {
      console.error('Error al cargar más mensajes:', error);
    } finally {
      setIsLoadingMore(false);
      isFetchingRef.current = false;
    }
  };

  // Restaurar posición de scroll después de cargar más mensajes
  useEffect(() => {
    if (preserveScrollPosition && chatContainerRef.current) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeightBeforeLoad.current;
      chatContainerRef.current.scrollTop = scrollTopBeforeLoad.current + heightDifference;
      setPreserveScrollPosition(false);
    }
  }, [preserveScrollPosition, messages]);

  // Manejar scroll automático
  useEffect(() => {
    const handleNewMessage = (message: MessageType) => {
      if (message.conversationId === safeConversationId) {
        setMessages(prev => {
          const exists = prev.some(m => m.id === message.id || m.tempId === message.tempId);
          return exists ? prev : [...prev, message];
        });

        if (autoScrollEnabled) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({
              behavior: 'smooth',
              block: 'nearest'
            });
          }, 50);
        }
      }
    };

    socketInstance?.on('new_message', handleNewMessage);
    return () => {
      socketInstance?.off('new_message', handleNewMessage);
    };
  }, [socketInstance, safeConversationId, autoScrollEnabled]);

  // Detectar posición del scroll
  const handleScroll = () => {
    const element = chatContainerRef.current;
    if (element) {
      const isNearBottom = 
        element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      setAutoScrollEnabled(isNearBottom);
    }
  };

  // Enviar notificación de escritura
  const sendTypingNotification = useCallback((newMessage: string) => {
    if (newMessage.trim().length > 0 && !isTyping && socketInstance && socketInitialized) {
      setIsTyping(true);
      
      // Enviar estado de "escribiendo" al receptor
      if (otherUser?.id) {
        socketUpdateTypingStatus({ conversationId: safeConversationId, isTyping: true });
      }
      
      // Limpiar timeout anterior si existe
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Establecer nuevo timeout para detener estado de "escribiendo" después de 3 segundos de inactividad
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (socketInstance && socketInitialized && otherUser?.id) {
          socketUpdateTypingStatus({ conversationId: safeConversationId, isTyping: false });
        }
      }, 3000);
    }
  }, [isTyping, socketInstance, socketInitialized, otherUser?.id]);

  // Monitoreo de estado para evitar que la mensajería quede bloqueada
  useEffect(() => {
    // Timeout de seguridad para evitar que isSending quede atascado en true
    let sendingTimeout: NodeJS.Timeout | null = null;
    
    if (isSending) {
      console.log('Estado de envío activado, configurando timeout de seguridad');
      // Si después de 10 segundos todavía está en "enviando", lo reseteamos
      sendingTimeout = setTimeout(() => {
        console.log('⚠️ Timeout de seguridad activado - reseteando estado de envío');
        setIsSending(false);
      }, 10000);
    }
    
    return () => {
      if (sendingTimeout) {
        clearTimeout(sendingTimeout);
      }
    };
  }, [isSending]);

  // Enviar un mensaje
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !otherUser || !canSendMessages) return;
    
    const tempId = `temp-${Date.now()}`;
    const messageContent = newMessage.trim();
    setNewMessage('');
    setIsSending(true);
    
    try {
      // Crear objeto de mensaje temporal
      const messageToSend: Message = {
        tempId,
        content: messageContent,
        senderId: currentUserId as string,
        receiverId: otherUser.id,
        createdAt: new Date(),
        status: 'sending',
        conversationId: safeConversationId,
      };
      
      // Añadir el mensaje a la lista local
      flushSync(() => {
        setMessages([...messages, messageToSend]);
      });
      
      await sendMessageToServer(messageToSend, tempId);
    } catch (error) {
      console.error('Error inesperado al enviar mensaje:', error);
      setIsSending(false);
    }
  };

  // Nueva función para enviar mensaje de voz
  const handleVoiceMessageSend = async (audioBlob: Blob) => {
    if (isSending || !otherUser || !canSendMessages) return;
    
    setIsSending(true);
    
    try {
      console.log("Preparando para enviar mensaje de voz...");
      
      // Crear un FormData para subir el archivo
      const formData = new FormData();
      
      // Crear un nuevo archivo con extensión más compatible
      const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, { 
        type: audioBlob.type 
      });
      
      console.log('Subiendo archivo de audio:', audioFile.name, audioFile.type, audioFile.size);
      
      formData.append('file', audioFile);
      formData.append('fileType', 'audio');
      
      // Subir a la API
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.user?.email || ''}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Error al subir el audio', errorText);
        alert("Error al subir el audio: " + errorText);
        return;
      }

      const data = await uploadResponse.json();
      // Usar la URL completa devuelta por la API
      const audioUrl = data.url;
      console.log('Audio subido correctamente, URL:', audioUrl);
      
      // Crear mensaje temporal
      const tempId = `voice-${Date.now()}`;
      const messageToSend: Message = {
        tempId,
        content: '',
        mediaUrl: audioUrl,
        messageType: 'voice',
        senderId: currentUserId as string,
        receiverId: otherUser.id,
        createdAt: new Date(),
        status: 'sending',
        conversationId: conversationId || '',
      };
      
      // Añadir el mensaje a la lista local
      flushSync(() => {
        setMessages([...messages, messageToSend]);
      });
      
      // Ocultar el grabador de voz DESPUÉS de enviar el mensaje
      // setIsVoiceRecorderVisible(false);
      
      // Enviar mensaje al servidor
      await sendMessageToServer(messageToSend, tempId);

    } catch (error) {
      console.error('Error enviando mensaje de voz:', error);
      alert("Error al enviar mensaje de voz");
    } finally {
      setIsSending(false);
    }
  };

  // Función para enviar mensajes al servidor
  const sendMessageToServer = async (message: Message, tempId: string) => {
    try {
      // Asegurarse de que el chat se desplaza hacia abajo
      setTimeout(() => {
        if (messagesEndRef.current) {
          messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
      // Verificar que otherUser no sea nulo
      if (!otherUser) {
        throw new Error('Usuario receptor no especificado');
      }
      
      // Enviar el mensaje a través de la API
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email || ''}`,
        },
        body: JSON.stringify({
          receiverId: otherUser.id,
          content: message.content,
          tempId,
          mediaUrl: message.mediaUrl,
          messageType: message.messageType,
          conversationId: message.conversationId || conversationId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }
      
      const data = await response.json();
      
      // Determine if message is at root level or in a nested 'message' property
      const messageData = data.message || data;
      
      // Check if we have valid message data with an ID
      if (messageData && messageData.id) {
        console.log('Mensaje enviado con éxito:', messageData);
        
        setMessages(prev =>
          prev.map((msg: Message) =>
            msg.tempId === tempId
              ? {
                  ...msg,
                  id: messageData.id,
                  status: 'sent',
                  conversationId: messageData.conversationId || conversationId,
                }
              : msg
          )
        );
        
        // No es necesario emitir el evento por socket.io, ya que la API notifica al servidor socket
        // y esto causa duplicación de mensajes
        
        // Borrar el comentario siguiente para depuración si es necesario
        // console.log('Mensaje enviado al servidor, esperando notificación bidireccional vía socket');
      } else {
        console.error('Respuesta de API inválida:', data);
        // Marcar el mensaje como error
        setMessages(prev =>
          prev.map((msg: Message) =>
            msg.tempId === tempId
              ? {
                  ...msg,
                  status: 'error',
                }
              : msg
          )
        );
      }
      
      // Restablecer el estado de envío después de completar la operación
      setIsSending(false);
      
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      
      // Actualizar el estado del mensaje a error
      setMessages(prev =>
        prev.map((msg: Message) =>
          msg.tempId === tempId
            ? { ...msg, status: 'error' }
            : msg
        )
      );
      
      // Restablecer el estado de envío incluso en caso de error
      setIsSending(false);
      
      alert('No se pudo enviar el mensaje. Inténtalo de nuevo.');
    }
  };

  // Marcar mensaje como leído
  const markMessageAsRead = (messageId?: string, conversationId?: string) => {
    if (!messageId || !conversationId || !socketInstance || !socketInitialized) {
      console.warn('No se puede marcar mensaje como leído. Faltan datos o socket no disponible', {
        messageId, conversationId, socketAvailable: !!socketInstance
      });
      return;
    }
    
    console.log(`Marcando mensaje ${messageId} como leído`);
    socketMarkMessageAsRead({
      messageId: messageId,
      conversationId: conversationId
    });
  };

  // Actualizar estado de un mensaje
  const updateMessageStatus = (messageId: string, status: MessageStatus) => {
    setMessages(prev =>
      prev.map((msg: Message) =>
        (msg.id === messageId || msg.tempId === messageId)
          ? { ...msg, status }
          : msg
      )
    );
  };

  // Manejar tecla Enter para enviar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Cuando la conversación cambia, restablecer todo
  useEffect(() => {
    if (safeConversationId) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      setErrorLoadingMessages(null);
      setPeerIsTyping(false);
      setIsTyping(false);
      setIsAtBottom(true);
      
      // Enfocar el input de mensaje
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    }
  }, [safeConversationId]);

  // Enviar estado de "escribiendo"
  useEffect(() => {
    if (!otherUser?.id || !socketInstance || !socketInitialized) return;
    
    if (isTyping) {
      socketUpdateTypingStatus({ conversationId: safeConversationId, isTyping: true });
      
      // Limpiar timeout anterior si existe
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Establecer nuevo timeout para detener estado de "escribiendo" después de 3 segundos de inactividad
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (socketInstance && socketInitialized) {
          socketUpdateTypingStatus({ conversationId: safeConversationId, isTyping: false });
        }
      }, 3000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, isTyping, otherUser?.id, socketInstance, socketInitialized]);

  // Unir a conversación cuando el socket esté listo
  useEffect(() => {
    if (socketInitialized && safeConversationId) {
      console.log(`Uniendo a conversación ${safeConversationId}`);
      joinConversation(safeConversationId);
    }
  }, [socketInitialized, safeConversationId, joinConversation]);

  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`);
      const messages = await response.json();
      setMessages(messages);
    } catch (error) {
      console.error('Error cargando mensajes:', error);
    }
  }, []);

  useEffect(() => {
    if (socketInitialized && safeConversationId) {
      console.log(`Uniendo a conversación ${safeConversationId}`);
      joinConversation(safeConversationId);
      fetchMessages(safeConversationId);
    }
  }, [socketInitialized, safeConversationId, joinConversation, fetchMessages]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Contenedor de mensajes */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner className="w-8 h-8 text-blue-500" />
          </div>
        ) : errorLoadingMessages ? (
          <div className="text-center py-4 text-red-500">
            <p>{errorLoadingMessages}</p>
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={() => {
                setErrorLoadingMessages(null);
                setPage(1);
                isFetchingRef.current = false;
              }}
            >
              Reintentar
            </Button>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <p>No hay mensajes aún. ¡Comienza la conversación!</p>
          </div>
        ) : (
          <>
            {/* Indicador de carga para mensajes antiguos */}
            {isLoadingMore && (
              <div className="text-center py-2">
                <LoadingSpinner className="w-5 h-5 text-blue-500 inline-block" />
                <span className="ml-2 text-sm text-gray-500">Cargando mensajes anteriores...</span>
              </div>
            )}
            
            {/* Lista de mensajes */}
            {messages.map((message, index) => {
              const isCurrentUser = message.senderId === currentUserId;
              const showAvatar = 
                index === 0 || 
                messages[index - 1].senderId !== message.senderId;
              
              return (
                <div
                  key={`${message.id || message.tempId || 'msg'}-${index}`}
                  className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
                >
                  {!isCurrentUser && showAvatar && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      {otherUser?.image ? (
                        <AvatarImage src={otherUser.image} alt={otherUser.username || 'Usuario'} />
                      ) : (
                        <AvatarFallback>
                          {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                  
                  <div className={`flex flex-col ${!isCurrentUser && showAvatar ? 'ml-0' : !isCurrentUser ? 'ml-10' : ''}`}>
                    <div
                      className={cn(
                        'max-w-xs md:max-w-md p-3 rounded-lg',
                        isCurrentUser
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                      )}
                    >
                      {/* Mostrar reproductor de audio si es un mensaje de voz */}
                      {message.messageType === 'voice' && message.mediaUrl ? (
                        <div className="flex flex-col space-y-2">
                          <span className={`text-xs ${isCurrentUser ? 'text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>
                            Mensaje de voz
                          </span>
                          <audio 
                            controls 
                            src={message.mediaUrl} 
                            className={`max-w-full rounded-md ${isCurrentUser ? 'audio-player-light' : 'audio-player-dark'}`}
                            controlsList="nodownload"
                            preload="metadata"
                          />
                        </div>
                      ) : (
                        <div className="text-sm break-words whitespace-pre-wrap">
                          {message.content}
                        </div>
                      )}
                    </div>
                    
                    <div className={`flex items-center mt-1 text-xs text-gray-500 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                      <span>
                        {message.createdAt &&
                          format(
                            typeof message.createdAt === 'string'
                              ? new Date(message.createdAt)
                              : message.createdAt,
                            'HH:mm'
                          )}
                      </span>
                      
                      {isCurrentUser && (
                        <span className="ml-1">
                          {message.status === 'sending' && 'Enviando...'}
                          {message.status === 'sent' && '✓'}
                          {message.status === 'delivered' && '✓✓'}
                          {message.status === 'read' && (
                            <span className="text-blue-500">✓✓</span>
                          )}
                          {message.status === 'error' && (
                            <span className="text-red-500">Error</span>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Indicador de escritura */}
            {peerIsTyping && (
              <div className="flex items-end gap-2">
                <Avatar className="h-8 w-8">
                  {otherUser?.image ? (
                    <AvatarImage src={otherUser.image} alt={otherUser.username || 'Usuario'} />
                  ) : (
                    <AvatarFallback>
                      {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg text-sm">
                  <span className="typing-indicator">
                    <span className="dot"></span>
                    <span className="dot"></span>
                    <span className="dot"></span>
                  </span>
                </div>
              </div>
            )}
            
            {/* Elemento para el scroll automático */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input para enviar mensajes */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {canSendMessages === false ? (
          <div className="text-center text-gray-500 mb-2">
            <p>No puedes enviar mensajes a este usuario.</p>
            <p className="text-xs">
              Ambos usuarios deben seguirse mutuamente para poder enviar mensajes.
            </p>
          </div>
        ) : isCheckingRelationship ? (
          <div className="text-center text-gray-500 mb-2">
            <p>Verificando si puedes enviar mensajes...</p>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <Textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                sendTypingNotification(e.target.value);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 resize-none max-h-32"
              rows={1}
              disabled={isSending || !canSendMessages}
            />
            <div className="flex gap-2">
              <Button
                size="icon"
                onClick={() => setIsVoiceRecorderVisible(true)}
                disabled={isSending || !canSendMessages}
                className="h-10 w-10 rounded-full bg-green-500 hover:bg-green-600"
                title="Grabar mensaje de voz"
              >
                <Mic className="h-5 w-5 text-white" />
              </Button>
              <Button
                size="icon"
                onClick={sendMessage}
                disabled={!newMessage.trim() || isSending || !canSendMessages}
                className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600"
                title="Enviar mensaje"
              >
                <Send className="h-5 w-5 text-white" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Componente de grabación de voz */}
      {isVoiceRecorderVisible && (
        <VoiceMessageRecorder
          onSend={handleVoiceMessageSend}
          onCancel={() => setIsVoiceRecorderVisible(false)}
          isVisible={isVoiceRecorderVisible}
          senderId={currentUserId || ''}
          receiverId={otherUser?.id || ''}
          session={session}
          onClose={() => {
            console.log("onClose llamado desde VoiceMessageRecorder");
            // Solo cerrar el modal cuando se complete el envío
            setIsVoiceRecorderVisible(false);
          }}
          setUploadStatus={(status) => {
            console.log("Estado de carga actualizado:", status);
            if (status === 'error') {
              alert("Error al enviar mensaje de voz");
            }
            setIsSending(status === 'success' ? false : true);
          }}
        />
      )}

      {/* Estilos para el indicador de escritura */}
      <style jsx global>{`
        .typing-indicator {
          display: flex;
          align-items: center;
        }
        
        .dot {
          background-color: rgba(0, 0, 0, 0.5);
          border-radius: 50%;
          display: inline-block;
          height: 5px;
          margin-right: 3px;
          width: 5px;
          animation: bounce 1.5s infinite;
        }
        
        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes bounce {
          0%, 60%, 100% {
            transform: translateY(0);
          }
          30% {
            transform: translateY(-5px);
          }
        }
        
        .dark .dot {
          background-color: rgba(255, 255, 255, 0.5);
        }
        
        .audio-player-light {
          background-color: #f0f0f0;
          border: 1px solid #ddd;
        }
        
        .audio-player-dark {
          background-color: #333;
          border: 1px solid #444;
        }
        
        .audio-player-light::-webkit-media-controls-panel {
          background-color: #f0f2f5;
        }
        
        .audio-player-dark::-webkit-media-controls-panel {
          background-color: #333;
        }
        
        @keyframes progressAnim {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
