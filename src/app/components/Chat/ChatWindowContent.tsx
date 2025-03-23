"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { flushSync } from 'react-dom';
import useSocket, { MessageType } from '@/src/hooks/useSocket';
import { API_ROUTES } from '@/src/config/api-routes';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';

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
  
  // Socket.io
  const socket = useSocket({
    userId: currentUserId,
    username: session?.user?.name || session?.user?.username || undefined,
    onConnect: () => {
      console.log('Socket conectado correctamente');
      setSocketInitialized(true);
    },
    onDisconnect: () => {
      console.log('Socket desconectado');
      setSocketInitialized(false);
    },
    onNewMessage: (message: MessageType) => {
      if (message.conversationId === conversationId || 
          (message.senderId === otherUser?.id && message.receiverId === currentUserId) ||
          (message.senderId === currentUserId && message.receiverId === otherUser?.id)) {
        // Evitar duplicados
        const messageExists = messages.some(m => m.id === message.id || m.tempId === message.id);
        
        if (!messageExists) {
          console.log('Mensaje recibido:', message);
          setMessages(prev => [...prev, message]);
          // Si el mensaje es del otro usuario, marcarlo como leído
          if (message.senderId === otherUser?.id && message.id) {
            if (socket && socketInitialized) {
              socket.markMessageAsRead({
                messageId: message.id,
                conversationId: message.conversationId || conversationId || ''
              });
            } else {
              console.warn('Socket no disponible, no se puede marcar mensaje como leído');
            }
          }
        }
      } else {
        console.log('Mensaje ignorado por no pertenecer a esta conversación');
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
    if (!conversationId || !currentUserId || isFetchingRef.current) return;
    
    const fetchMessages = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoadingMessages(true);
      setErrorLoadingMessages(null);
      
      try {
        const response = await fetch(
          `${API_ROUTES.messages.list}?with=${conversationId}&page=${page}&limit=${pageSize}`
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
            markMessageAsRead(msg.id, conversationId);
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
  }, [conversationId, currentUserId, otherUser?.id]);

  // Cargar más mensajes
  const loadMoreMessages = async () => {
    if (!conversationId || isLoadingMore || !hasMore || isFetchingRef.current) return;
    
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
        `${API_ROUTES.messages.list}?with=${conversationId}&page=${nextPage}&limit=${pageSize}`
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
    if (!isLoadingMessages && messagesEndRef.current && isAtBottom) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoadingMessages, isAtBottom]);

  // Detectar si el usuario está en el fondo del chat
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottomNow = scrollHeight - scrollTop - clientHeight < 50;
      setIsAtBottom(isAtBottomNow);
      
      // Cargar más mensajes si se llega arriba del todo
      if (scrollTop === 0 && hasMore && !isLoadingMore) {
        loadMoreMessages();
      }
    }
  };

  // Enviar notificación de escritura
  const sendTypingNotification = useCallback((newMessage: string) => {
    if (newMessage.trim().length > 0 && !isTyping && socket && socketInitialized) {
      setIsTyping(true);
      
      // Enviar estado de "escribiendo" al receptor
      if (otherUser?.id) {
        socket.updateTypingStatus({ conversationId, isTyping: true });
      }
      
      // Limpiar timeout anterior si existe
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Establecer nuevo timeout para detener estado de "escribiendo" después de 3 segundos de inactividad
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (socket && socketInitialized && otherUser?.id) {
          socket.updateTypingStatus({ conversationId, isTyping: false });
        }
      }, 3000);
    }
  }, [isTyping, socket, socketInitialized, otherUser?.id]);

  // Enviar un mensaje
  const sendMessage = async () => {
    if (!newMessage.trim() || !otherUser?.id || !currentUserId || isSending) return;
    
    const tempId = `temp-${Date.now()}`;
    const messageToSend = {
      tempId,
      content: newMessage.trim(),
      senderId: currentUserId,
      receiverId: otherUser.id,
      createdAt: new Date(),
      status: 'sending' as MessageStatus,
      conversationId,
    };
    
    // Añadir el mensaje a la UI inmediatamente
    setMessages(prev => [...prev, messageToSend]);
    setNewMessage('');
    setIsSending(true);
    
    // Asegurarse de que el chat se desplaza hacia abajo
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    
    try {
      // Emitir evento de "no está escribiendo"
      if (isTyping) {
        setIsTyping(false);
        if (socket && socketInitialized) {
          socket.updateTypingStatus({ conversationId, isTyping: false });
        }
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
      
      // Enviar el mensaje a través de la API
      const response = await fetch(API_ROUTES.messages.send, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: otherUser.id,
          content: messageToSend.content,
          tempId,
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
                  status: 'sent' as MessageStatus,
                  conversationId: messageData.conversationId || conversationId,
                }
              : msg
          )
        );
        
        // Emitir evento de mensaje enviado a través de socket.io
        if (socket && socketInitialized) {
          socket.sendMessage({
            ...messageData,
            tempId,
          });
        }
      } else {
        console.error('Respuesta de API inválida:', data);
        // Marcar el mensaje como error
        setMessages(prev =>
          prev.map((msg: Message) =>
            msg.tempId === tempId
              ? {
                  ...msg,
                  status: 'error' as MessageStatus,
                }
              : msg
          )
        );
      }
      
    } catch (error) {
      console.error('Error al enviar el mensaje:', error);
      
      // Actualizar el estado del mensaje a error
      setMessages(prev =>
        prev.map((msg: Message) =>
          msg.tempId === tempId
            ? { ...msg, status: 'error' as MessageStatus }
            : msg
        )
      );
      
      alert('No se pudo enviar el mensaje. Inténtalo de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  // Marcar mensaje como leído
  const markMessageAsRead = (messageId?: string, conversationId?: string) => {
    if (!messageId || !conversationId || !socket || !socketInitialized) {
      console.warn('No se puede marcar mensaje como leído. Faltan datos o socket no disponible', {
        messageId, conversationId, socketAvailable: !!socket
      });
      return;
    }
    
    console.log(`Marcando mensaje ${messageId} como leído`);
    socket.markMessageAsRead({
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
    if (conversationId) {
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
  }, [conversationId]);

  // Enviar estado de "escribiendo"
  useEffect(() => {
    if (!otherUser?.id || !socket || !socketInitialized) return;
    
    if (isTyping) {
      socket.updateTypingStatus({ conversationId, isTyping: true });
      
      // Limpiar timeout anterior si existe
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Establecer nuevo timeout para detener estado de "escribiendo" después de 3 segundos de inactividad
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (socket && socketInitialized) {
          socket.updateTypingStatus({ conversationId, isTyping: false });
        }
      }, 3000);
    }
    
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [currentUserId, isTyping, otherUser?.id, socket, socketInitialized]);

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
                        'max-w-xs md:max-w-md px-4 py-2 rounded-lg text-sm break-words',
                        isCurrentUser
                          ? 'bg-blue-500 text-white rounded-br-none'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
                      )}
                    >
                      {message.content}
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
            <Button
              size="icon"
              onClick={sendMessage}
              disabled={!newMessage.trim() || isSending || !canSendMessages}
              className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-5 w-5 text-white" />
            </Button>
          </div>
        )}
      </div>

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
      `}</style>
    </div>
  );
}
