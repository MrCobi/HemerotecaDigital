"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, X, Mic, Play, Pause, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
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
  deleted?: boolean;
  deletedReason?: 'spam' | 'duplicate' | 'other';
};

type ChatWindowContentProps = {
  otherUser: User | null;
  conversationId?: string;
  className?: string;
};

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'error';

// Componente para mostrar separadores de fecha entre mensajes
const DateSeparator = ({ date }: { date: Date | string }) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  let displayDate;
  
  if (isToday(dateObj)) {
    displayDate = 'Hoy';
  } else if (isYesterday(dateObj)) {
    displayDate = 'Ayer';
  } else {
    // Formato simple para evitar problemas de compatibilidad
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('es-ES', { month: 'long' });
    const year = dateObj.getFullYear();
    displayDate = `${day} ${month} ${year}`;
  }
  
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
        {displayDate}
      </div>
    </div>
  );
};

// Componente Message separado para manejar cada mensaje individualmente y evitar problemas de renderizado
const MessageItem = React.memo(({ 
  message, 
  currentUserId,
  otherUser,
  showAvatar,
  showDateSeparator,
  index,
  session
}: { 
  message: Message, 
  currentUserId: string,
  otherUser: User | null,
  showAvatar: boolean,
  showDateSeparator: boolean,
  index: number,
  session: any
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  
  return (
    <>
      {/* Separador de fecha cuando cambia el día */}
      {showDateSeparator && (
        <DateSeparator date={message.createdAt} />
      )}
      
      <div
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
              <div className="flex flex-col space-y-1 w-full">
                <div className="flex items-center space-x-2">
                  <VoiceMessagePlayer mediaUrl={message.mediaUrl} isCurrentUser={isCurrentUser} />
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
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
            
            {isCurrentUser && message.status && (
              <span className="ml-2">
                {message.status === 'sending' && <span>Enviando...</span>}
                {message.status === 'sent' && <span>Enviado</span>}
                {message.status === 'delivered' && <span>Entregado</span>}
                {message.status === 'read' && <span>Leído</span>}
                {message.status === 'error' && <span className="text-red-500">Error</span>}
              </span>
            )}
          </div>
        </div>
        
        {isCurrentUser && showAvatar && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            {session?.user?.image ? (
              <AvatarImage src={session.user.image} alt={session.user.name || 'Usuario'} />
            ) : (
              <AvatarFallback>
                {session?.user?.name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        )}
      </div>
    </>
  );
});

MessageItem.displayName = 'MessageItem';

const VoiceMessagePlayer = React.memo(({ 
  mediaUrl, 
  isCurrentUser 
}: { 
  mediaUrl: string; 
  isCurrentUser: boolean 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Cargar los metadatos del audio cuando el componente se monta
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    
    const audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    
    // Evento para cuando los metadatos están cargados (duración disponible)
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      setIsLoading(false);
    };
    
    // Evento para actualizar tiempo durante reproducción
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    
    // Cuando termina la reproducción
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    
    // Manejar errores de carga
    const handleError = () => {
      console.error("Error cargando audio:", audio.error);
      setError("Error al cargar el audio");
      setIsLoading(false);
    };
    
    // Registrar todos los event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Iniciar carga del audio
    audio.src = mediaUrl;
    
    // Limpieza al desmontar
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.src = "";
    };
  }, [mediaUrl]);
  
  // Alternar reproducción/pausa
  const togglePlayPause = () => {
    if (!audioRef.current || isLoading) return;
    
    if (error) {
      // Reintentar reproducción si hubo un error
      setIsLoading(true);
      setError(null);
      if (audioRef.current) {
        audioRef.current.load();
        return;
      }
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Intentar cargar y luego reproducir
      const playPromise = audioRef.current.play();
      
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Error reproduciendo audio:", error);
            setError("Error al reproducir");
            setIsPlaying(false);
          });
      }
    }
  };
  
  // Formatear segundos a MM:SS
  const formatTime = (seconds: number) => {
    // Protección contra valores no válidos
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) {
      return "0:00";
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  
  // Generar la forma de onda visual (simplificada para el ejemplo)
  const renderWaveform = () => {
    // En un caso real, usarías los datos del audio para generar una forma de onda más precisa
    const barCount = 20;
    const bars = [];
    
    for (let i = 0; i < barCount; i++) {
      // Calcula qué tan llena debería estar la barra en función del progreso
      const isFilled = (currentTime / duration) * barCount > i;
      
      // Altura aleatoria para simular una forma de onda (en un caso real, usarías datos del audio)
      const heightPercentage = 30 + Math.random() * 70;
      
      bars.push(
        <div 
          key={i} 
          className={`w-1 mx-[1px] rounded-full ${
            isFilled 
              ? isCurrentUser ? 'bg-white/90' : 'bg-gray-800 dark:bg-white/80' 
              : isCurrentUser ? 'bg-white/30' : 'bg-gray-400 dark:bg-white/30'
          }`}
          style={{ height: `${heightPercentage}%` }}
        />
      );
    }
    
    return (
      <div className="flex items-center h-8 flex-1 mx-2">
        {bars}
      </div>
    );
  };
  
  return (
    <div className="flex items-center space-x-2 w-full min-w-[180px] max-w-[250px]">
      {/* Botón de reproducción/pausa/carga */}
      <button 
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`flex-shrink-0 rounded-full p-1.5 ${
          isCurrentUser 
            ? 'bg-white/25 hover:bg-white/40' 
            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
        } ${isLoading ? 'opacity-50 cursor-wait' : ''}`}
        aria-label={isPlaying ? "Pausar" : isLoading ? "Cargando" : "Reproducir"}
      >
        {isLoading ? (
          <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
            style={{ 
              borderColor: isCurrentUser ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)', 
              borderTopColor: 'transparent' 
            }}
          />
        ) : isPlaying ? (
          <Pause size={16} className={isCurrentUser ? "text-white" : "text-gray-800 dark:text-white"} />
        ) : (
          <Play size={16} className={isCurrentUser ? "text-white" : "text-gray-800 dark:text-white"} />
        )}
      </button>
      
      {/* Visualización tipo waveform */}
      {renderWaveform()}
      
      {/* Duración o mensaje de error */}
      <span className={`text-xs flex-shrink-0 ${
        isCurrentUser ? 'text-white/80' : 'text-gray-500 dark:text-gray-300'
      }`}>
        {error ? "Error" : isLoading ? "..." : duration > 0 ? formatTime(isPlaying ? currentTime : duration) : "0:00"}
      </span>
    </div>
  );
});

