import React, { useEffect, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/src/app/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { ArrowLeft, Send, X } from 'lucide-react';
import { cn } from '@/lib/utils';
// Importar format como any para resolver problemas de tipado
import { format as dateFormat } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
import { flushSync } from 'react-dom';
import useSocket, { MessageType } from '@/src/hooks/useSocket';

// Crear una versión tipada correctamente de format
const format: any = dateFormat;

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
};

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  otherUser: User | null;
  initialMessages?: Message[];
  conversationId?: string;
}

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
    onMessageStatus: (status) => {
      updateMessageStatus(status.messageId, status.status);
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
  const updateMessageStatus = (messageId: string, status: string) => {
    setMessages(prev => 
      prev.map(msg => 
        (msg.id === messageId || msg.tempId === messageId) 
          ? { ...msg, status: status as any } 
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
        const response = await fetch('/api/messages', {
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
      // Usar un objeto options separado y parseado como tipo any para evitar el error
      const options = { locale: es } as any;
      const formattedDate = format(date, "EEEE, d 'de' MMMM", options);
      
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

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md md:max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogHeader className="border-b dark:border-gray-700 p-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Avatar className="h-10 w-10">
                {otherUser?.image ? (
                  <AvatarImage src={otherUser.image} alt={otherUser.username || "User"} />
                ) : (
                  <AvatarFallback>{otherUser?.username?.charAt(0) || "U"}</AvatarFallback>
                )}
              </Avatar>
              <div>
                <DialogTitle className="text-left text-md">
                  {otherUser?.username || "Usuario"}
                </DialogTitle>
                <div className="text-xs text-gray-500 flex items-center gap-1">
                  {connected ? (
                    <span className="flex items-center text-green-500">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 mr-1"></span>
                      Conectado
                    </span>
                  ) : socketError ? (
                    <span className="flex items-center text-red-500">
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1"></span>
                      Error de conexión
                    </span>
                  ) : (
                    <span className="flex items-center text-amber-500">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1 animate-pulse"></span>
                      Conectando...
                    </span>
                  )}
                  
                  {peerIsTyping && (
                    <span className="ml-2 text-xs text-gray-500 animate-pulse">escribiendo...</span>
                  )}
                </div>
              </div>
            </div>

            {!isMobile && (
              <button
                onClick={onClose}
                className="rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            )}
          </div>
        </DialogHeader>

        {/* Chat messages container */}
        <div
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 h-[50vh] md:h-[60vh] space-y-4"
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <p>No hay mensajes aún</p>
              <p className="text-sm">Envía un mensaje para comenzar la conversación</p>
            </div>
          ) : (
            renderGroupedMessages()
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message input area */}
        <div className="border-t dark:border-gray-700 p-4">
          <div className="flex items-end space-x-2">
            <Textarea
              ref={messageInputRef}
              value={newMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Escribe un mensaje..."
              className="flex-1 min-h-[80px] max-h-[200px]"
              disabled={isSending}
            />
            <Button
              size="icon"
              onClick={() => handleSendMessage()}
              disabled={!newMessage.trim() || isSending}
              className="h-10 w-10 rounded-full bg-blue-500 hover:bg-blue-600"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatWindow;
