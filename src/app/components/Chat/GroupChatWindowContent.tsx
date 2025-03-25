"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, X, Mic, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { flushSync } from 'react-dom';
import useSocket, { MessageType } from '@/src/hooks/useSocket';
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
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
  conversationId?: string;
  read?: boolean;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
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
  const [socketAuthenticated, setSocketAuthenticated] = useState(false);

  // Implementar un controlador de aborto para cancelar peticiones anteriores
  const abortControllerRef = useRef<AbortController | null>(null);

  // Referencia para mantener el último ID de conversación procesado
  const lastProcessedConversationRef = useRef<string | null>(null);

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
    userId: currentUserId,
    username: session?.user?.name || session?.user?.username || undefined,
    onConnect: () => {
      console.log('Socket conectado en GroupChatWindow');
      setSocketInitialized(true);
    },
    onDisconnect: () => {
      console.log('Socket desconectado en GroupChatWindow');
    },
    onError: (error) => {
      console.error('Error en socket:', error);
    }
  });

  // Mantener un registro de qué conversaciones ya se han unido
  const joinedConversationRef = useRef<string | null>(null);
  
  // Aquí implementarías la lógica específica del grupo
  // (cargar mensajes, manejar sockets, etc.)
  
  // Manejar la unión a salas de conversación
  useEffect(() => {
    if (socketInitialized && conversation?.id && currentUserId && connected) {
      socketInstance?.emit('identify', { 
        userId: currentUserId, 
        username: session?.user?.name || session?.user?.username || 'Usuario' 
      });
      
      const timer = setTimeout(() => {
        setSocketAuthenticated(true);
        
        if (joinedConversationRef.current === conversation.id) {
          console.log(`Ya estamos unidos al grupo: ${conversation.id}`);
          return;
        }
        
        if (joinedConversationRef.current && joinedConversationRef.current !== conversation.id) {
          console.log(`Saliendo del grupo anterior: ${joinedConversationRef.current}`);
          leaveConversation(joinedConversationRef.current);
        }
        
        console.log(`Uniéndose al grupo: ${conversation.id} con usuario ${currentUserId}`);
        joinConversation(conversation.id);
        joinedConversationRef.current = conversation.id;
      }, 500);
      
      return () => clearTimeout(timer);
    }
    
    return () => {
      if (socketInitialized && joinedConversationRef.current && currentUserId) {
        console.log(`Limpieza: saliendo del grupo: ${joinedConversationRef.current}`);
        leaveConversation(joinedConversationRef.current);
        joinedConversationRef.current = null;
      }
    };
  }, [socketInitialized, conversation?.id, currentUserId, joinConversation, leaveConversation, connected, socketInstance, session]);
  
  // Función para procesar mensajes
  const processMessages = useCallback((newMessages: Message[]) => {
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
  
  // Separar completamente la función de carga de mensajes del ciclo de vida del componente
  const loadGroupMessages = useCallback(async (groupId: string, isInitialLoad = false) => {
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
  useEffect(() => {
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
    // Solo hacer scroll si no estamos cargando más mensajes (hacia arriba)
    if (!isLoadingMore && messagesEndRef.current && chatContainerRef.current && !preserveScrollPosition) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isLoadingMore, preserveScrollPosition, messages.length]);

  // Manejar scroll automático para nuevos mensajes
  useEffect(() => {
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
      
      // Procesar el mensaje
      processMessages([message]);
      
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
  useEffect(() => {
    // Deshabilitado para evitar renderizados dobles
    // const uniqueMessages = Array.from(messageMap.values()).sort((a, b) => {
    //   const dateA = new Date(a.createdAt);
    //   const dateB = new Date(b.createdAt);
    //   return dateA.getTime() - dateB.getTime();
    // });
    
    // setMessages(uniqueMessages);
  }, [messages]);
  
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
        socketSendMessage({
          ...finalMessage,
          receiverId: 'group', // Marcar que es un mensaje de grupo
          conversationId: groupId
        });
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
      
      // Marcar el mensaje temporal como fallido
      const errorMessage = {
        ...tempMessage,
        status: 'error' as const,
      };
      
      processMessages([errorMessage]);
      
      // Mostrar error al usuario
      toast({
        title: "Error al enviar el mensaje",
        description: error instanceof Error ? error.message : "Inténtalo de nuevo",
        variant: "destructive",
      });
      
      // Recuperar el texto del mensaje para que el usuario pueda intentar de nuevo
      setNewMessage(tempMessage.content);
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
        <div className="flex-1 overflow-y-auto min-h-0 p-4" ref={chatContainerRef} onScroll={handleScroll}>
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
              onSend={async (audioBlob) => {
                try {
                  setIsSending(true);
                  
                  // Crear un FormData para subir el archivo
                  const formData = new FormData();
                  formData.append('file', audioBlob, 'audio.webm');
                  formData.append('conversationId', conversation.id);
                  
                  // Subir el archivo al servidor
                  const response = await fetch('/api/messages/upload-voice', {
                    method: 'POST',
                    body: formData,
                  });
                  
                  if (!response.ok) {
                    throw new Error('Error al subir el mensaje de voz');
                  }
                  
                  const { url } = await response.json();
                  
                  if (socketInstance && socketInitialized) {
                    const newMessage = {
                      content: '',
                      senderId: currentUserId || '', // Ensure senderId is never undefined
                      conversationId: conversation.id,
                      createdAt: new Date(),
                      tempId: Date.now().toString(),
                      mediaUrl: url,
                      messageType: 'voice' as 'voice' | 'text' | 'image' | 'file' | 'video'
                    };
                    
                    // Añadir mensaje al estado local
                    processMessages([newMessage]);
                    
                    // Enviar mensaje al servidor
                    socketInstance.emit('group_message', newMessage);
                    
                    // Auto-scroll si estamos en la parte inferior
                    if (isAtBottom) {
                      setTimeout(scrollToBottom, 100);
                    }
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
              setUploadStatus={(status) => {
                // Manejar el estado de la carga aquí si es necesario
                console.log('Upload status:', status);
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
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