VoiceMessagePlayer.displayName = 'VoiceMessagePlayer';

export const ChatWindowContent: React.FC<ChatWindowContentProps> = ({
  otherUser,
  conversationId,
  className,
}) => {
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [processedMessageIds, setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [messageMap, setMessageMap] = useState<Map<string, Message>>(new Map());
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVoiceRecorderVisible, setIsVoiceRecorderVisible] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState<boolean | null>(null);
  const [isCheckingRelationship, setIsCheckingRelationship] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, setPeerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [showDeletedNotification, setShowDeletedNotification] = useState<{ message: string, type: string } | null>(null);
  
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
  
  // Ref para rastrear cambios de conversación
  const lastConversationIdRef = useRef<string | null>(null);
  
  // Estado para el socket
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  
  // Al principio del componente, asegurar que conversationId siempre sea string
  const safeConversationId = conversationId || (otherUser?.id || '');
  
  // Nuevo estado para almacenar el ID de conversación real después de obtenerlo
  const [actualConversationId, setActualConversationId] = useState<string | null>(conversationId || null);
  
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
      console.log('Socket conectado en ChatWindow');
      setSocketInitialized(true);
      
      // Cuando el socket se conecta, unirse a la sala de la conversación
      if (safeConversationId) {
        joinConversation(safeConversationId);
      }
    },
    onDisconnect: () => {
      console.log('Socket desconectado en ChatWindow');
      // No hacemos setSocketInitialized(false) para evitar problemas con la interfaz
    },
    onError: (error) => {
      console.error('Error en socket:', error);
    }
  });
  
  // Función para procesar y deduplicar mensajes
  const processMessages = useCallback((newMessages: Message[], existingMessages: Message[] = []) => {
    // Evitar procesar mensajes vacíos
    if (!newMessages || newMessages.length === 0) return existingMessages;
    
    // Clonar el mapa actual para trabajar sobre una copia
    const updatedMap = new Map(messageMap);
    
    // Añadir los nuevos mensajes, reemplazando cualquier mensaje temporal con su versión final si tiene ID
    newMessages.forEach(msg => {
      // Verificar duplicados exactos (mismo contenido, mismo remitente, en los últimos 30 segundos)
      const isDuplicate = Array.from(updatedMap.values()).some(existingMsg => {
        if (existingMsg.senderId === msg.senderId && 
            existingMsg.content === msg.content && 
            existingMsg.content.trim() !== '' &&
            msg.messageType === 'text') {
          
          const existingDate = new Date(existingMsg.createdAt);
          const newDate = new Date(msg.createdAt);
          const timeDiffSeconds = Math.abs(newDate.getTime() - existingDate.getTime()) / 1000;
          
          // Considerar duplicado si el mensaje es igual y enviado en los últimos 30 segundos
          return timeDiffSeconds < 30;
        }
        return false;
      });
      
      // Si es un duplicado, marcar como eliminado y mostrar notificación
      if (isDuplicate && msg.messageType === 'text' && !msg.id) {
        msg.deleted = true;
        msg.deletedReason = 'duplicate';
        
        // Mostrar notificación
        setShowDeletedNotification({
          message: 'Un mensaje ha sido filtrado por ser duplicado',
          type: 'duplicate'
        });
        
        // Auto-ocultar la notificación después de 5 segundos
        setTimeout(() => setShowDeletedNotification(null), 5000);
      }
      
      // Usamos el ID como clave principal si existe
      if (msg.id) {
        // Si el mensaje tiene ID, es un mensaje confirmado por el servidor
        updatedMap.set(msg.id, msg);
        
        // Si este mensaje tenía un tempId, eliminar la versión temporal
        if (msg.tempId && updatedMap.has(msg.tempId)) {
          updatedMap.delete(msg.tempId);
        }
      } 
      // Si no tiene ID pero tiene tempId, usamos el tempId como clave
      else if (msg.tempId) {
        // Solo añadir si no existe ya o actualizar mensaje temporal existente
        updatedMap.set(msg.tempId, msg);
      }
      // Para mensajes sin ID ni tempId (caso raro), crear una clave única compuesta
      else {
        // Generar una clave única para cada mensaje, incluso si tienen el mismo contenido
        const uniqueKey = `msg-${msg.senderId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        updatedMap.set(uniqueKey, msg);
      }
    });
    
    // Actualizar el estado del mapa de mensajes
    setMessageMap(updatedMap);
    
    // Convertir el mapa a un array y ordenar por fecha de creación
    const uniqueMessages = Array.from(updatedMap.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
    
    return uniqueMessages;
  }, [messageMap]);

  // Actualizar el estado de mensajes cuando cambia el mapa
  useEffect(() => {
    const uniqueMessages = Array.from(messageMap.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
    
    setMessages(uniqueMessages);
  }, [messageMap]);

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

  // Cargar mensajes cuando cambia la conversación o al iniciar
  useEffect(() => {
    // No hacer nada si no hay ID de conversación o ya se están cargando
    if (!safeConversationId || isFetchingRef.current) return;
    
    // Guardar el ID de conversación actual para detectar cambios
    const currentConversationId = safeConversationId;
    
    // Limpiar mensajes si cambia la conversación
    if (lastConversationIdRef.current !== safeConversationId) {
      setPage(1);
      setHasMore(true);
      setMessages([]);
      setMessageMap(new Map());
      lastConversationIdRef.current = safeConversationId;
    }
    
    // Función para obtener mensajes
    const fetchMessages = async (pageNum = 1, existingMsgs: Message[] = []) => {
      // Prevenir múltiples peticiones simultáneas
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      
      // No ejecutar la petición si el ID de conversación ha cambiado mientras se cargaba
      if (currentConversationId !== safeConversationId) {
        isFetchingRef.current = false;
        return;
      }
      
      setIsLoadingMessages(true);
      setErrorLoadingMessages('');
      
      try {
        // Verificar que tenemos los datos necesarios
        if (!safeConversationId || !currentUserId || !otherUser?.id) {
          throw new Error('Faltan datos necesarios para cargar mensajes');
        }
        
        // Parámetro 'with' es el ID de conversación o el ID del otro usuario
        const withParam = actualConversationId || safeConversationId;
        
        const response = await fetch(
          `${API_ROUTES.messages.list}?with=${withParam}&page=${pageNum}&limit=${pageSize}`
        );
        
        if (!response.ok) {
          throw new Error('Error al cargar los mensajes');
        }
        
        // Verificar nuevamente si el ID de conversación ha cambiado durante la carga
        if (currentConversationId !== safeConversationId) {
          isFetchingRef.current = false;
          return;
        }
        
        const data = await response.json();
        const fetchedMessages = Array.isArray(data.messages) ? data.messages : [];
        
        // Si hay mensajes, verificar si tienen un conversationId y guardarlo
        if (fetchedMessages.length > 0 && fetchedMessages[0].conversationId) {
          const msgConversationId = fetchedMessages[0].conversationId;
          if (msgConversationId && !actualConversationId) {
            console.log(`Actualizado conversationId: ${msgConversationId}`);
            setActualConversationId(msgConversationId);
            
            // Guardar en localStorage para recordar este conversationId
            if (typeof window !== 'undefined') {
              localStorage.setItem(`chat_conv_${otherUser?.id}`, msgConversationId);
            }
          }
        }
        
        // Procesar y combinar mensajes evitando duplicados
        const combinedMessages = [...existingMsgs, ...fetchedMessages];
        const uniqueMessages = processMessages(combinedMessages, []);
        
        setMessages(uniqueMessages);
        setHasMore(fetchedMessages.length === pageSize);
        setPage(pageNum);
        
      } catch (error) {
        console.error('Error al cargar los mensajes:', error);
        setErrorLoadingMessages('No se pudieron cargar los mensajes. Inténtalo de nuevo.');
      } finally {
        if (pageNum === 1 || !hasMore) {
          setIsLoadingMessages(false);
        }
        isFetchingRef.current = false;
      }
    };
    
    fetchMessages();
    
    // Solo incluir safeConversationId como dependencia para evitar el bucle infinito
    // Las otras variables las capturamos en el closure
  }, [safeConversationId, hasMore, pageSize]);

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
        `${API_ROUTES.messages.list}?with=${actualConversationId || safeConversationId}&page=${nextPage}&limit=${pageSize}`
      );

      if (!response.ok) {
        throw new Error('Error al cargar más mensajes');
      }

      const data = await response.json();
      const oldMessages = Array.isArray(data.messages) ? data.messages : [];
      
      // Añadir cada mensaje con ID único basado en su fecha real y ID para evitar duplicados
      oldMessages.forEach((msg: any) => {
        // Asegurar que cada mensaje tenga un ID único incluso si el contenido es idéntico
        // Si tiene ID del servidor, usamos ese ID directamente
        if (msg.id) {
          setMessageMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(msg.id, msg);
            return newMap;
          });
        } else {
          // Si no tiene ID (raro para mensajes antiguos), usar timestamp y random
          const uniqueKey = `old-${msg.senderId}-${Date.parse(msg.createdAt)}-${Math.random().toString(36).substr(2, 9)}`;
          setMessageMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(uniqueKey, msg);
            return newMap;
          });
        }
      });
      
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

  // Manejar scroll automático
  useEffect(() => {
    const handleNewMessage = (message: MessageType) => {
      if (message.conversationId === safeConversationId) {
        // Procesar el nuevo mensaje con nuestra función de deduplicación
        processMessages([message], messages);
        
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
  }, [socketInstance, safeConversationId, autoScrollEnabled, messages, processMessages]);

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
    if (newMessage.trim().length > 0 && !isTyping && socketInstance && socketInitialized && currentUserId && otherUser?.id) {
      setIsTyping(true);
      
      // Enviar estado de "escribiendo" al receptor
      socketUpdateTypingStatus({ 
        userId: currentUserId, 
        conversationId: safeConversationId, 
        isTyping: true 
      });
      
      // Limpiar timeout anterior si existe
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Establecer nuevo timeout para detener estado de "escribiendo" después de 3 segundos de inactividad
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (socketInstance && socketInitialized && currentUserId) {
          socketUpdateTypingStatus({ 
            userId: currentUserId, 
            conversationId: safeConversationId, 
            isTyping: false 
          });
        }
      }, 3000);
    }
  }, [isTyping, socketInstance, socketInitialized, otherUser?.id, currentUserId]);

  // Efecto para mantener activo el socket mientras el usuario está en la pantalla de chat
  useEffect(() => {
    // Marcar al usuario como activo al entrar al componente
    if (setActive && currentUserId) {
      setActive(true);
    }

    // Si el socket está desconectado, intentar reconectar
    if (currentUserId && !connected && reconnect) {
      console.log('Socket no conectado, intentando reconectar...');
      reconnect();
    }
    
    // Unirse a la sala de la conversación
    if (safeConversationId && connected && socketInitialized) {
      joinConversation(safeConversationId);
    }

    // Al desmontar el componente, marcar como inactivo
    return () => {
      if (setActive && currentUserId) {
        // No desconectamos inmediatamente al salir, solo marcamos como inactivo
        setActive(false);
      }
      
      // Salir de la sala de conversación
      if (safeConversationId && leaveConversation) {
        leaveConversation(safeConversationId);
      }
    };
  }, [safeConversationId, connected, socketInitialized, currentUserId, setActive, reconnect]);

  // Nueva función para enviar mensaje de voz
  const handleVoiceMessageSend = async (audioBlob: Blob) => {
    if (isSending || !otherUser || !canSendMessages || !currentUserId) return;
    
    setIsSending(true);
    setIsVoiceRecorderVisible(false); // Ocultar grabador inmediatamente al enviar
    
    try {
      console.log("Preparando para enviar mensaje de voz...");
      setUploadStatus('uploading');
      
      // Crear un FormData para subir el archivo
      const formData = new FormData();
      
      // Crear un nuevo archivo con extensión más compatible
      const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, { 
        type: audioBlob.type || 'audio/webm' 
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
        throw new Error("Error al subir el audio: " + errorText);
      }

      const data = await uploadResponse.json();
      // Usar la URL completa devuelta por la API
      const audioUrl = data.url;
      console.log('Audio subido correctamente, URL:', audioUrl);
      
      // Crear mensaje temporal
      const tempId = `voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const messageToSend: Message = {
        tempId,
        content: '',
        mediaUrl: audioUrl,
        messageType: 'voice',
        senderId: currentUserId,
        receiverId: otherUser.id,
        createdAt: new Date(),
        status: 'sending',
        conversationId: actualConversationId || undefined,
      };
      
      // Añadir mensaje al estado local usando la función de procesamiento
      const updatedMessages = addLocalMessage(messageToSend);
      setMessages(updatedMessages);
      
      // Enviar mensaje al servidor
      await sendMessageToServer(messageToSend, tempId);

    } catch (error) {
      console.error('Error enviando mensaje de voz:', error);
      alert("Error al enviar mensaje de voz: " + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsSending(false);
      setUploadStatus('idle');
      // Limpiar cualquier estado relacionado con la grabación en localStorage
      try {
        localStorage.removeItem('voice_recorder_audio_url');
        localStorage.removeItem('voice_recorder_state');
      } catch (e) {
        console.error('Error limpiando localStorage:', e);
      }
    }
  };

  // Enviar un mensaje
  const sendMessage = async () => {
    if (!newMessage.trim() || isSending || !otherUser || !canSendMessages) return;
    
    // Generar un ID temporal único garantizado usando timestamp y random para evitar colisiones
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
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
        conversationId: actualConversationId || undefined,
      };
      
      // Añadir mensaje al estado local usando la función de procesamiento
      const updatedMessages = addLocalMessage(messageToSend);
      setMessages(updatedMessages);
      
      await sendMessageToServer(messageToSend, tempId);
    } catch (error) {
      console.error('Error inesperado al enviar mensaje:', error);
    } finally {
      // Asegurar que isSending se restablece siempre, incluso si la operación es exitosa
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
      const requestBody = {
        content: message.content,
        receiverId: otherUser.id,
        conversationId: actualConversationId || undefined,
        mediaUrl: message.mediaUrl,
        messageType: message.messageType || 'text',
        tempId
      };
      
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.user?.email || ''}`,
        },
        body: JSON.stringify(requestBody),
      });
      
      if (!response.ok) {
        throw new Error('Error al enviar el mensaje');
      }
      
      const data = await response.json();
      
      // Actualizar el mensaje en el estado local con la información del servidor
      updateLocalMessage(tempId, {
        id: data.id,
        status: 'sent',
        conversationId: data.conversationId
      });
      
      // Actualizar la conversación si es necesario
      if (data.conversationId && data.conversationId !== actualConversationId) {
        console.log(`Actualizado conversationId: ${data.conversationId}`);
        setActualConversationId(data.conversationId);
        // Guardar en localStorage
        if (typeof window !== 'undefined' && otherUser?.id) {
          localStorage.setItem(`chat_conv_${otherUser.id}`, data.conversationId);
        }
      }
      
      return data;
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      // Marcar el mensaje como error
      updateLocalMessage(tempId, {
        status: 'error'
      });
      
      throw error; // Re-lanzar el error para que el catch de nivel superior lo maneje
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
  const updateMessageStatus = (messageId: string, newStatus: MessageStatus) => {
    // Buscar el mensaje en nuestro estado para actualizarlo
    const messageToUpdate = messages.find(msg => msg.id === messageId || msg.tempId === messageId);
    
    // Solo actualizar si encontramos el mensaje
    if (messageToUpdate) {
      // Crear una versión actualizada del mensaje con el nuevo estado
      const updatedMessage: Message = {
        ...messageToUpdate,
        status: newStatus
      };
      
      // Procesar la actualización
      processMessages([updatedMessage], messages);
    }
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
    if (!otherUser?.id || !socketInstance || !socketInitialized || !currentUserId) return;
    
    if (isTyping) {
      socketUpdateTypingStatus({ 
        userId: currentUserId, 
        conversationId: safeConversationId, 
        isTyping: true 
      });
      
      // Limpiar timeout anterior si existe
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Establecer nuevo timeout para detener estado de "escribiendo" después de 3 segundos de inactividad
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        if (socketInstance && socketInitialized && currentUserId) {
          socketUpdateTypingStatus({ 
            userId: currentUserId, 
            conversationId: safeConversationId, 
            isTyping: false 
          });
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

  // Añadir efecto para cargar el conversationId desde localStorage al inicio
  useEffect(() => {
    if (otherUser?.id && !actualConversationId && !conversationId) {
      // Intentar cargar de localStorage
      const savedConversationId = typeof window !== 'undefined' 
        ? localStorage.getItem(`chat_conv_${otherUser.id}`)
        : null;
      
      if (savedConversationId) {
        console.log('Cargando conversationId desde localStorage:', savedConversationId);
        setActualConversationId(savedConversationId);
      }
    }
  }, [otherUser?.id, actualConversationId, conversationId]);

  // Nueva función para añadir mensaje local de manera más eficiente
  const addLocalMessage = useCallback((message: Message) => {
    // Añadir el mensaje al mapa directamente
    setMessageMap(prevMap => {
      const newMap = new Map(prevMap);
      if (message.tempId) {
        newMap.set(message.tempId, message);
      } else if (message.id) {
        newMap.set(message.id, message);
      } else {
        // Generar una clave única para el mensaje
        const uniqueKey = `msg-${message.senderId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        newMap.set(uniqueKey, message);
      }
      return newMap;
    });
    
    // Devolver mensajes actualizados para uso inmediato
    return Array.from(messageMap.values())
      .concat([message])
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateA.getTime() - dateB.getTime();
      });
  }, [messageMap]);

  // Función para actualizar mensaje local existente
  const updateLocalMessage = useCallback((messageId: string, updates: Partial<Message>) => {
    setMessageMap(prevMap => {
      const newMap = new Map(prevMap);
      const existingMessage = newMap.get(messageId);
      
      if (existingMessage) {
        // Actualizar el mensaje existente con los nuevos datos
        newMap.set(messageId, { ...existingMessage, ...updates });
        
        // Si el mensaje ahora tiene un ID permanente, moverlo a esa clave
        if (updates.id && messageId !== updates.id) {
          newMap.set(updates.id, { ...existingMessage, ...updates });
          newMap.delete(messageId);
        }
      }
      
      return newMap;
    });
  }, []);

  // Efectos para monitorear la actividad y reconectar el socket si es necesario
  useEffect(() => {
    // Escuchar eventos de actividad del usuario
    const handleUserActivity = () => {
      // Si el socket está desconectado, intentar reconectar
      if (!connected && reconnect && currentUserId) {
        reconnect();
      }
    };
    
    // Agregar event listeners para detectar actividad
    window.addEventListener('focus', handleUserActivity);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);
    
    return () => {
      window.removeEventListener('focus', handleUserActivity);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [connected, reconnect, currentUserId]);

  // Efecto para desplazarse automáticamente al último mensaje al cargar la conversación
  useEffect(() => {
    if (messages.length > 0 && !isLoadingMessages && messagesEndRef.current) {
      // Pequeño timeout para asegurar que el DOM se ha renderizado completamente
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages.length, isLoadingMessages]);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Contenedor de mensajes */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Notificación de mensaje eliminado */}
        {showDeletedNotification && (
          <div className="sticky top-2 z-10 w-fit mx-auto flex items-center gap-2 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-100 text-sm py-2 px-3 rounded-lg shadow-md transition-opacity duration-300">
            <AlertCircle className="h-4 w-4" />
            <span>{showDeletedNotification.message}</span>
            <button 
              className="ml-2 text-amber-600 dark:text-amber-300 hover:text-amber-800 dark:hover:text-amber-100"
              onClick={() => setShowDeletedNotification(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
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
            
            {/* Renderizar cada mensaje con su propia clave única basada en índice */}
            <div className="space-y-4">
              {messages.map((message, index) => {
                const isCurrentUser = message.senderId === currentUserId;
                const showAvatar = 
                  index === 0 || 
                  messages[index - 1].senderId !== message.senderId;
                
                // Determinar si necesitamos mostrar un separador de fecha
                const showDateSeparator = index === 0 || !isSameDay(
                  new Date(message.createdAt),
                  new Date(messages[index - 1].createdAt)
                );
                
                // Crear una clave única y garantizada para cada mensaje
                // Usamos una combinación de índice, id/tempId y timestamp para asegurar unicidad
                const messageKey = `msg-${index}-${message.id || message.tempId || Date.now()}`;
                
                // No mostrar mensajes marcados como eliminados por spam o duplicados
                if (message.deleted) {
                  return (
                    <div key={messageKey} className="flex justify-center">
                      <div className="bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {message.deletedReason === 'duplicate' ? 
                          'Mensaje duplicado eliminado' : 
                          'Mensaje eliminado por seguridad'}
                      </div>
                    </div>
                  );
                }
                
                return (
                  <div key={messageKey}>
                    <MessageItem
                      message={message}
                      currentUserId={currentUserId || ''}
                      otherUser={otherUser}
                      showAvatar={showAvatar}
                      showDateSeparator={showDateSeparator}
                      index={index}
                      session={session}
                    />
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
            </div>
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
                onClick={() => {
                  // Limpiar cualquier estado previo antes de mostrar
                  try {
                    localStorage.removeItem('voice_recorder_audio_url');
                    localStorage.removeItem('voice_recorder_state');
                  } catch (e) {
                    console.error('Error limpiando localStorage:', e);
                  }
                  setIsVoiceRecorderVisible(true);
                }}
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
          onCancel={() => {
            setIsVoiceRecorderVisible(false);
            // Limpiar estados
            setUploadStatus('idle');
            // Limpiar localStorage
            try {
              localStorage.removeItem('voice_recorder_audio_url');
              localStorage.removeItem('voice_recorder_state');
            } catch (e) {
              console.error('Error limpiando localStorage:', e);
            }
          }}
          isVisible={isVoiceRecorderVisible}
          senderId={currentUserId || ''}
          receiverId={otherUser?.id || ''}
          session={session}
          onClose={() => {
            setIsVoiceRecorderVisible(false);
            // Asegurar que todos los estados se limpian
            setUploadStatus('idle');
          }}
          setUploadStatus={setUploadStatus}
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
