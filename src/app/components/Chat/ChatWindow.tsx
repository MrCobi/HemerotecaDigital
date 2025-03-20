import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/app/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { flushSync } from 'react-dom';
import useSocket, { MessageType } from '@/src/hooks/useSocket';
import { API_ROUTES } from '@/src/config/api-routes';

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

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: User | null;
  initialMessages?: Message[];
  conversationId?: string;
}

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

export const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  onClose,
  otherUser,
  initialMessages = [],
  conversationId,
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  
  // Estado para controlar la carga de mensajes
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [_showEmojiPicker, _setShowEmojiPicker] = useState(false);
  
  // Socket.io integration
  const {
    connected,
    error: socketError,
    sendMessage: sendSocketMessage,
    setTypingStatus,
    markMessageAsRead
  } = useSocket({
    userId: currentUserId,
    username: session?.user?.name || session?.user?.username || 'Usuario',
    onNewMessage: (message: MessageType) => {
      console.log('Hook recibió mensaje:', message);
      console.log('Comprobando si es relevante:', {
        otherUserId: otherUser?.id,
        currentUserId,
        esParaEstaConversacion: 
          (message.senderId === otherUser?.id && message.receiverId === currentUserId) ||
          (message.senderId === currentUserId && message.receiverId === otherUser?.id)
      });
      
      if (
        (message.senderId === otherUser?.id && message.receiverId === currentUserId) ||
        (message.senderId === currentUserId && message.receiverId === otherUser?.id)
      ) {
        console.log('Procesando mensaje relevante para esta conversación:', message);
        handleNewMessage(message);
        
        // Marcar como leído si el mensaje es del otro usuario
        if (message.senderId === otherUser?.id && message.id) {
          console.log('Marcando mensaje como leído:', message.id);
          markMessageAsRead(message.id, message.conversationId || conversationId || '');
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
        prev.map(msg => 
          (msg.id === data.messageId || msg.tempId === data.messageId) 
            ? { ...msg, read: true, status: 'read' } 
            : msg
        )
      );
    }
  });

  // Función para manejar nuevos mensajes
  const handleNewMessage = (message: MessageType) => {
    const startTime = performance.now();
    console.log('HandleNewMessage iniciado para:', message.id || message.tempId, 'de', message.senderId, 'a', message.receiverId);
    
    // Asegurar que message.createdAt sea una cadena de fecha válida
    if (typeof message.createdAt === 'object' && message.createdAt instanceof Date) {
      message.createdAt = message.createdAt.toISOString();
    } else if (typeof message.createdAt !== 'string') {
      message.createdAt = new Date().toISOString();
    }
    
    // Validar que el mensaje pertenezca a esta conversación
    const isInConversation = (
      (message.senderId === currentUserId && message.receiverId === otherUser?.id) ||
      (message.senderId === otherUser?.id && message.receiverId === currentUserId)
    );
    
    if (!isInConversation) {
      console.log('Mensaje ignorado porque no pertenece a esta conversación');
      console.log(`Conversación actual: ${currentUserId} <-> ${otherUser?.id}`);
      console.log(`Mensaje: ${message.senderId} -> ${message.receiverId}`);
      return;
    }
    
    // Asegurar que el contenido sea válido
    if (!message.content) {
      console.error('Mensaje sin contenido ignorado');
      return;
    }
    
    // Añadir un log detallado del mensaje para depuración
    console.log('Objeto mensaje completo:', JSON.stringify(message, null, 2));
    
    setMessages(prevMessages => {
      // Primero verificar si este mensaje ya existe en la lista
      // Comparamos tanto id como tempId para cubrir mensajes locales y remotos
      const existingMessage = prevMessages.find(msg => 
        (msg.id && msg.id === message.id) || 
        (msg.tempId && msg.tempId === message.tempId) ||
        (message.id && msg.tempId === message.id) ||
        (message.tempId && msg.id === message.tempId)
      );
      
      console.log('¿Mensaje ya existe en la lista?', !!existingMessage);
      
      // Si el mensaje no existe, añadirlo a la lista
      if (!existingMessage) {
        console.log('Añadiendo nuevo mensaje a la lista. ID:', message.id || message.tempId);
        
        // Crear una copia del arreglo y añadir el nuevo mensaje
        const newMessagesList = [...prevMessages, message];
        
        // Ordenar mensajes por fecha de creación
        return newMessagesList.sort((a, b) => {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeA - timeB;
        });
      }
      
      // Si el mensaje ya existe, actualizar su estado y contenido
      console.log('Actualizando mensaje existente');
      return prevMessages.map(msg => {
        // Comparar todos los posibles IDs para encontrar coincidencias
        if (
          (msg.id && msg.id === message.id) || 
          (msg.tempId && msg.tempId === message.tempId) ||
          (message.id && msg.tempId === message.id) ||
          (message.tempId && msg.id === message.tempId)
        ) {
          // Mantener el ID existente si es definitivo o usar el nuevo si existe
          const finalId = msg.id || message.id;
          // Mantener tempId solo si no hay ID definitivo
          const finalTempId = finalId ? undefined : (msg.tempId || message.tempId);
          
          return { 
            ...msg, 
            ...message,
            id: finalId,
            tempId: finalTempId,
            status: message.status || msg.status
          };
        }
        return msg;
      });
    });
    
    const processingTime = performance.now() - startTime;
    console.log(`Procesamiento de mensaje completado en ${processingTime.toFixed(2)}ms`);
    
    // Desplazar al fondo del chat si estamos en la parte inferior
    if (isAtBottom && messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Actualizar estado de un mensaje
  const updateMessageStatus = (messageId: string, status: MessageStatus) => {
    setMessages(prev => 
      prev.map(msg => 
        (msg.id === messageId || msg.tempId === messageId) 
          ? { ...msg, status } 
          : msg
      )
    );
  };

  // Desplazarse al fondo del chat cuando se añaden nuevos mensajes
  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isAtBottom]);

  // Detectar si el usuario está en el fondo del chat
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isAtBottomNow = scrollHeight - scrollTop - clientHeight < 30;
      setIsAtBottom(isAtBottomNow);
    };

    chatContainer.addEventListener('scroll', handleScroll);
    handleScroll();

    return () => {
      chatContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Manejar envío de mensajes
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !otherUser) return;

    try {
      setIsSending(true);
      
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Crear nuevo mensaje
      const message = {
        tempId,
        content: newMessage,
        senderId: currentUserId,
        receiverId: otherUser.id,
        createdAt: new Date(),
        status: 'sending',
        conversationId
      } as Message;
      
      console.log('Enviando mensaje:', message);
      
      // Actualizar UI inmediatamente para mostrar el mensaje enviado localmente
      flushSync(() => {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
      });
      
      // Desplazar al fondo del chat
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
      
      // Enviar mensaje a través de Socket.io
      const socketSuccess = sendSocketMessage(message);
      
      if (!socketSuccess) {
        console.error('Error al enviar mensaje mediante Socket.io');
        updateMessageStatus(tempId, 'error');
      } else {
        console.log('Mensaje enviado exitosamente via Socket.io');
      }
      
      // RESPALDO: También enviar el mensaje a la API REST para garantizar persistencia
      try {
        const response = await fetch(API_ROUTES.messages.send, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: message.content,
            receiverId: message.receiverId,
            tempId: message.tempId
          }),
        });
        
        if (!response.ok) {
          console.warn('Advertencia: El mensaje se envió por Socket.io pero puede no haberse guardado en la base de datos');
        } else {
          const savedMessage = await response.json();
          console.log('Mensaje guardado correctamente en base de datos vía API', savedMessage);
        }
      } catch (apiError) {
        console.warn('Error al guardar mensaje vía API (fallback):', apiError);
        // No actualizamos el estado del mensaje como error ya que Socket.io puede haberlo enviado correctamente
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Manejar reenvío de mensajes fallidos
  const handleResendMessage = async (messageId: string) => {
    const messageToResend = messages.find(m => m.id === messageId || m.tempId === messageId);
    if (!messageToResend) return;

    // Actualizar estado a 'sending'
    updateMessageStatus(messageId, 'sending');
    
    // Reenviar a través de Socket.io
    const success = sendSocketMessage(messageToResend);
    
    if (!success) {
      updateMessageStatus(messageId, 'error');
    }
  };

  // Manejar teclas en el textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Manejar estado de typing
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
    
    if (otherUser?.id && !isTyping) {
      setIsTyping(true);
      setTypingStatus(otherUser.id, true);
    }
    
    // Reset typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set typing timeout
    typingTimeoutRef.current = setTimeout(() => {
      if (otherUser?.id) {
        setIsTyping(false);
        setTypingStatus(otherUser.id, false);
      }
    }, 2000);
  };

  // Agrupar mensajes por fecha
  const groupedMessages = messages.reduce<Record<string, Message[]>>((groups, message) => {
    const date = new Date(message.createdAt);
    const dateKey = format(date, 'yyyy-MM-dd');
    
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    
    groups[dateKey].push(message);
    return groups;
  }, {});

  // Renderizar mensajes agrupados por fecha
  const renderGroupedMessages = () => {
    return Object.entries(groupedMessages).map(([dateKey, messages]) => {
      const date = new Date(dateKey);
      const day = format(date, 'd');
      const month = format(date, 'MMMM');
      const weekday = format(date, 'EEEE');
      const formattedDate = `${weekday}, ${day} de ${month}`;
      
      return (
        <div key={dateKey} className="flex flex-col space-y-4 mb-4">
          <div className="flex justify-center">
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {formattedDate}
            </span>
          </div>
          
          {messages.map((message, index) => {
            const isSelfMessage = message.senderId === currentUserId;
            const messageTime = format(new Date(message.createdAt), 'HH:mm');
            
            return (
              <div
                key={message.id || message.tempId || index}
                className={cn(
                  "flex",
                  isSelfMessage ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    isSelfMessage
                      ? "bg-blue-500 text-white dark:bg-blue-600 rounded-br-none"
                      : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded-bl-none"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-xs opacity-70">{messageTime}</span>
                    
                    {isSelfMessage && (
                      <span className="text-xs">
                        {message.status === 'sending' && '⌛'}
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && '✓✓'}
                        {message.status === 'error' && (
                          <button 
                            onClick={() => handleResendMessage(message.id || message.tempId || '')}
                            className="text-red-400 text-xs hover:underline"
                          >
                            Error - Reintentar
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    });
  };

  // Render messages grouped by date
  const renderMessagesByDate = () => {
    // Agrupar mensajes por fecha (sin hora)
    const messagesByDate: Record<string, Message[]> = {};
    
    messages.forEach((message) => {
      const date = new Date(message.createdAt);
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      
      if (!messagesByDate[dateKey]) {
        messagesByDate[dateKey] = [];
      }
      
      messagesByDate[dateKey].push(message);
    });
    
    // Ordenar fechas cronológicamente
    const sortedDates = Object.keys(messagesByDate).sort((a, b) => {
      const dateA = a.split('-').map(Number);
      const dateB = b.split('-').map(Number);
      
      for (let i = 0; i < 3; i++) {
        if (dateA[i] !== dateB[i]) {
          return dateA[i] - dateB[i];
        }
      }
      
      return 0;
    });
    
    return sortedDates.map((dateKey) => {
      const messages = messagesByDate[dateKey];
      const date = new Date(messages[0].createdAt);
      
      // Formatear fecha según idioma local
      const day = format(date, 'd');
      const month = format(date, 'MMMM');
      const weekday = format(date, 'EEEE');
      const formattedDate = `${weekday}, ${day} de ${month}`;
      
      return (
        <div key={dateKey} className="flex flex-col space-y-4 mb-4">
          <div className="flex justify-center">
            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {formattedDate}
            </span>
          </div>
          
          {messages.map((message, index) => {
            const isSelfMessage = message.senderId === currentUserId;
            const messageTime = format(new Date(message.createdAt), 'HH:mm');
            
            return (
              <div
                key={message.id || message.tempId || index}
                className={cn(
                  "flex",
                  isSelfMessage ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-lg px-4 py-2",
                    isSelfMessage
                      ? "bg-blue-500 text-white dark:bg-blue-600 rounded-br-none"
                      : "bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 rounded-bl-none"
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-xs opacity-70">{messageTime}</span>
                    
                    {isSelfMessage && (
                      <span className="text-xs">
                        {message.status === 'sending' && '⌛'}
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && '✓✓'}
                        {message.status === 'error' && (
                          <button 
                            onClick={() => handleResendMessage(message.id || message.tempId || '')}
                            className="text-red-400 text-xs hover:underline"
                          >
                            Error - Reintentar
                          </button>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      );
    });
  };

  // Función para desplazarse al final del chat
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Manejar desplazamiento para detectar cuando el usuario está en la parte inferior
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottom = Math.abs(scrollHeight - scrollTop - clientHeight) < 10;
      setIsAtBottom(isAtBottom);
    }
  };

  // Función para cargar mensajes históricos de la conversación
  const loadHistoricalMessages = useCallback(async () => {
    if (!otherUser?.id || !currentUserId || isLoadingMessages || messagesLoaded) return;
    
    setIsLoadingMessages(true);
    console.log(`Cargando mensajes históricos de la conversación entre ${currentUserId} y ${otherUser.id}`);
    
    try {
      const response = await fetch(API_ROUTES.messages.get(otherUser.id), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error(`Error al cargar mensajes: ${response.status} ${response.statusText}`);
        throw new Error('No se pudieron cargar los mensajes históricos');
      }
      
      const data = await response.json();
      
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('No hay mensajes históricos para esta conversación');
        setMessagesLoaded(true);
        return;
      }
      
      console.log(`${data.length} mensajes históricos cargados`);
      
      interface HistoricalMessage {
        id: string;
        content: string;
        senderId: string;
        receiverId: string;
        createdAt: string;
        read?: boolean;
      }
      
      // Define explicit type for message parameter in map function
      const formattedMessages = data
        .filter((message): message is HistoricalMessage => Boolean(message))
        .map((message: HistoricalMessage): { 
          id: string; 
          content: string; 
          senderId: string; 
          receiverId: string; 
          createdAt: string; 
          status: MessageStatus;
        } => {
          return {
            id: message.id,
            content: message.content,
            senderId: message.senderId,
            receiverId: message.receiverId,
            createdAt: message.createdAt,
            status: (message.read ? 'read' : 'delivered') as MessageStatus
          };
        });
      
      // Usar una función de estado para asegurar que no perdemos mensajes recientes
      setMessages(prevMessages => {
        // Crear un mapa de los mensajes actuales por ID para evitar duplicados
        const existingMsgMap = new Map(prevMessages.map(msg => [
          msg.id || msg.tempId, 
          msg
        ]));
        
        // Añadir mensajes históricos si no existen en la lista actual
        formattedMessages.forEach((msg) => {
          if (!existingMsgMap.has(msg.id)) {
            // Convert the status string to MessageStatus type
            const messageWithCorrectStatus: Message = {
              ...msg,
              status: msg.status as MessageStatus
            };
            existingMsgMap.set(msg.id, messageWithCorrectStatus);
          }
        });
        
        // Convertir el mapa de vuelta a array y ordenar por fecha
        const mergedMessages = Array.from(existingMsgMap.values());
        return mergedMessages.sort((a, b) => {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });
      });
      
      setMessagesLoaded(true);
      console.log('Mensajes históricos cargados correctamente');
      
    } catch (error) {
      console.error('Error al cargar mensajes históricos:', error);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [otherUser?.id, currentUserId, isLoadingMessages, messagesLoaded]);

  // Cargar mensajes históricos cuando se abre la conversación
  useEffect(() => {
    if (isOpen && otherUser?.id && currentUserId && !messagesLoaded) {
      loadHistoricalMessages();
    }
  }, [isOpen, otherUser?.id, currentUserId, messagesLoaded, loadHistoricalMessages]);
  
  // Debug: Mostrar el avance del tiempo cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      // Verificar si otherUser y currentUserId estan definidos para confirmar inicializacion correcta
      console.log('Estado actual de chat:', {
        time: new Date().toISOString(),
        otherUserId: otherUser?.id,
        currentUserId,
        mensajesEnLista: messages.length,
        estadoConexion: connected ? 'Conectado' : 'Desconectado',
      });
    }, 5000);
    
    return () => clearInterval(interval);
  }, [otherUser?.id, currentUserId, messages.length, connected]);

  // Limpiar estados al cerrar la ventana de chat
  const handleClose = () => {
    // Prevenir cierres inesperados cuando estamos enviando mensajes
    if (isSending) {
      console.log('Evitando cierre mientras se envía un mensaje');
      return;
    }
    
    setIsSending(false);
    setPeerIsTyping(false);
    setNewMessage('');
    setMessagesLoaded(false); // Resetear el estado de carga de mensajes
    onClose();
  };

  useEffect(() => {
    loadHistoricalMessages();
  }, [loadHistoricalMessages]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Solo permitir cerrar si es un evento real del usuario
      // Si la ventana está abierta y se está intentando cerrar, llamar a handleClose
      if (isOpen && !open) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px] md:max-w-[600px] lg:max-w-[700px] max-h-[90vh] p-0">
        <div className="flex flex-col h-[80vh] bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
          {/* Header */}
          <DialogHeader className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm flex flex-row items-center">
            <div className="flex items-center space-x-3 flex-1">
              <Avatar className="h-10 w-10 border-2 border-blue-100 dark:border-blue-800">
                <AvatarImage src={otherUser?.image || ''} alt={otherUser?.username || ''} />
                <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-200">
                  {otherUser?.username ? otherUser.username[0].toUpperCase() : '?'}
                </AvatarFallback>
              </Avatar>
              <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
                {otherUser?.username || 'Chat'}
              </DialogTitle>
            </div>
            {isMobile && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="rounded-full" 
                onClick={handleClose}
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </Button>
            )}
          </DialogHeader>
          
          {/* Messages Area */}
          <div 
            ref={chatContainerRef} 
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-transparent"
            onScroll={handleScroll}
          >
            {/* Message loading indicator */}
            {isLoadingMessages && (
              <div className="flex justify-center my-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
              </div>
            )}
            
            {/* Messages */}
            {renderMessagesByDate()}
            
            {/* Typing indicator */}
            {peerIsTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-300 rounded-lg px-3 py-2 text-sm animate-pulse">
                  Escribiendo...
                </div>
              </div>
            )}
            
            {/* Bottom reference for auto-scroll */}
            <div ref={messagesEndRef} />
            
            {/* Scroll to bottom button */}
            {!isAtBottom && messages.length > 5 && (
              <button
                onClick={scrollToBottom}
                className="absolute bottom-20 right-4 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full p-2 shadow-md hover:bg-blue-200 dark:hover:bg-blue-800 transition-all"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>
            )}
          </div>
          
          {/* Input Area */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
            <div className="flex items-end space-x-2">
              <Textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un mensaje..."
                className="flex-1 min-h-[60px] max-h-[120px] resize-none border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus-visible:ring-blue-500 dark:focus-visible:ring-blue-400"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
                className={`px-3 py-2 h-[60px] bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white ${
                  !newMessage.trim() || isSending
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatWindow;
