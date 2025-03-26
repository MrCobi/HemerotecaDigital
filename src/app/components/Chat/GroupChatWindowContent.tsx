"use client";
import * as React from 'react'; 
import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isSameDay } from 'date-fns';
import useSocket, { MessageType, TypingStatusType, ReadReceiptType } from '@/src/hooks/useSocket';
import { API_ROUTES } from '@/src/config/api-routes';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import { useToast } from '@/src/app/hooks/use-toast';

// Reutiliza estos componentes de ChatWindowContent.tsx
import { MessageItem } from './ChatComponents/ChatComponents';

type User = {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

type Participant = {
  id: string;
  userId: string;
  role: 'admin' | 'member' | 'moderator' | 'owner';
  user: User;
};

type GroupConversation = {
  id: string;
  name?: string | null;
  imageUrl?: string | null;
  isGroup: boolean;
  participants: Participant[];
  description?: string | null;
};

type Message = {
  id?: string;
  tempId?: string;
  content: string;
  senderId: string;
  createdAt: Date | string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  conversationId?: string;
  read?: boolean;
  readBy?: string[];
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
};

type GroupChatWindowContentProps = {
  conversation: GroupConversation;
  className?: string;
};

const MemoizedMessageItem = memo(MessageItem);

const MessageList = memo(({ 
  messages, 
  currentUserId,
  getMessageSender,
  session,
  isLoadingMore,
  messagesEndRef
}: { 
  messages: Message[], 
  currentUserId: string | undefined,
  getMessageSender: (senderId: string) => User | null,
  session: any,
  isLoadingMore: boolean,
  messagesEndRef: React.RefObject<HTMLDivElement | null>
}) => {
  return (
    <div className="space-y-4">
      {isLoadingMore && (
        <div className="flex justify-center p-2">
          <LoadingSpinner className="w-5 h-5 text-blue-500" />
        </div>
      )}
      
      {messages.map((message, index) => {
        const showAvatar = 
          index === 0 || 
          messages[index - 1]?.senderId !== message.senderId;
        
        const showDateSeparator = index === 0 || !isSameDay(
          new Date(message.createdAt), 
          new Date(messages[index - 1]?.createdAt || Date.now())
        );
        
        const sender = getMessageSender(message.senderId) || {
          id: message.senderId,
          name: 'Usuario desconocido',
          image: null
        };
        
        return (
          <React.Fragment key={message.id || message.tempId || `${message.senderId}-${new Date(message.createdAt).getTime()}`}>
            {showDateSeparator && (
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-2 text-sm text-gray-400">
                    {new Date(message.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
            
            <MessageItem 
              message={message}
              currentUserId={currentUserId || ''}
              otherUser={sender}
              showAvatar={showAvatar}
              showDateSeparator={false} // Ya manejamos los separadores de fecha arriba
              _index={index}
              session={session}
              isGroupChat={true}
            />
          </React.Fragment>
        );
      })}
      
      <div ref={messagesEndRef} />
    </div>
  );
});

MessageList.displayName = 'MessageList';

const GroupChatWindowContent: React.FC<GroupChatWindowContentProps> = ({
  conversation,
  className,
}) => {
  const { data: _session } = useSession();
  const currentUserId = _session?.user?.id;
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVoiceRecorderVisible, setIsVoiceRecorderVisible] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement | null>(null);
  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isTyping, _setIsTyping] = useState(false);
  const messageInputRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Estado para controlar la carga de mensajes
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [_errorLoadingMessages, setErrorLoadingMessages] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const pageSize = 20;
  
  // Para controlar el scroll mientras se cargan más mensajes
  const [preserveScrollPosition, setPreserveScrollPosition] = useState(false);
  const scrollHeightBeforeLoad = React.useRef(0);
  const scrollTopBeforeLoad = React.useRef(0);
  
  // Para prevenir solicitudes duplicadas
  const isFetchingRef = React.useRef(false);
  
  // Estado para el socket
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [autoScrollEnabled, _setAutoScrollEnabled] = useState(true);
  const [_socketAuthenticated, _setSocketAuthenticated] = useState(false);

  // Implementar un controlador de aborto para cancelar peticiones anteriores
  const _abortControllerRef = React.useRef<AbortController | null>(null);

  // Referencia para mantener el último ID de conversación procesado
  const lastProcessedConversationRef = React.useRef<string | null>(null);

  // Socket.io
  const { 
    socketInstance,
    connected,
    sendMessage: _socketSendMessage,
    updateTypingStatus: socketUpdateTypingStatus,
    markMessageAsRead: socketMarkMessageAsRead,
    joinConversation,
    leaveConversation,
    setActive, 
    reconnect  
  } = useSocket({
    userId: currentUserId || "",
    username: _session?.user?.name || _session?.user?.username || "",
    onConnect: () => {
      console.log('Socket conectado en GroupChatWindow');
      setSocketInitialized(true);
      
      // Si hay una conversación activa y estamos conectados, unirse a ella
      if (conversation?.id && currentUserId) {
        joinConversation(conversation.id);
      }
    },
    onDisconnect: () => {
      console.log('Socket desconectado en GroupChatWindow');
      setSocketInitialized(false);
      
      // Intentar reconectar automáticamente
      setTimeout(() => {
        if (currentUserId) {
          reconnect();
        }
      }, 3000);
    },
    onError: (error) => {
      console.error('Error en socket de GroupChat:', error);
    },
    onNewMessage: (message: MessageType) => {
      // Solo procesar el mensaje si pertenece a esta conversación
      if (message.conversationId === conversation?.id) {
        console.log('Nuevo mensaje recibido en GroupChat:', message);
        
        // Convertir a formato de mensaje interno
        const newMessage: Message = {
          id: message.id,
          content: message.content || '',
          senderId: message.senderId,
          createdAt: new Date(message.createdAt),
          status: message.status as 'sending' | 'sent' | 'delivered' | 'read' | 'failed',
          conversationId: message.conversationId
        };
        
        // Añadir mensaje a la lista y actualizar estado
        setMessages(prev => {
          // Evitar duplicados
          const exists = prev.some(msg => msg.id === newMessage.id || 
                               (msg.tempId && msg.tempId === message.tempId));
          if (exists) return prev;
          
          return [...prev, newMessage];
        });
        
        // Si el mensaje no es del usuario actual, marcarlo como leído
        if (message.senderId !== currentUserId) {
          // Marcar el mensaje como leído en el servidor
          if (message.id) {
            socketMarkMessageAsRead({
              messageId: message.id,
              conversationId: conversation?.id
            });
          }
          
          // Reproducir sonido de notificación si no está en foco
          if (document.visibilityState !== 'visible') {
            const audio = new Audio('/sounds/message-notification.mp3');
            audio.play().catch(e => console.log('Error al reproducir sonido:', e));
          }
        }
        
        // Scroll al fondo si el usuario está en la parte inferior
        if (isAtBottom) {
          scrollToBottom();
        }
      }
    },
    onTypingStatus: (data: TypingStatusType) => {
      // Solo mostrar indicador de escritura si es del grupo actual
      if (data.conversationId === conversation?.id && data.userId !== currentUserId) {
        console.log('Usuario está escribiendo en el grupo:', data);
        
        // Buscar el nombre del usuario
        const typingUser = conversation.participants.find(p => p.user.id === data.userId);
        const typingUsername = typingUser?.user.name || typingUser?.user.username || 'Alguien';
        
        if (data.isTyping) {
          // Actualizar el estado de quién está escribiendo
          setTypingUsers(prev => {
            // Si ya está en la lista, no modificar
            if (prev.some(user => user === typingUsername)) return prev;
            
            // Añadir usuario a la lista
            return [...prev, typingUsername];
          });
        } else {
          // Quitar usuario de la lista de escritura
          setTypingUsers(prev => prev.filter(user => user !== typingUsername));
        }
      }
    },
    onMessageRead: (data: ReadReceiptType) => {
      // Actualizar el estado de los mensajes marcados como leídos en el grupo
      if (data.conversationId === conversation?.id && data.userId !== currentUserId) {
        console.log('Mensajes marcados como leídos en el grupo:', data);
        
        // Actualizar el estado de lectura de los mensajes
        setMessages(prev => prev.map(msg => {
          // Si el mensaje es nuestro y está en la lista de leídos, actualizarlo
          if (msg.senderId === currentUserId && 
              data.messageIds.includes(msg.id || '')) {
            
            // Añadir este usuario a la lista de lecturas si no existe
            const currentReadBy = msg.readBy || [];
            if (!currentReadBy.includes(data.userId)) {
              return {
                ...msg, 
                readBy: [...currentReadBy, data.userId],
                status: currentReadBy.length > 0 ? 'read' : 'delivered'
              };
            }
          }
          return msg;
        }));
      }
    }
  });

  // Efecto para manejar la unión a la conversación
  useEffect(() => {
    if (socketInitialized && conversation?.id && currentUserId && connected) {
      console.log(`Uniéndose a la conversación de grupo: ${conversation.id}`);
      joinConversation(conversation.id);
      
      // Marcar esta conversación como activa
      setActive(conversation.id);
      
      return () => {
        console.log(`Saliendo de la conversación de grupo: ${conversation.id}`);
        leaveConversation(conversation.id);
      };
    }
  }, [socketInitialized, conversation?.id, currentUserId, connected, joinConversation, leaveConversation, setActive]);

  // Efecto para manejar el estado de escritura
  useEffect(() => {
    if (!socketInitialized || !conversation?.id || !currentUserId) return;
    
    const updateTypingStatus = () => {
      if (isTyping) {
        socketUpdateTypingStatus({ 
          conversationId: conversation.id, 
          isTyping: true
        });
      }
    };
    
    updateTypingStatus();
    
    return () => {
      // Al desmontar, actualizar el estado de "no escribiendo"
      if (socketInitialized && isTyping) {
        socketUpdateTypingStatus({ 
          conversationId: conversation.id, 
          isTyping: false
        });
      }
    };
  }, [socketInitialized, conversation?.id, currentUserId, isTyping, socketUpdateTypingStatus]);

  // Función para procesar mensajes
  const processMessages = useCallback((newMessages: Message[]) => {
    if (!newMessages || newMessages.length === 0) return;
    
    setMessages(prevMessages => {
      // Crear un mapa para deduplicación eficiente
      const messageMap = new Map<string, Message>();
      
      // Añadir mensajes existentes al mapa
      prevMessages.forEach(msg => {
        const key = msg.id || msg.tempId || `${msg.senderId}-${new Date(msg.createdAt).getTime()}`;
        messageMap.set(key, msg);
      });
      
      // Añadir o actualizar nuevos mensajes
      newMessages.forEach(msg => {
        // Verificar que el mensaje pertenece a esta conversación
        if (msg.conversationId !== conversation?.id) return;
        
        const key = msg.id || msg.tempId || `${msg.senderId}-${new Date(msg.createdAt).getTime()}`;
        
        // Si ya existe este mensaje (por ID o tempId), actualizar su estado
        const existingMsg = messageMap.get(key);
        if (existingMsg) {
          // Actualizar propiedades manteniendo las existentes
          messageMap.set(key, { ...existingMsg, ...msg });
        } else {
          // Añadir nuevo mensaje
          messageMap.set(key, msg);
        }
      });
      
      // Convertir el mapa a array y ordenar por fecha
      const uniqueMessages = Array.from(messageMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });
      
      return uniqueMessages;
    });
  }, [conversation?.id]);

  // Función para hacer scroll al final de los mensajes
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
    } else if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  }, []);

  // Actualizar vista cuando cambian los mensajes
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMessages && isAtBottom) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages.length, isLoadingMessages, isAtBottom, scrollToBottom]);

  useEffect(() => {
    if (!socketInstance || !socketInitialized || !conversation?.id) return;
    
    console.log('Configurando listener para nuevos mensajes en el grupo');
    
    const handleNewMessage = (message: MessageType) => {
      console.log('Nuevo mensaje recibido por socket:', message);
      
      if (message.conversationId === conversation.id) {
        console.log('Procesando mensaje para el grupo actual');
        
        const validMessage: Message = {
          ...message,
          content: message.content || '', // Convert null content to empty string
          createdAt: typeof message.createdAt === 'string' || message.createdAt instanceof Date 
            ? message.createdAt 
            : new Date().toISOString(),
          status: message.status as 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
        };
        
        processMessages([validMessage]);
        
        if (isAtBottom) {
          setTimeout(scrollToBottom, 100);
        }
      }
    };
    
    socketInstance.on('new_message', handleNewMessage);
    
    return () => {
      socketInstance.off('new_message', handleNewMessage);
    };
  }, [socketInstance, socketInitialized, conversation?.id, processMessages, isAtBottom, scrollToBottom]);

  // Separar completamente la función de carga de mensajes del ciclo de vida del componente
  const loadGroupMessages = useCallback(async (groupId: string, isInitialLoad = false) => {
    if (isFetchingRef.current && !isInitialLoad) {
      console.log('Ya hay una petición en curso, ignorando nueva carga');
      return;
    }
    
    isFetchingRef.current = true;
    if (isInitialLoad) {
      setIsLoadingMessages(true);
    }
    
    try {
      console.log(`Cargando mensajes para ${groupId} (inicial: ${isInitialLoad})`);
      
      const response = await fetch(
        `${API_ROUTES.messages.groupMessages}?conversationId=${groupId}&page=1&limit=${pageSize}&nocache=${Date.now()}`, 
        { 
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          }
        }
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          setErrorLoadingMessages('Este grupo ya no existe.');
        } else {
          setErrorLoadingMessages(`Error (${response.status})`);
        }
        return;
      }
      
      const data = await response.json();
      console.log("Respuesta de API recibida:", JSON.stringify(data).substring(0, 200) + "...");
      
      let apiMessages: MessageType[] = [];
      
      if (Array.isArray(data)) {
        apiMessages = data;
        console.log("Formato de respuesta: array directo");
      } else if (data.messages && Array.isArray(data.messages)) {
        apiMessages = data.messages;
        console.log("Formato de respuesta: objeto con campo messages");
      } else if (data.data && Array.isArray(data.data)) {
        apiMessages = data.data;
        console.log("Formato de respuesta: objeto con campo data");
      } else {
        console.error("Formato de respuesta desconocido:", data);
        setErrorLoadingMessages('Formato de respuesta inesperado');
        return;
      }
      
      console.log(`Recibidos ${apiMessages.length} mensajes`);
      
      if (apiMessages.length > 0) {
        const formattedMessages = apiMessages.map((msg: MessageType) => {
          // Ensure all required fields are present and correctly typed
          return {
            ...msg,
            content: msg.content || '', // Convert null content to empty string
            createdAt: typeof msg.createdAt === 'string' || msg.createdAt instanceof Date 
              ? msg.createdAt 
              : new Date().toISOString(),
            status: msg.status as 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
          } as Message;
        });
        
        processMessages(formattedMessages);
        
        setHasMore(apiMessages.length === pageSize);
        setPage(1);
      } else {
        console.log("No se encontraron mensajes para esta conversación");
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error cargando mensajes:", error);
      setErrorLoadingMessages('Error al cargar mensajes: ' + (error instanceof Error ? error.message : 'desconocido'));
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMessages(false);
    }
  }, [pageSize, processMessages, setErrorLoadingMessages, setHasMore, setIsLoadingMessages, setPage]);

  // Un efecto para cargar los mensajes iniciales cuando cambia la conversación
  useEffect(() => {
    if (!conversation?.id || !currentUserId) return;
    
    console.log(`Cambio de conversación detectado. Nueva conversación: ${conversation.id}`);
    
    if (lastProcessedConversationRef.current === conversation.id) {
      console.log('Mismo ID de conversación, ignorando nueva carga');
      return;
    }
    
    setMessages([]);
    setPage(1);
    setHasMore(true);
    setErrorLoadingMessages(null);
    
    lastProcessedConversationRef.current = conversation.id;
    
    const groupId = conversation.id.startsWith('group_') 
      ? conversation.id 
      : `group_${conversation.id}`;
    
    loadGroupMessages(groupId, true);
  }, [conversation?.id, currentUserId, loadGroupMessages]);

  // Cargar más mensajes al hacer scroll hacia arriba
  const _loadMoreMessages = async () => {
    if (isLoadingMore || isFetchingRef.current || !hasMore || !currentUserId) return;
    
    console.log(`Cargando más mensajes antiguos, página ${page + 1}`);
    
    setIsLoadingMore(true);
    isFetchingRef.current = true;
    
    if (chatContainerRef.current) {
      setPreserveScrollPosition(true);
      scrollHeightBeforeLoad.current = chatContainerRef.current.scrollHeight;
      scrollTopBeforeLoad.current = chatContainerRef.current.scrollTop;
    }
    
    try {
      const nextPage = page + 1;
      
      const groupId = conversation.id.startsWith('group_') 
        ? conversation.id 
        : `group_${conversation.id}`;
      
      console.log(`Cargando mensajes para ${groupId}`);
      
      const response = await fetch(`${API_ROUTES.messages.groupMessages}?conversationId=${groupId}&page=${nextPage}&limit=${pageSize}&nocache=${Date.now()}`, 
        { 
          method: 'GET',
          headers: { 
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`Error al cargar mensajes: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!Array.isArray(data.messages)) {
        throw new Error('Formato de respuesta inesperado');
      }
      
      console.log(`Recibidos ${data.messages.length} mensajes antiguos para página ${nextPage}`);
      
      const oldMessages = data.messages;
      
      if (oldMessages.length === 0) {
        setHasMore(false);
        return;
      }
      
      const formattedMessages = oldMessages.map((msg: MessageType) => {
        // Ensure all required fields are present and correctly typed
        return {
          ...msg,
          content: msg.content || '', // Convert null content to empty string
          createdAt: typeof msg.createdAt === 'string' || msg.createdAt instanceof Date 
            ? msg.createdAt 
            : new Date().toISOString(),
          status: msg.status as 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
        } as Message;
      });
      
      processMessages(formattedMessages);
      
      setPage(nextPage);
      setHasMore(oldMessages.length === pageSize);
      
    } catch (error) {
      console.error('Error al cargar más mensajes:', error);
      setErrorLoadingMessages('Error al cargar mensajes antiguos. Intenta de nuevo.');
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

  // Scroll inicial y al recibir nuevos mensajes
  useEffect(() => {
    if (!isLoadingMore && messagesEndRef.current && chatContainerRef.current && !preserveScrollPosition) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoadingMore, preserveScrollPosition, messages.length]);

  // Manejar scroll automático para nuevos mensajes
  useEffect(() => {
    if (!socketInstance || !conversation?.id || !currentUserId) return;
    
    const handleNewMessage = (message: MessageType) => {
      console.log('Nuevo mensaje recibido en grupo:', message);
      
      if (message.conversationId !== conversation.id) {
        console.log('Mensaje ignorado: no pertenece a esta conversación de grupo');
        return;
      }
      
      if (message.senderId !== currentUserId && !message.read) {
        socketInstance.emit('markMessageAsRead', {
          messageId: message.id,
          conversationId: message.conversationId
        });
      }
      
      const validMessage: Message = {
        ...message,
        content: message.content || '',
        status: message.status as 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
      };
      
      processMessages([validMessage]);
      
      if (isAtBottom) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    };
    
    console.log(`Configurando manejadores de socket para grupo ${conversation.id}`);
    socketInstance.on('new_message', handleNewMessage);
    socketInstance.on('new_group_message', handleNewMessage);
    
    return () => {
      console.log(`Limpiando manejadores de socket para grupo ${conversation.id}`);
      socketInstance.off('new_message', handleNewMessage);
      socketInstance.off('new_group_message', handleNewMessage);
    };
  }, [socketInstance, conversation?.id, autoScrollEnabled, currentUserId, processMessages, isAtBottom, scrollToBottom]);

  const handleScroll = () => {
    const element = chatContainerRef.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      setIsAtBottom(isAtBottom);
    }
  };

  // Memoizar el selector de usuarios para evitar cálculos repetidos
  const getMessageSender = useCallback((senderId: string): User | null => {
    if (!conversation?.participants) return null;
    
    const participant = conversation.participants.find(p => p.userId === senderId);
    if (!participant) return null;
    
    return participant.user;
  }, [conversation?.participants]);

  // Función para enviar mensajes al servidor y guardarlos en la base de datos
  const sendMessageToServer = async (message: Message) => {
    if (!message.conversationId) {
      throw new Error('ID de conversación no especificado');
    }
    
    const groupId = message.conversationId.startsWith('group_') 
      ? message.conversationId 
      : `group_${message.conversationId}`;
    
    const response = await fetch(`${API_ROUTES.messages.groupMessages}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: message.content,
        conversationId: groupId,
        messageType: message.messageType || 'text',
        tempId: message.tempId
      }),
    });
    
    if (!response.ok) {
      throw new Error('Error al enviar el mensaje');
    }
    
    const sentMessage = await response.json();
    
    const finalMessage: Message = {
      ...sentMessage,
      tempId: message.tempId,
      status: 'sent',
      messageType: sentMessage.messageType as 'text' | 'image' | 'voice' | 'file' | 'video'
    };
    
    processMessages([finalMessage]);
    
    if (socketInstance && socketInitialized) {
      const socketMessage = {
        ...finalMessage,
        id: finalMessage.id || finalMessage.tempId,
        isGroupMessage: true,
      } as MessageType & { isGroupMessage: boolean };
      
      console.log('Emitiendo mensaje por socket:', socketMessage);
      socketInstance.emit('send_message', socketMessage);
    }
    
    if (isAtBottom) {
      setTimeout(scrollToBottom, 100);
    }
  };

  // Memoizar el mensaje de estado de los usuarios escribiendo
  const typingMessage = useMemo(() => {
    if (typingUsers.length === 0) return null;
    
    if (typingUsers.length === 1) {
      return `${typingUsers[0]} está escribiendo...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0]} y ${typingUsers[1]} están escribiendo...`;
    } else {
      return 'Varias personas están escribiendo...';
    }
  }, [typingUsers]);

  // Función para enviar un mensaje con memoización
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim() && !isVoiceRecorderVisible) return;
    
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage.length && !isVoiceRecorderVisible) {
      return;
    }
    
    setNewMessage('');
    
    if (isVoiceRecorderVisible) {
      setIsVoiceRecorderVisible(false);
      return; // La grabación de voz maneja su propio envío
    }
    
    // Crear un ID temporal para seguimiento optimista
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tempMessage: Message = {
      tempId,
      content: trimmedMessage,
      senderId: currentUserId || '',
      createdAt: new Date(),
      status: 'sending',
      conversationId: conversation?.id,
      messageType: 'text'
    };
    
    // Añadir mensaje optimista para UI inmediata
    processMessages([tempMessage]);
    
    try {
      setIsSending(true);
      
      // Notificar que el usuario ha dejado de escribir
      if (socketInstance && conversation?.id) {
        socketUpdateTypingStatus({
          conversationId: conversation.id,
          isTyping: false
        });
      }
      
      // Enviar mensaje al servidor
      await sendMessageToServer(tempMessage);
      
      // Limpiar campo y estado
      if (messageInputRef.current) {
        messageInputRef.current.focus();
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      toast({
        title: 'Error al enviar mensaje',
        description: 'Por favor, inténtalo de nuevo',
        variant: 'destructive'
      });
      
      // Restaurar mensaje en caso de error
      setNewMessage(trimmedMessage);
    } finally {
      setIsSending(false);
    }
  }, [newMessage, isVoiceRecorderVisible, currentUserId, conversation?.id, processMessages, socketInstance, socketUpdateTypingStatus, sendMessageToServer, toast]);

  // Actualizar los timers de typing con useEffect mejorado
  useEffect(() => {
    const typingTimers: Record<string, NodeJS.Timeout> = {};
    
    const cleanupTypingTimers = () => {
      Object.values(typingTimers).forEach(timer => clearTimeout(timer));
    };
    
    if (socketInstance && conversation?.id) {
      // Configurar manejador para actualizaciones de typing
      const handleTypingStatus = (data: TypingStatusType) => {
        if (data.conversationId !== conversation.id || data.userId === currentUserId) return;
        
        const typingUser = conversation.participants.find(p => p.userId === data.userId);
        if (!typingUser) return;
        
        const userName = typingUser.user.name || typingUser.user.username || 'Usuario';
        
        if (data.isTyping) {
          setTypingUsers(prev => {
            if (prev.includes(userName)) return prev;
            return [...prev, userName];
          });
          
          // Establecer un timeout para eliminar el estado de typing después de un tiempo
          if (typingTimers[data.userId]) {
            clearTimeout(typingTimers[data.userId]);
          }
          
          typingTimers[data.userId] = setTimeout(() => {
            setTypingUsers(prev => prev.filter(name => name !== userName));
          }, 5000);
        } else {
          setTypingUsers(prev => prev.filter(name => name !== userName));
          if (typingTimers[data.userId]) {
            clearTimeout(typingTimers[data.userId]);
            delete typingTimers[data.userId];
          }
        }
      };
      
      socketInstance.on('typing_status', handleTypingStatus);
      
      return () => {
        socketInstance.off('typing_status', handleTypingStatus);
        cleanupTypingTimers();
      };
    }
    
    return cleanupTypingTimers;
  }, [socketInstance, conversation?.id, conversation?.participants, currentUserId]);

  // Render principal del componente
  return (
    <div className={cn("flex flex-col max-h-[calc(100vh-4rem)]", className)}>
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-16" ref={chatContainerRef} onScroll={handleScroll}>
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner className="w-8 h-8 text-blue-500" />
              <p className="mt-2 text-sm text-gray-500">Cargando mensajes...</p>
            </div>
          ) : (
            <MessageList 
              messages={messages} 
              currentUserId={currentUserId} 
              getMessageSender={getMessageSender} 
              session={_session}
              isLoadingMore={isLoadingMore}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>
        
        {typingMessage && (
          <div className="px-4 py-1 text-xs text-gray-500 italic bg-white dark:bg-gray-800">
            {typingMessage}
          </div>
        )}
        
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 pb-4 mb-3 flex-shrink-0 bg-white dark:bg-gray-800">
          {isVoiceRecorderVisible ? (
            <VoiceMessageRecorder 
              onSend={async (audioBlob: Blob) => {
                try {
                  setIsSending(true);
                  
                  const formData = new FormData();
                  formData.append('file', audioBlob, 'audio.webm');
                  formData.append('conversationId', conversation.id);
                  
                  const response = await fetch(`${API_ROUTES.messages.upload}`, {
                    method: 'POST',
                    body: formData,
                  });
                  
                  if (!response.ok) {
                    throw new Error('Error al subir el mensaje de voz');
                  }
                  
                  const { url } = await response.json();
                  
                  const newMessage: Message = {
                    content: 'Audio mensaje',
                    senderId: currentUserId || '',
                    conversationId: conversation.id,
                    createdAt: new Date(),
                    tempId: Date.now().toString(),
                    mediaUrl: url,
                    messageType: 'voice' as const
                  };
                  
                  processMessages([newMessage]);
                  
                  await sendMessageToServer(newMessage);
                  
                  if (socketInstance && socketInitialized) {
                    const socketMessage = {
                      ...newMessage,
                      id: newMessage.tempId,
                      isGroupMessage: true,
                    } as MessageType & { isGroupMessage: boolean };
                    
                    console.log('Emitiendo mensaje por socket:', socketMessage);
                    socketInstance.emit('send_message', socketMessage);
                  }
                  
                  if (isAtBottom) {
                    setTimeout(scrollToBottom, 100);
                  }
                  
                  setIsVoiceRecorderVisible(false);
                } catch (error) {
                  console.error('Error al enviar mensaje de voz:', error);
                  toast({
                    title: 'Error',
                    description: 'No se pudo enviar el mensaje de voz',
                    variant: 'destructive',
                  });
                } finally {
                  setIsSending(false);
                }
              }}
              onCancel={() => setIsVoiceRecorderVisible(false)}
              isVisible={isVoiceRecorderVisible}
              senderId={_session?.user?.id || ''}
              receiverId={conversation.id || ''}
              session={_session}
              onClose={() => setIsVoiceRecorderVisible(false)}
              setUploadStatus={(status: string) => {
                console.log('Upload status:', status);
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setIsVoiceRecorderVisible(true)}
                type="button"
                variant="ghost"
                size="icon"
                className="flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="Enviar mensaje de voz"
              >
                <Mic className="h-5 w-5" />
              </Button>
              
              <Textarea
                value={newMessage}
                onChange={(e) => {
                  setNewMessage(e.target.value);
                  
                  // Enviar estado de escritura al servidor (con throttling)
                  if (socketInstance && conversation?.id && currentUserId) {
                    const isCurrentlyTyping = e.target.value.length > 0;
                    
                    socketUpdateTypingStatus({
                      conversationId: conversation.id,
                      isTyping: isCurrentlyTyping
                    });
                  }
                }}
                placeholder="Escribe un mensaje..."
                className="min-h-10 max-h-32 resize-none flex-1"
                ref={messageInputRef}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
              />
              
              <Button 
                onClick={handleSendMessage} 
                disabled={!newMessage.trim() || isSending || !currentUserId}
                size="icon" 
                className="rounded-full bg-blue-500 text-white hover:bg-blue-600 flex-shrink-0"
              >
                {isSending ? (
                  <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export { GroupChatWindowContent };