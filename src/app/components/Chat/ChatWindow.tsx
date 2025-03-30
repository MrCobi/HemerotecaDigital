import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/app/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { X, Send, Mic, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { flushSync } from 'react-dom';
import useSocket, { MessageType } from '@/src/hooks/useSocket';
import { API_ROUTES } from '@/src/config/api-routes';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import AudioPlayer from './AudioPlayer';

type User = {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

// Definir Message como un tipo independiente para evitar conflictos
type Message = {
  id?: string;
  tempId?: string;
  content: string | null;
  senderId: string;
  receiverId?: string;
  createdAt: Date | string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  conversationId?: string;
  read?: boolean;
  messageType?: 'text' | 'image' | 'voice' | 'video' | 'file';
  mediaUrl?: string; // URL para mensajes de voz u otros medios
  imageUrl?: string; // URL específica para imágenes
  sender?: {
    id: string;
    username?: string;
    name?: string;
    image?: string;
  };
};

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: User | null;
  _initialMessages?: Message[];
  conversationId?: string;
}

const ChatWindow = ({
  isOpen,
  onClose,
  otherUser,
  _initialMessages = [],
  conversationId,
}: ChatWindowProps) => {
  // Estado y lógica del componente
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Socket para comunicación en tiempo real
  const { connected, sendMessage, socketInstance, updateTypingStatus } = useSocket({
    userId: currentUserId || undefined,
    onNewMessage: (message) => {
      // Solo añadir el mensaje si pertenece a esta conversación
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
        
        // Desplazar al fondo si ya estamos en el fondo
        if (isAtBottom) {
          scrollToBottom();
        }
      }
    },
    onTypingStatus: (status) => {
      // Solo actualizar estado de tipeo si coincide con la conversación actual
      if (status.conversationId === conversationId && status.userId !== currentUserId) {
        setPeerIsTyping(status.isTyping);
      }
    }
  });

  // Referencias para el manejo del scroll
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Estados para el manejo de mensajes
  const [newMessage, setNewMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState<boolean | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingMoreMessages, setIsLoadingMoreMessages] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [audioPlaying, setAudioPlaying] = useState<string | null>(null);

  // Referencias para temporizadores
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCheckingRelationshipRef = useRef(false);

  // Referencia al reproductor de audio
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Verificar si los usuarios se siguen mutuamente
  useEffect(() => {
    if (!otherUser?.id || !currentUserId || !isOpen) return;

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
        isCheckingRelationshipRef.current = true;
        const response = await fetch(`/api/relationships/check?targetUserId=${otherUser.id}`);

        if (response.ok) {
          const data = await response.json();
          // Solo permitir enviar mensajes si ambos usuarios se siguen mutuamente
          setCanSendMessages(data.isMutualFollow);

          // Guardar en sessionStorage para evitar peticiones repetidas
          sessionStorage.setItem(relationshipKey, data.isMutualFollow ? 'true' : 'false');
        } else {
          console.error('Error al verificar relación de seguimiento:', response.status);
          setCanSendMessages(false);
        }
      } catch (error) {
        console.error('Error al verificar relación de seguimiento:', error);
        setCanSendMessages(false);
      } finally {
        isCheckingRelationshipRef.current = false;
      }
    };

    checkMutualFollow();
  }, [otherUser?.id, currentUserId, isOpen]);

  // Función para manejar nuevos mensajes
  const handleNewMessage = (message: MessageType) => {
    const startTime = performance.now();
    console.log('HandleNewMessage iniciado para:', message.id || message.tempId, 'de', message.senderId, 'a', message.receiverId);

    // Asegurar que message.createdAt sea una cadena de fecha válida
    const msgCreatedAt = message.createdAt as string | object;
    if (typeof msgCreatedAt === 'object' && msgCreatedAt !== null) {
      try {
        // Convertir cualquier objeto a string ISO
        message.createdAt = new Date().toISOString();
      } catch {
        // Si hay algún error, asignar la fecha actual
        message.createdAt = new Date().toISOString();
      }
    } else if (!msgCreatedAt) {
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

    // Actualizar el estado de los mensajes
    setMessages(prevMessages => {
      // Comprobar si este mensaje es un duplicado usando una verificación más robusta
      const isDuplicate = prevMessages.some(msg => {
        if ((msg.id && msg.id === message.id) || 
            (msg.tempId && msg.tempId === message.tempId) ||
            (message.id && msg.tempId === message.id) ||
            (message.tempId && msg.id === message.tempId)) {
          return true;
        }

        // Si tiene el mismo contenido, emisor, receptor y está dentro de un rango de tiempo cercano (5 segundos)
        if (msg.content === message.content && 
            msg.senderId === message.senderId && 
            (msg.receiverId === message.receiverId || !msg.receiverId || !message.receiverId)) {
          const msgTime = new Date(msg.createdAt).getTime();
          const newMsgTime = new Date(message.createdAt).getTime();
          return Math.abs(msgTime - newMsgTime) < 5000; // 5 segundos de margen
        }

        return false;
      });

      console.log('¿Mensaje es duplicado?', isDuplicate);

      if (isDuplicate) {
        console.log('Ignorando mensaje duplicado');
        // Si es duplicado, actualizar propiedades como el ID o estado si es necesario
        return prevMessages.map(msg => {
          // Si coincide por ID o tempId
          if ((msg.id && msg.id === message.id) || 
              (msg.tempId && msg.tempId === message.tempId) ||
              (message.id && msg.tempId === message.id) ||
              (message.tempId && msg.id === message.tempId) ||
              // O si coincide por contenido, tiempo y usuarios
              (msg.content === message.content && 
               msg.senderId === message.senderId && 
               Math.abs(new Date(msg.createdAt).getTime() - new Date(message.createdAt).getTime()) < 5000)) {
            
            // Mantener el ID existente si es definitivo o usar el nuevo si existe
            const finalId = msg.id || message.id;
            // Mantener tempId solo si no hay ID definitivo
            const finalTempId = !finalId ? (msg.tempId || message.tempId) : undefined;
            
            // Usar el mejor estado disponible
            const finalStatus = message.status === 'failed' ? 'failed' : 
                                (message.status === 'read' || msg.status === 'read') ? 'read' :
                                (message.status === 'delivered' || msg.status === 'delivered') ? 'delivered' :
                                (message.status === 'sent' || msg.status === 'sent') ? 'sent' :
                                msg.status || 'sent';
            
            return { 
              ...msg, 
              id: finalId,
              tempId: finalTempId,
              status: finalStatus,
              read: message.read || msg.read
            };
          }
          return msg;
        });
      }

      // Si no es duplicado, añadir el mensaje a la lista
      console.log('Añadiendo nuevo mensaje a la lista. ID:', message.id || message.tempId);

      // Adaptación del mensaje para que coincida con el tipo Message
      const newMessage: Message = {
        id: message.id,
        tempId: message.tempId,
        content: message.content,
        senderId: message.senderId,
        receiverId: message.receiverId,
        createdAt: message.createdAt,
        status: message.status as MessageStatus,
        read: message.read,
        messageType: message.messageType,
        conversationId: message.conversationId
      };

      // Crear una copia del arreglo y añadir el nuevo mensaje
      const newMessagesList = [...prevMessages, newMessage];

      // Ordenar mensajes por fecha de creación
      return newMessagesList.sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return timeA - timeB;
      });
    });

    const processingTime = performance.now() - startTime;
    console.log(`Procesamiento de mensaje completado en ${processingTime.toFixed(2)}ms`);

    // Desplazar al fondo del chat si estamos en la parte inferior
    if (isAtBottom && messagesEndRef.current) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  };

  // Manejar el evento de tipeo (escribiendo)
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewMessage(value);

    // Enviar evento "typing" para notificar al otro usuario
    if (!isTyping && value.trim()) {
      setIsTyping(true);
      if (conversationId) {
        updateTypingStatus({ conversationId, isTyping: true });
      }
    }

    // Resetear el estado de tipeo después de un tiempo
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      // Enviar evento de que dejó de escribir
      if (conversationId) {
        updateTypingStatus({ conversationId, isTyping: false });
      }
    }, 2000);
  };

  // Función para desplazarse al final del chat
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messagesEndRef]);

  // Manejar desplazamiento para detectar cuando el usuario está en la parte inferior
  const handleScroll = useCallback(() => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      const isAtBottomNow = scrollHeight - scrollTop - clientHeight < 30;
      setIsAtBottom(isAtBottomNow);
    }
  }, []);

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

  // Manejar reproducción de audio
  const handleToggleAudio = useCallback((audioUrl: string) => {
    if (audioPlaying === audioUrl) {
      // Pausar la reproducción actual
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setAudioPlaying(null);
    } else {
      // Detener cualquier reproducción anterior
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Crear nuevo reproductor de audio
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Configurar evento para cuando termine la reproducción
      audio.onended = () => {
        setAudioPlaying(null);
      };
      
      // Iniciar reproducción
      audio.play().catch(error => {
        console.error('Error reproduciendo audio:', error);
        setAudioPlaying(null);
      });
      
      // Actualizar estado
      setAudioPlaying(audioUrl);
    }
  }, [audioPlaying]);

  // Enviar mensaje de voz
  const handleSendVoiceMessage = useCallback(async (audioBlob: Blob) => {
    if (!conversationId || !otherUser || !currentUserId) return;
    
    try {
      setIsSending(true);
      
      // Crear un FormData para enviar el archivo
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-message.webm');
      formData.append('conversationId', conversationId);
      formData.append('receiverId', otherUser.id);
      formData.append('messageType', 'voice');
      
      // Mensaje temporal para mostrar mientras se envía
      const tempMessage: Message = {
        tempId: `temp-${Date.now()}`,
        content: URL.createObjectURL(audioBlob),
        senderId: currentUserId,
        createdAt: new Date(),
        status: 'sending',
        messageType: 'voice'
      };
      
      // Añadir mensaje temporal a la lista
      setMessages(prev => [...prev, tempMessage]);
      
      // Enviar mensaje
      await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: formData,
      });
      
      // Limpiar
      setShowVoiceRecorder(false);
      
      // Desplazar al final
      scrollToBottom();
      
    } catch (error) {
      console.error('Error al enviar mensaje de voz:', error);
    } finally {
      setIsSending(false);
    }
  }, [conversationId, otherUser, currentUserId, scrollToBottom]);

  // Manejar envío de mensajes
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !otherUser) return;

    // Verificar si los usuarios se siguen mutuamente antes de enviar
    if (canSendMessages === false) {
      console.error('No se pueden enviar mensajes: los usuarios no se siguen mutuamente');
      return;
    }

    // Crear tempId fuera del bloque try para que esté disponible en todo el ámbito de la función
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      setIsSending(true);

      // Crear nuevo mensaje
      const message = {
        tempId,
        content: newMessage,
        senderId: currentUserId,
        receiverId: otherUser.id,
        createdAt: new Date(),
        status: 'sending',
        conversationId,
        messageType: 'text'
      } as Message;

      console.log('Enviando mensaje:', message);

      // Actualizar UI inmediatamente para mostrar el mensaje enviado localmente
      flushSync(() => {
        setMessages(prev => [...prev, message]);
        setNewMessage('');
      });

      // Desplazar al fondo del chat
      scrollToBottom();

      // ESTRATEGIA DE ENVÍO: Primero intentar Socket.io, si falla, usar API REST
      let messageSaved = false;

      // Primero intenta enviar por Socket.io
      if (connected) {
        // Asegurarnos de que createdAt sea siempre un string para compatibilidad con MessageType
        const messageForSocket = {
          ...message,
          createdAt: typeof message.createdAt === 'string'
            ? message.createdAt
            : message.createdAt instanceof Date
              ? message.createdAt.toISOString()
              : new Date().toISOString()
        };

        const socketSuccess = sendMessage(messageForSocket);
        if (socketSuccess) {
          console.log('Mensaje enviado exitosamente via Socket.io');
          messageSaved = true;
        } else {
          console.error('Error al enviar mensaje mediante Socket.io');
          // No actualizamos a error todavía, intentaremos la API REST
        }
      } else {
        console.log('Socket no conectado, usando API REST directamente');
      }

      // Solo si Socket.io falló o no está conectado, usar API REST como respaldo
      if (!messageSaved) {
        try {
          const response = await fetch(API_ROUTES.messages.send, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: message.content,
              receiverId: message.receiverId,
              tempId: message.tempId,
              messageType: 'text'
            }),
          });

          if (!response.ok) {
            console.error('Error al guardar mensaje vía API:', response.status);
            updateMessageStatus(tempId, 'failed');
          } else {
            const savedMessage = await response.json();
            console.log('Mensaje guardado correctamente en base de datos vía API', savedMessage);
            // Actualizar el estado del mensaje solo si tenemos un ID permanente
            if (savedMessage.id) {
              setMessages(prev =>
                prev.map(msg =>
                  msg.tempId === tempId
                    ? { ...msg, id: savedMessage.id, status: 'sent' }
                    : msg
                )
              );
            }
          }
        } catch (apiError) {
          console.error('Error al guardar mensaje vía API:', apiError);
          updateMessageStatus(tempId, 'failed');
        }
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      updateMessageStatus(tempId, 'failed');
    } finally {
      setIsSending(false);
    }
  };

  // Manejar teclas en el textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Renderizar mensajes agrupados por fecha
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
            const isVoiceMessage = message.messageType === 'voice';
            
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
                  {isVoiceMessage ? (
                    <div className="voice-message w-full">
                      <AudioPlayer 
                        audioUrl={message.mediaUrl || ''}
                        messageId={message.id || message.tempId || `msg-${index}`}
                        isSender={isSelfMessage}
                      />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}
                  <div className="flex items-center justify-end mt-1 space-x-1">
                    <span className="text-xs opacity-70">{messageTime}</span>
                    
                    {isSelfMessage && (
                      <span className="text-xs">
                        {message.status === 'sending' && '⌛'}
                        {message.status === 'sent' && '✓'}
                        {message.status === 'delivered' && '✓✓'}
                        {message.status === 'read' && '✓✓'}
                        {message.status === 'failed' && (
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

  // Manejar reenvío de mensajes fallidos
  const handleResendMessage = async (messageId: string) => {
    const messageToResend = messages.find(m => m.id === messageId || m.tempId === messageId);
    if (!messageToResend) return;

    // Actualizar estado a 'sending'
    updateMessageStatus(messageId, 'sending');

    // Reenviar a través de Socket.io si está disponible
    if (connected && messageToResend) {
      // Asegurarnos de que createdAt sea siempre un string
      const messageForSocket = {
        ...messageToResend,
        createdAt: typeof messageToResend.createdAt === 'string'
          ? messageToResend.createdAt
          : messageToResend.createdAt instanceof Date
            ? messageToResend.createdAt.toISOString()
            : new Date().toISOString()
      };

      const success = sendMessage(messageForSocket);
      
      if (!success) {
        updateMessageStatus(messageId, 'failed');
      }
    } else {
      updateMessageStatus(messageId, 'failed');
    }
  };

  // Detectar si el usuario está en el fondo del chat
  useEffect(() => {
    const chatContainer = chatContainerRef.current;
    if (!chatContainer) return;

    const handleInitialScroll = () => {
      const { scrollHeight, clientHeight } = chatContainer;
      chatContainer.scrollTop = scrollHeight - clientHeight;
      setIsAtBottom(true);
    };

    handleInitialScroll();
    
    const handleScrollEvent = () => {
      const { scrollTop, scrollHeight, clientHeight } = chatContainer;
      const isAtBottomNow = scrollHeight - scrollTop - clientHeight < 30;
      setIsAtBottom(isAtBottomNow);
    };

    chatContainer.addEventListener('scroll', handleScrollEvent);

    return () => {
      chatContainer.removeEventListener('scroll', handleScrollEvent);
    };
  }, []);

  // Desplazarse al fondo del chat cuando se añaden nuevos mensajes
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages, isAtBottom, scrollToBottom]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Solo permitir cerrar si es un evento real del usuario
      if (isOpen && !open) {
        onClose();
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
              <X className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </Button>
          </div>
        </DialogHeader>

        {/* Contenedor de mensajes con scroll */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4"
          onScroll={handleScroll}
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

        {/* Audio element oculto para reproducción */}
        <audio ref={audioRef} className="hidden" />
        
        {/* Formulario de envío */}
        <form onSubmit={handleSendMessage} className="border-t p-4">
          {canSendMessages === false && (
            <div className="bg-yellow-100 text-yellow-800 p-3 mb-3 rounded-md text-sm">
              Para poder enviar mensajes, ambos usuarios deben seguirse mutuamente.
            </div>
          )}
          
          {showVoiceRecorder ? (
            <VoiceMessageRecorder
              onSend={handleSendVoiceMessage}
              onCancel={() => setShowVoiceRecorder(false)}
              isVisible={showVoiceRecorder}
              senderId={currentUserId || ''}
              _receiverId={otherUser?.id || ''}
              session={session}
              onClose={() => setShowVoiceRecorder(false)}
              setUploadStatus={setUploadStatus}
            />
          ) : (
            <div className="flex items-end gap-2">
              <Textarea
                className="min-h-10 flex-1 resize-none"
                placeholder={canSendMessages === false ? "No puedes enviar mensajes" : "Escribe tu mensaje..."}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={isSending || canSendMessages === false}
                rows={1}
              />
              
              {/* Botón de micrófono */}
              {canSendMessages !== false && (
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost"
                  onClick={() => setShowVoiceRecorder(true)}
                  disabled={isSending}
                >
                  <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </Button>
              )}
              
              <Button 
                type="submit" 
                size="icon" 
                disabled={isSending || !newMessage.trim() || canSendMessages === false}
              >
                <Send className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ChatWindow;
