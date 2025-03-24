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
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageMap, setMessageMap] = useState<Map<string, Message>>(new Map());
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVoiceRecorderVisible, setIsVoiceRecorderVisible] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
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
  const [socketAuthenticated, setSocketAuthenticated] = useState(false);

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
  
  // Función para procesar y deduplicar mensajes
  const processMessages = useCallback((newMessages: Message[], existingMessages: Message[] = []) => {
    if (!newMessages || newMessages.length === 0) return existingMessages;
    
    const updatedMap = new Map(messageMap);
    
    newMessages.forEach(msg => {
      if (msg.id) {
        updatedMap.set(msg.id, msg);
        
        if (msg.tempId && updatedMap.has(msg.tempId)) {
          updatedMap.delete(msg.tempId);
        }
      } 
      else if (msg.tempId) {
        updatedMap.set(msg.tempId, msg);
      }
      else {
        const now = Date.now();
        const uniqueKey = `msg-${msg.senderId}-${now}-${Math.random().toString(36).substr(2, 9)}`;
        updatedMap.set(uniqueKey, msg);
      }
    });
    
    setMessageMap(updatedMap);
    
    const uniqueMessages = Array.from(updatedMap.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
    
    return uniqueMessages;
  }, [messageMap]);
  
  // Cargar mensajes
  useEffect(() => {
    if (!conversation?.id || isFetchingRef.current) return;
    
    const fetchMessages = async (pageNum = 1) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      
      setIsLoadingMessages(true);
      setErrorLoadingMessages(null);
      
      try {
        if (!conversation.id || !currentUserId) {
          throw new Error('Faltan datos necesarios para cargar mensajes');
        }
        
        // Las conversaciones de grupo NO llevan el prefijo 'conv_' en la base de datos
        const withParam = conversation.id;
        
        const response = await fetch(
          `${API_ROUTES.messages.list}?with=${withParam}&page=${pageNum}&limit=${pageSize}&t=${Date.now()}`, 
          { cache: 'no-store' }
        );
        
        const responseText = await response.text();
        
        if (response.status === 404) {
          console.log('El grupo ya no existe en la base de datos');
          setErrorLoadingMessages('Este grupo ya no existe. Por favor, vuelve a la lista de mensajes.');
          setMessages([]);
          
          isFetchingRef.current = false;
          setIsLoadingMessages(false);
          return;
        }
        
        if (!response.ok) {
          console.error(`Error al cargar mensajes (${response.status}): ${responseText}`);
          throw new Error(`Error al cargar los mensajes: ${response.status}`);
        }
        
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error al parsear la respuesta JSON:', parseError, responseText);
          throw new Error('La respuesta del servidor no es un JSON válido');
        }
        
        if (!data) {
          console.error('Estructura de datos inesperada: respuesta vacía');
          throw new Error('El servidor devolvió una respuesta vacía');
        }
        
        if (Array.isArray(data.messages)) {
          console.log(`Recibidos ${data.messages.length} mensajes para el grupo ${conversation.id}`);
          
          const fetchedMessages = data.messages;
          const uniqueMessages = processMessages(fetchedMessages, []);
          
          setMessages(uniqueMessages);
          setHasMore(fetchedMessages.length === pageSize);
          setPage(pageNum);
        } else {
          console.error('Estructura de datos inesperada:', data);
          throw new Error('El servidor devolvió una estructura de datos inesperada');
        }
      } catch (error) {
        console.error('Error al cargar los mensajes:', error);
        setErrorLoadingMessages('No se pudieron cargar los mensajes. Inténtalo de nuevo.');
      } finally {
        setIsLoadingMessages(false);
        isFetchingRef.current = false;
      }
    };
    
    fetchMessages();
  }, [conversation?.id, currentUserId, processMessages]);
  
  // Manejar envío de mensajes
  const handleSendMessage = async () => {
    if (!newMessage.trim() || isSending || !currentUserId || !conversation?.id) return;
    
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const tempMessage: Message = {
      tempId,
      content: newMessage.trim(),
      senderId: currentUserId,
      createdAt: new Date(),
      status: 'sending',
      conversationId: conversation.id,
      messageType: 'text'
    };
    
    // Añadir mensaje temporal a la lista
    processMessages([tempMessage], messages);
    
    // Limpiar campo de texto
    setNewMessage('');
    
    try {
      setIsSending(true);
      
      // Enviar mensaje a través de la API
      const response = await fetch(API_ROUTES.messages.send, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: tempMessage.content,
          conversationId: conversation.id,
          messageType: 'text'
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
      
      processMessages([finalMessage], messages);
      
      // Si tenemos socket, enviar notificación en tiempo real
      if (socketInstance && socketInitialized) {
        socketSendMessage({
          ...finalMessage,
          receiverId: 'group', // Marcar que es un mensaje de grupo
          conversationId: conversation.id
        });
      }
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      
      // Actualizar estado del mensaje temporal a error
      const errorMessage: Message = {
        ...tempMessage,
        status: 'error',
      };
      
      processMessages([errorMessage], messages);
    } finally {
      setIsSending(false);
    }
  };
  
  // Función para cargar más mensajes antiguos
  const loadMoreMessages = async () => {
    // Implementación similar a ChatWindowContent
  };
  
  // Scroll automático cuando llegan nuevos mensajes
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current && autoScrollEnabled && !isLoadingMore) {
      messagesEndRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [messages, autoScrollEnabled, isLoadingMore]);
  
  // Escuchar nuevos mensajes por socket
  useEffect(() => {
    const handleNewMessage = (message: MessageType) => {
      if (message.conversationId === conversation?.id) {
        processMessages([message], messages);
      }
    };
  
    socketInstance?.on('new_message', handleNewMessage);
    return () => {
      socketInstance?.off('new_message', handleNewMessage);
    };
  }, [socketInstance, conversation?.id, messages, processMessages]);
  
  // Renderización del componente
  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-900", className)}>
      {/* Cabecera del grupo */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            {conversation?.imageUrl ? (
              <AvatarImage src={conversation.imageUrl} alt={conversation.name || 'Grupo'} />
            ) : (
              <AvatarFallback>
                {conversation?.name?.charAt(0).toUpperCase() || 'G'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h2 className="font-semibold text-lg">{conversation?.name || 'Grupo'}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {conversation?.participants?.length || 0} participantes
            </p>
          </div>
        </div>
      </div>
      
      {/* Contenedor de mensajes */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={() => {
          const element = chatContainerRef.current;
          if (element) {
            // Verificar si estamos cerca del top para cargar más mensajes
            if (element.scrollTop < 100 && hasMore && !isLoadingMore) {
              loadMoreMessages();
            }
            
            // Verificar si estamos cerca del bottom para auto-scroll
            const isNearBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
            setAutoScrollEnabled(isNearBottom);
          }
        }}
      >
        {/* Spinner de carga inicial */}
        {isLoadingMessages && messages.length === 0 && (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner />
          </div>
        )}
        
        {/* Mensaje de error */}
        {errorLoadingMessages && (
          <div className="flex justify-center items-center h-40 text-center text-red-500 px-4">
            {errorLoadingMessages}
          </div>
        )}
        
        {/* Spinner de carga para mensajes antiguos */}
        {isLoadingMore && (
          <div className="flex justify-center items-center py-2">
            <LoadingSpinner size="small" />
          </div>
        )}
        
        {/* Lista de mensajes */}
        {messages.length > 0 && messages.map((message, index) => {
          const isCurrentUser = message.senderId === currentUserId;
          
          // Determinar si mostrar avatar y separador de fecha
          const showAvatar = index === 0 || 
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
                otherUser={sender || null}
                showAvatar={showAvatar}
                showDateSeparator={showDateSeparator}
                index={index}
                session={session}
              />
            </React.Fragment>
          );
        })}
        
        {/* Indicador de escritura */}
        {peerIsTyping && (
          <div className="flex items-center space-x-2 pl-10">
            <div className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 p-2 rounded-lg rounded-bl-none">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-500 dark:bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}
        
        {/* Referencia al final de los mensajes para auto-scroll */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Área de entrada de mensajes */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {isVoiceRecorderVisible ? (
          <VoiceMessageRecorder 
            onSend={async (audioBlob) => {
              // Implementar el envío de mensajes de voz
              setIsVoiceRecorderVisible(false);
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
          <div className="flex items-end space-x-2">
            <Textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // También implementar notificación de escritura
              }}
              placeholder="Escribe un mensaje..."
              className="flex-1 max-h-32 resize-none"
              ref={messageInputRef}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsVoiceRecorderVisible(true)}
              >
                <Mic className="h-5 w-5" />
              </Button>
              <Button
                variant="default"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || isSending}
              >
                {isSending ? (
                  <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupChatWindowContent;