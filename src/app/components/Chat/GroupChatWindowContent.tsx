"use client";
import * as React from 'react'; // Fix React import
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, X, Mic, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { flushSync } from 'react-dom';
import useSocket, { MessageType, TypingStatusType, ReadReceiptType } from '@/src/hooks/useSocket';
import { API_ROUTES } from '@/src/config/api-routes';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import { useToast } from '@/src/app/hooks/use-toast';
import Image from 'next/image';
import { CldImage } from 'next-cloudinary';

// Reutiliza estos componentes de ChatWindowContent.tsx
import { MessageItem, DateSeparator, VoiceMessagePlayer } from './ChatComponents/ChatComponents';

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

export const GroupChatWindowContent: React.FC<GroupChatWindowContentProps> = ({
  conversation,
  className,
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVoiceRecorderVisible, setIsVoiceRecorderVisible] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const chatContainerRef = React.useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const typingTimersRef = React.useRef<Record<string, NodeJS.Timeout>>({});
  const [isTyping, setIsTyping] = useState(false);
  const messageInputRef = React.useRef<HTMLTextAreaElement>(null);
  
  // Estado para controlar la carga de mensajes
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [errorLoadingMessages, setErrorLoadingMessages] = useState<string | null>(null);
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
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [socketAuthenticated, setSocketAuthenticated] = useState(false);

  // Implementar un controlador de aborto para cancelar peticiones anteriores
  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Referencia para mantener el último ID de conversación procesado
  const lastProcessedConversationRef = React.useRef<string | null>(null);

  // Socket.io
  const { 
    socketInstance,
    connected,
    sendMessage: socketSendMessage,
    updateTypingStatus: socketUpdateTypingStatus,
    markMessageAsRead: socketMarkMessageAsRead,
    joinConversation,
    leaveConversation,
    setActive, 
    reconnect  
  } = useSocket({
    userId: currentUserId || "",
    username: session?.user?.name || session?.user?.username || "",
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
          status: 'sent',
          messageType: message.messageType,
          mediaUrl: message.mediaUrl,
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!socketInitialized || !conversation?.id || !currentUserId) return;
    
    let typingTimer: NodeJS.Timeout | null = null;
    
    const handleKeyDown = () => {
      // Evitar enviar muchas actualizaciones seguidas
      if (!isTyping) {
        socketUpdateTypingStatus({
          conversationId: conversation.id,
          isTyping: true
        });
        
        // Establecer estado local
        setIsTyping(true);
        
        // Limpiar temporizador anterior si existe
        if (typingTimer) {
          clearTimeout(typingTimer);
        }
        
        // Configurar temporizador para detener estado de escritura
        typingTimer = setTimeout(() => {
          socketUpdateTypingStatus({
            conversationId: conversation.id,
            isTyping: false
          });
          setIsTyping(false);
        }, 2000);
      }
    };
    
    // Agregar event listener al input de mensaje
    const messageInput = messageInputRef.current;
    if (messageInput) {
      messageInput.addEventListener('keydown', handleKeyDown);
    }
    
    return () => {
      if (messageInput) {
        messageInput.removeEventListener('keydown', handleKeyDown);
      }
      
      if (typingTimer) {
        clearTimeout(typingTimer);
        
        // Asegurarse de enviar isTyping: false al desmontar
        socketUpdateTypingStatus({
          conversationId: conversation.id,
          isTyping: false
        });
      }
      
      // Limpiar todos los temporizadores de escritura
      Object.keys(typingTimersRef.current).forEach(userId => {
        clearTimeout(typingTimersRef.current[userId]);
        delete typingTimersRef.current[userId];
      });
    };
  }, [socketInitialized, conversation?.id, currentUserId, isTyping, socketUpdateTypingStatus]);
  
  // Función para procesar mensajes
  const processMessages = React.useCallback((newMessages: Message[]) => {
    if (!newMessages || newMessages.length === 0) return;
    
    // Filtrar mensajes para incluir solo los que corresponden a esta conversación
    const filteredMessages = newMessages.filter(msg => {
      // Solo procesar mensajes que pertenezcan específicamente a esta conversación
      return msg.conversationId === conversation?.id;
    });
    
    setMessages(prev => {
      // Crear un mapa para deduplicar mensajes
      const messageMap = new Map<string, Message>();
      
      // Añadir mensajes previos al mapa
      prev.forEach(msg => {
        if (msg.id) {
          messageMap.set(msg.id, msg);
        } else if (msg.tempId) {
          messageMap.set(msg.tempId, msg);
        }
      });
      
      // Añadir o actualizar nuevos mensajes
      filteredMessages.forEach(msg => {
        if (msg.id) {
          // Si el mensaje tiene un id y también un tempId que ya existe, eliminar la versión temporal
          if (msg.tempId && messageMap.has(msg.tempId)) {
            messageMap.delete(msg.tempId);
          }
          messageMap.set(msg.id, msg);
        } else if (msg.tempId && !messageMap.has(msg.tempId)) {
          messageMap.set(msg.tempId, msg);
        }
      });
      
      // Convertir el mapa a un array y ordenar por fecha
      return Array.from(messageMap.values()).sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });
    });
  }, [conversation?.id]);

  React.useEffect(() => {
    if (!socketInstance || !socketInitialized || !conversation?.id) return;
    
    console.log('Configurando listener para nuevos mensajes en el grupo');
    
    // Función para manejar nuevos mensajes recibidos por socket
    const handleNewMessage = (message: any) => {
      console.log('Nuevo mensaje recibido por socket:', message);
      
      // Verificar que el mensaje sea para este grupo
      if (message.conversationId === conversation.id) {
        console.log('Procesando mensaje para el grupo actual');
        
        // Procesar el mensaje - asegurarse de que content no sea null
        const validMessage: Message = {
          ...message,
          content: message.content || '' // Si es null, usar string vacío
        };
        
        processMessages([validMessage]);
        
        // Auto-scroll si estamos en la parte inferior
        if (isAtBottom) {
          setTimeout(scrollToBottom, 100);
        }
      }
    };
    
    // Añadir el listener
    socketInstance.on('new_message', handleNewMessage);
    
    // Limpiar el listener cuando el componente se desmonte
    return () => {
      socketInstance.off('new_message', handleNewMessage);
    };
  }, [socketInstance, socketInitialized, conversation?.id, processMessages, isAtBottom]);
  
  // Separar completamente la función de carga de mensajes del ciclo de vida del componente
  const loadGroupMessages = React.useCallback(async (groupId: string, isInitialLoad = false) => {
    // Si ya hay una petición en curso y no es la carga inicial, no iniciar otra
    if (isFetchingRef.current && !isInitialLoad) {
      console.log('Ya hay una petición en curso, ignorando nueva carga');
      return;
    }
    
    // Marcar que estamos en proceso de carga
    isFetchingRef.current = true;
    if (isInitialLoad) {
      setIsLoadingMessages(true);
    }
    
    try {
      console.log(`Cargando mensajes para ${groupId} (inicial: ${isInitialLoad})`);
      
      // Hacer la petición fetch SIN usar AbortController para evitar cancelaciones
      const response = await fetch(
        `/api/messages/group-messages?conversationId=${groupId}&page=1&limit=${pageSize}&nocache=${Date.now()}`, 
        { 
          method: 'GET',
          headers: { 
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
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
      
      // Verificamos la estructura de la respuesta y extraemos los mensajes
      let apiMessages: any[] = [];
      
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
        // Asegurarnos de que los mensajes tienen el formato correcto
        const formattedMessages = apiMessages.map((msg: any) => {
          // Si el mensaje ya tiene el formato correcto, devolverlo tal cual
          if (typeof msg.createdAt === 'string' || msg.createdAt instanceof Date) {
            return msg;
          }
          
          // Asegurarse de que createdAt es un string o Date
          return {
            ...msg,
            createdAt: msg.createdAt 
              ? new Date(msg.createdAt).toISOString() 
              : new Date().toISOString()
          };
        });
        
        // Procesar los mensajes correctamente
        processMessages(formattedMessages);
        
        setHasMore(apiMessages.length === pageSize);
        setPage(1);
      } else {
        console.log("No se encontraron mensajes para esta conversación");
        // Incluso si no hay mensajes, actualizamos el estado para reflejar que la carga ha finalizado
        setHasMore(false);
      }
    } catch (error) {
      console.error("Error cargando mensajes:", error);
      setErrorLoadingMessages('Error al cargar mensajes: ' + (error instanceof Error ? error.message : 'desconocido'));
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMessages(false);
    }
  }, [pageSize, processMessages]);

  // Un efecto para cargar los mensajes iniciales cuando cambia la conversación
  React.useEffect(() => {
    if (!conversation?.id || !currentUserId) return;
    
    console.log(`Cambio de conversación detectado. Nueva conversación: ${conversation.id}`);
    
    // Si la referencia es distinta pero el ID es el mismo, no hacer nada
    if (lastProcessedConversationRef.current === conversation.id) {
      console.log('Mismo ID de conversación, ignorando nueva carga');
      return;
    }
    
    // Limpiar estado para la nueva conversación
    setMessages([]);
    setPage(1);
    setHasMore(true);
    setErrorLoadingMessages(null);
    
    // Actualizar la referencia de la conversación actual
    lastProcessedConversationRef.current = conversation.id;
    
    // Preparar ID con formato correcto
    const groupId = conversation.id.startsWith('group_') 
      ? conversation.id 
      : `group_${conversation.id}`;
    
    // Cargar mensajes para la nueva conversación
    loadGroupMessages(groupId, true);
  }, [conversation?.id, currentUserId, loadGroupMessages]);

  // Cargar más mensajes al hacer scroll hacia arriba
  const loadMoreMessages = async () => {
    // Evitar cargas paralelas y cargas cuando no hay más mensajes
    if (isLoadingMore || isFetchingRef.current || !hasMore || !currentUserId) return;
    
    console.log(`Cargando más mensajes antiguos, página ${page + 1}`);
    
    // Marcar que estamos cargando
    setIsLoadingMore(true);
    isFetchingRef.current = true;
    
    // Guardar posición de scroll actual
    if (chatContainerRef.current) {
      setPreserveScrollPosition(true);
      scrollHeightBeforeLoad.current = chatContainerRef.current.scrollHeight;
      scrollTopBeforeLoad.current = chatContainerRef.current.scrollTop;
    }
    
    try {
      const nextPage = page + 1;
      
      // Asegurarnos de usar el ID con el prefijo correcto
      const groupId = conversation.id.startsWith('group_') 
        ? conversation.id 
        : `group_${conversation.id}`;
      
      console.log(`Cargando mensajes para ${groupId}`);
      
      // Hacer la petición fetch SIN usar AbortController para evitar cancelaciones
      const response = await fetch(
        `/api/messages/group-messages?conversationId=${groupId}&page=${nextPage}&limit=${pageSize}&nocache=${Date.now()}`, 
        { 
          method: 'GET',
          headers: { 
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
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
      
      // Si no hay mensajes nuevos, no hay más para cargar
      if (oldMessages.length === 0) {
        setHasMore(false);
        return;
      }
      
      // Procesar y añadir los mensajes antiguos preservando el estado actual
      processMessages(oldMessages);
      
      // Actualizar estado
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
  React.useEffect(() => {
    if (preserveScrollPosition && chatContainerRef.current) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeightBeforeLoad.current;
      chatContainerRef.current.scrollTop = scrollTopBeforeLoad.current + heightDifference;
      setPreserveScrollPosition(false);
    }
  }, [preserveScrollPosition, messages]);

  // Scroll inicial y al recibir nuevos mensajes
  React.useEffect(() => {
    // Solo hacer scroll si no estamos cargando más mensajes (hacia arriba)
    if (!isLoadingMore && messagesEndRef.current && chatContainerRef.current && !preserveScrollPosition) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoadingMore, preserveScrollPosition, messages.length]);

  // Manejar scroll automático para nuevos mensajes
  React.useEffect(() => {
    // Prevenir configuración de manejadores si no tenemos socket o conversación
    if (!socketInstance || !conversation?.id || !currentUserId) return;
    
    const handleNewMessage = (message: MessageType) => {
      console.log('Nuevo mensaje recibido en grupo:', message);
      
      // Verificar si el mensaje pertenece a esta conversación grupal
      if (message.conversationId !== conversation.id) {
        console.log('Mensaje ignorado: no pertenece a esta conversación de grupo');
        return;
      }
      
      // Si el mensaje es de otra persona, marcarlo como leído
      if (message.senderId !== currentUserId && !message.read) {
        socketInstance.emit('markMessageAsRead', {
          messageId: message.id,
          conversationId: message.conversationId
        });
      }
      
      // Procesar el mensaje - asegurarse de que content no sea null
      const validMessage: Message = {
        ...message,
        content: message.content || '' // Si es null, usar string vacío
      };
      
      processMessages([validMessage]);
      
      // Auto-scroll si estamos en la parte inferior
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
  }, [socketInstance, conversation?.id, autoScrollEnabled, currentUserId, processMessages]);

  const handleScroll = () => {
    const element = chatContainerRef.current;
    if (element) {
      const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      setIsAtBottom(isAtBottom);
    }
  };

  // Función para hacer scroll al final de los mensajes
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      setIsAtBottom(true);
    } else if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      setIsAtBottom(true);
    }
  };

  // Deshabilitar efecto que ya no es necesario al tener processMessages
  React.useEffect(() => {
    // Deshabilitado para evitar renderizados dobles
    // const uniqueMessages = Array.from(messageMap.values()).sort((a, b) => {
    //   const dateA = new Date(a.createdAt);
    //   const dateB = new Date(b.createdAt);
    //   return dateA.getTime() - dateB.getTime();
    // });
    
    // setMessages(uniqueMessages);
  }, [messages]);
  
  // Función para enviar mensajes al servidor y guardarlos en la base de datos
  const sendMessageToServer = async (message: Message) => {
    if (!message.conversationId) {
      throw new Error('ID de conversación no especificado');
    }
    
    try {
      // Enviar el mensaje a través de la API para guardarlo en la base de datos
      const requestBody = {
        content: message.content || '', // Asegurar que content nunca es undefined
        conversationId: message.conversationId,
        mediaUrl: message.mediaUrl,
        messageType: message.messageType || 'text',
        tempId: message.tempId || Date.now().toString(),
        isGroupMessage: true, // Indicar explícitamente que es un mensaje de grupo
        // No incluimos receiverId para mensajes de grupo
      };
      
      console.log("Enviando mensaje al servidor:", requestBody);
      
      const response = await fetch('/api/messages/group-messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email || ''}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error('Error al guardar el mensaje en la base de datos');
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error al enviar mensaje al servidor:', error);
      throw error;
    }
  };

  // Manejar envío de mensajes
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !conversation || !currentUserId) return;
    
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    setIsSending(true);
    
    // Crear mensaje temporal para mostrar inmediatamente
    const tempMessage: Message = {
      tempId,
      content: newMessage.trim(),
      senderId: currentUserId || '', // Ensure senderId is never undefined
      createdAt: new Date(),
      status: 'sending',
      conversationId: conversation.id,
      messageType: 'text' as 'text' | 'image' | 'voice' | 'file' | 'video'
    };
    
    // Añadir mensaje temporal a la lista
    processMessages([tempMessage]);
    
    // Limpiar campo de texto
    setNewMessage('');
    
    try {
      setIsSending(true);
      
      // Asegurarnos de usar el ID con el prefijo correcto
      const groupId = conversation.id.startsWith('group_') 
        ? conversation.id 
        : `group_${conversation.id}`;
      
      // Enviar mensaje a través de la nueva API específica para grupos
      const response = await fetch('/api/messages/group-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: tempMessage.content,
          conversationId: groupId,
          messageType: 'text',
          tempId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }
      
      const sentMessage = await response.json();
      
      // Actualizar el mensaje temporal con los datos del servidor
      const finalMessage: Message = {
        ...sentMessage,
        tempId,
        status: 'sent',
      };
      
      processMessages([finalMessage]);
      
      // Si tenemos socket, enviar notificación en tiempo real
      if (socketInstance && socketInitialized) {
        // Usamos el mismo formato que el backend para mantener consistencia
        const socketMessage = {
          ...finalMessage,
          isGroupMessage: true,
          id: finalMessage.tempId // Asegurarnos de que tiene un ID para el socket
        };
        console.log('Emitiendo mensaje por socket:', socketMessage);
        socketInstance.emit('send_message', socketMessage);
      }
      
      // No es necesario volver a enviar el mensaje al servidor ya que
      // ya se guardó en la base de datos con la llamada anterior
      // await sendMessageToServer(finalMessage);
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      
      // Marcar el mensaje temporal como fallido
      const errorMessage = {
        ...tempMessage,
        status: 'failed' as const,
      };
      
      processMessages([errorMessage]);
      
      // Mostrar error al usuario
      toast({
        title: "Error al enviar el mensaje",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      });
      
      // Recuperar el texto del mensaje para que el usuario pueda intentar de nuevo
      setNewMessage(tempMessage.content || '');
    } finally {
      setIsSending(false);
    }
  };
  
  // Render principal del componente
  return (
    <div className={cn("flex flex-col max-h-[calc(100vh-4rem)]", className)}>
      {/* Contenedor principal con altura controlada y flex-col */}
      <div className="flex flex-col h-full">
        {/* Área de mensajes con scroll */}
        <div className="flex-1 overflow-y-auto min-h-0 p-4 pb-16" ref={chatContainerRef} onScroll={handleScroll}>
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full">
              <LoadingSpinner className="w-8 h-8 text-blue-500" />
              <p className="mt-2 text-sm text-gray-500">Cargando mensajes...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Loader para mensajes anteriores */}
              {isLoadingMore && (
                <div className="flex justify-center p-2">
                  <LoadingSpinner className="w-5 h-5 text-blue-500" />
                </div>
              )}
              
              {/* Mensajes */}
              {messages.map((message, index) => {
                const isCurrentUser = message.senderId === currentUserId;
                const showAvatar = 
                  index === 0 || 
                  messages[index - 1]?.senderId !== message.senderId;
                
                const showDateSeparator = index === 0 || !isSameDay(
                  new Date(message.createdAt), 
                  new Date(messages[index - 1]?.createdAt || Date.now())
                );
                
                // Encontrar el remitente en la lista de participantes
                const sender = conversation?.participants?.find(
                  p => p.userId === message.senderId
                )?.user;
                
                return (
                  <React.Fragment key={message.id || message.tempId || index}>
                    <MessageItem 
                      message={message}
                      currentUserId={currentUserId || ''}
                      otherUser={{
                        id: sender?.id || '',
                        username: sender?.username || '',
                        name: sender?.name || '',
                        image: sender?.image || ''
                      }}
                      showAvatar={showAvatar}
                      showDateSeparator={showDateSeparator}
                      index={index}
                      session={session}
                      isGroupChat={true}
                    />
                  </React.Fragment>
                );
              })}
              
              {/* Referencia al final de los mensajes para auto-scroll */}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Indicador de escritura - fuera del área de scroll pero antes del input */}
        {typingUsers.length > 0 && (
          <div className="px-4 py-1 text-xs text-gray-500 italic bg-white dark:bg-gray-800">
            {typingUsers.length === 1 
              ? `${typingUsers[0]} está escribiendo...` 
              : typingUsers.length === 2 
                ? `${typingUsers[0]} y ${typingUsers[1]} están escribiendo...` 
                : `${typingUsers.length} personas están escribiendo...`}
          </div>
        )}
        
        {/* Área de entrada de mensajes - ajustada para no estar tan pegada al footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 pb-4 mb-3 flex-shrink-0 bg-white dark:bg-gray-800">
          {isVoiceRecorderVisible ? (
            <VoiceMessageRecorder 
              onSend={async (audioBlob: Blob) => {
                try {
                  setIsSending(true);
                  
                  // Crear un FormData para subir el archivo
                  const formData = new FormData();
                  formData.append('file', audioBlob, 'audio.webm');
                  formData.append('conversationId', conversation.id);
                  
                  // Subir el archivo al servidor
                  const response = await fetch('/api/messages/upload', {
                    method: 'POST',
                    body: formData,
                  });
                  
                  if (!response.ok) {
                    throw new Error('Error al subir el mensaje de voz');
                  }
                  
                  const { url } = await response.json();
                  
                  // Crear el mensaje con los datos necesarios
                  const newMessage = {
                    content: 'Audio mensaje', // Asignar un texto descriptivo en lugar de cadena vacía
                    senderId: currentUserId || '',
                    conversationId: conversation.id,
                    createdAt: new Date(),
                    tempId: Date.now().toString(),
                    mediaUrl: url,
                    messageType: 'voice' as 'voice' | 'text' | 'image' | 'file' | 'video'
                  };
                  
                  // Añadir mensaje al estado local
                  processMessages([newMessage]);
                  
                  // 1. Guardar el mensaje en la base de datos
                  await sendMessageToServer(newMessage);
                  
                  // 2. Enviar mensaje a través de sockets para actualización en tiempo real
                  if (socketInstance && socketInitialized) {
                    // Usamos el mismo formato que el backend para mantener consistencia
                    const socketMessage = {
                      ...newMessage,
                      isGroupMessage: true,
                      id: newMessage.tempId // Asegurarnos de que tiene un ID para el socket
                    };
                    console.log('Emitiendo mensaje por socket:', socketMessage);
                    socketInstance.emit('send_message', socketMessage);
                  }
                  
                  // Auto-scroll si estamos en la parte inferior
                  if (isAtBottom) {
                    setTimeout(scrollToBottom, 100);
                  }
                  
                  // Desactivar el grabador de voz
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
              senderId={session?.user?.id || ''}
              receiverId={conversation.id || ''}
              session={session}
              onClose={() => setIsVoiceRecorderVisible(false)}
              setUploadStatus={(status: string) => {
                // Manejar el estado de la carga aquí si es necesario
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
                  // También implementar notificación de escritura
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

export default GroupChatWindowContent;