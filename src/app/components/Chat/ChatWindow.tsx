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

  // Verificar si los usuarios se siguen mutuamente
  useEffect(() => {
    if (!otherUser?.id || !currentUserId || !isOpen) return;
    
    const checkMutualFollow = async () => {
      try {
        setIsCheckingRelationship(true);
        const response = await fetch(`/api/relationships/check?targetUserId=${otherUser.id}`);
        
        if (response.ok) {
          const data = await response.json();
          // Solo permitir enviar mensajes si ambos usuarios se siguen mutuamente
          setCanSendMessages(data.isMutualFollow);
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
  }, [otherUser?.id, currentUserId, isOpen]);

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
    
    // Verificar si los usuarios se siguen mutuamente antes de enviar
    if (canSendMessages === false) {
      console.error('No se pueden enviar mensajes: los usuarios no se siguen mutuamente');
      return;
    }

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

  // Capturar focus para evitar que la ventana se vuelva a abrir
  useEffect(() => {
    const closeOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Agregar el event listener cuando la ventana está abierta
    if (isOpen) {
      window.addEventListener('keydown', closeOnEscape);
    }

    // Remover cuando se desmonta o cierra
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen, onClose]);

  // No permitir que la ventana se abra sin interacción del usuario
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    // Si la ventana está abierta y no hay actividad reciente, cerrarla después de un tiempo
    if (isOpen) {
      const lastMessageTime = messages.length > 0
        ? new Date(messages[messages.length - 1].createdAt).getTime()
        : Date.now();
        
      const timeSinceLastMessage = Date.now() - lastMessageTime;
      
      // Si no ha habido actividad en más de 5 minutos y la ventana se abrió automáticamente, cerrarla
      if (timeSinceLastMessage > 5 * 60 * 1000) {
        timeoutId = setTimeout(() => {
          onClose();
        }, 1000);
      }
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOpen, messages, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Solo permitir cerrar si es un evento real del usuario
      // Si la ventana está abierta y se está intentando cerrar, llamar a handleClose
      if (isOpen && !open) {
        handleClose();
      }
    }}>
      <DialogContent className="sm:max-w-[500px] p-0 h-[80vh] flex flex-col">
        <DialogHeader className="px-4 py-2 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                <AvatarImage src={otherUser?.image || '/images/AvatarPredeterminado.webp'} />
                <AvatarFallback>{otherUser?.name?.charAt(0) || otherUser?.username?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
              <DialogTitle className="text-base font-medium">
                {otherUser?.name || otherUser?.username || 'Usuario'}
              </DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Contenedor de mensajes con scroll */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
        >
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <span className="loader"></span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2">
              <p>No hay mensajes todavía</p>
              {canSendMessages === false && (
                <div className="bg-yellow-100 text-yellow-800 p-3 rounded-md text-sm">
                  Para poder enviar mensajes, ambos usuarios deben seguirse mutuamente.
                </div>
              )}
            </div>
          ) : (
            renderMessagesByDate()
          )}
          
          {/* Indicador "Escribiendo..." */}
          {peerIsTyping && (
            <div className="flex items-center space-x-2 text-muted-foreground text-xs italic">
              <span className="typing-indicator"></span>
              <span>Escribiendo...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Formulario de envío */}
        <form onSubmit={handleSendMessage} className="border-t p-4">
          {canSendMessages === false && (
            <div className="bg-yellow-100 text-yellow-800 p-3 mb-3 rounded-md text-sm">
              Para poder enviar mensajes, ambos usuarios deben seguirse mutuamente.
            </div>
          )}
          <div className="flex items-end gap-2">
            <Textarea
              ref={messageInputRef}
              className="min-h-10 flex-1 resize-none"
              placeholder={canSendMessages === false ? "No puedes enviar mensajes" : "Escribe tu mensaje..."}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              disabled={isSending || canSendMessages === false}
              rows={1}
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={isSending || !newMessage.trim() || canSendMessages === false}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChatWindow;
