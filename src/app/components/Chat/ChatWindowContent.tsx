"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, X, Mic, Play, Pause, MessageSquare, Square, ChevronRight, SkipForward, SkipBack, Loader2, ChevronUp } from 'lucide-react';
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
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0); // Volver a 0 para evitar mostrar valores incorrectos
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Colores según si es mensaje propio o recibido
  const textColor = isCurrentUser ? 'text-white' : 'text-gray-700 dark:text-gray-200';
  // Mejor contraste para modo claro y oscuro
  const primaryBgColor = isCurrentUser 
    ? 'bg-blue-500/90 hover:bg-blue-500' 
    : 'bg-gray-300 dark:bg-gray-700 hover:bg-gray-400 dark:hover:bg-gray-600';
  const secondaryColor = isCurrentUser 
    ? 'bg-white/30' 
    : 'bg-gray-300 dark:bg-gray-600';
  const secondaryActiveColor = isCurrentUser 
    ? 'bg-white' 
    : 'bg-green-600 dark:bg-green-500';
  
  // Cargar los metadatos del audio cuando el componente se monta
  useEffect(() => {
    let audio = new Audio();
    audio.preload = "metadata";
    audioRef.current = audio;
    
    setIsLoading(true);
    setCurrentTime(0);
    setError(null);
    
    // Función que se ejecuta cuando el audio está listo
    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };
    
    // Función que se ejecuta cuando los metadatos están cargados
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      } else {
        console.warn("Duración inválida:", audio.duration);
        setDuration(0);
      }
      setIsLoading(false);
    };
    
    // Función que se ejecuta cuando se actualiza el tiempo de reproducción
    const handleTimeUpdate = () => {
      if (isFinite(audio.currentTime) && !isNaN(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };
    
    const handleDurationChange = () => {
      if (isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setIsPaused(false);
      setCurrentTime(0);
      if (audio) audio.currentTime = 0;
    };
    
    const handleError = (e: any) => {
      console.error("Error al cargar el audio:", e);
      setError("Error al cargar el audio");
      setIsLoading(false);
    };
    
    // Registrar todos los event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('loadeddata', handleCanPlay);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    
    // Intentar cargar el audio de manera explícita
    try {
      audio.src = mediaUrl;
      audio.load();
    } catch (error) {
      console.error("Error setting audio source:", error);
      setError("Error al cargar el audio");
      setIsLoading(false);
    }
    
    return () => {
      // Limpiar listeners y detener reproducción al desmontar
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('loadeddata', handleCanPlay);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      
      // Cancelar animation frame si existe
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      
      if (isPlaying) {
        audio.pause();
      }
      audio.src = '';
    };
  }, [mediaUrl]);
  
  // Efecto separado para manejar la animación de forma independiente
  useEffect(() => {
    // Función para actualizar el tiempo actual de forma fluida
    const updateTimeAnim = () => {
      if (isPlaying && audioRef.current) {
        if (isFinite(audioRef.current.currentTime) && !isNaN(audioRef.current.currentTime)) {
          setCurrentTime(audioRef.current.currentTime);
        }
        animationRef.current = requestAnimationFrame(updateTimeAnim);
      }
    };
    
    if (isPlaying) {
      animationRef.current = requestAnimationFrame(updateTimeAnim);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  const togglePlayPause = () => {
    if (!audioRef.current || isLoading) return;
    
    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
        setIsPaused(true);
      } else {
        // Reproducir desde el inicio si ya terminó
        if (currentTime >= duration && duration > 0) {
          audioRef.current.currentTime = 0;
          setCurrentTime(0);
        }
        
        // Iniciar reproducción
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setIsPaused(false);
            })
            .catch(error => {
              console.error('Error reproduciendo audio:', error);
              setError('Error al reproducir');
              setIsPlaying(false);
            });
        } else {
          setIsPlaying(true);
          setIsPaused(false);
        }
      }
    } catch (error) {
      console.error('Error en togglePlayPause:', error);
      setError('Error al controlar la reproducción');
    }
  };
  
  const skipForward = () => {
    if (!audioRef.current || isLoading) return;
    
    const newTime = Math.min(audioRef.current.duration, currentTime + 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const skipBackward = () => {
    if (!audioRef.current || isLoading) return;
    
    const newTime = Math.max(0, currentTime - 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const changePlaybackRate = () => {
    if (!audioRef.current || isLoading) return;
    
    // Ciclo entre velocidades: 1x -> 1.5x -> 2x -> 0.5x -> 1x
    const rates = [1, 1.5, 2, 0.5];
    const currentIndex = rates.indexOf(1); // Valor predeterminado
    const nextRate = rates[(currentIndex + 1) % rates.length];
    
    audioRef.current.playbackRate = nextRate;
  };
  
  const handleSliderChange = (e: React.MouseEvent | React.TouchEvent) => {
    if (!audioRef.current || !sliderRef.current || isLoading || duration <= 0) return;
    
    const slider = sliderRef.current;
    const rect = slider.getBoundingClientRect();
    const sliderWidth = rect.width;
    
    // Obtener la posición X del clic o toque
    let clientX;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    const offsetX = clientX - rect.left;
    
    // Protección para valores inválidos
    if (sliderWidth <= 0 || !isFinite(sliderWidth)) return;
    
    const percentage = Math.max(0, Math.min(1, offsetX / sliderWidth));
    
    // Verificación adicional de seguridad
    if (!isFinite(percentage)) return;
    
    // Calcular el nuevo tiempo y establecerlo
    try {
      const newTime = percentage * duration;
      
      // Asegurarse de que el valor sea finito y esté dentro del rango permitido
      if (isFinite(newTime) && newTime >= 0 && newTime <= duration) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    } catch (error) {
      console.error("Error al establecer el tiempo de reproducción:", error);
    }
  };
  
  // Calcular el progreso para la barra (0-100%)
  const calculateProgress = useCallback(() => {
    if (duration <= 0) return 0;
    const progress = (currentTime / duration) * 100;
    return Math.min(Math.max(progress, 0), 100); // Asegurar que esté entre 0-100
  }, [currentTime, duration]);
  
  // Generar barras para la visualización de onda
  const generateWaveform = useCallback(() => {
    const barCount = 30; // Número de barras a mostrar
    const progress = calculateProgress();
    const progressIndex = Math.floor((progress / 100) * barCount);
    
    return Array.from({ length: barCount }).map((_, i) => {
      // Altura aleatoria pero consistente para cada posición
      const randomHeight = 30 + (((i * 13) % 20) + ((i * 5) % 7));
      const heightPercent = randomHeight / 50;
      
      const isActive = i <= progressIndex;
      
      return (
        <div
          key={i}
          className={`${
            isActive ? secondaryActiveColor : secondaryColor
          } mx-[1px] rounded-full transition-all duration-100 ease-out`}
          style={{
            height: `${Math.max(heightPercent * 100, 15)}%`,
            minHeight: '3px',
            width: '2px',
            transform: isActive ? 'scaleY(1.1)' : 'scaleY(1)'
          }}
        />
      );
    });
  }, [calculateProgress, secondaryActiveColor, secondaryColor]);
  
  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
    
    // Redondear a enteros para evitar valores decimales extraños
    const roundedSeconds = Math.round(seconds);
    const minutes = Math.floor(roundedSeconds / 60);
    const remainingSeconds = roundedSeconds % 60;
    
    // Siempre mostrar los segundos con dos dígitos
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="flex items-center w-full space-x-2 min-w-[180px] max-w-[300px]">
      {/* Botón de play/pause */}
      <button 
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`flex-shrink-0 rounded-full p-2 ${primaryBgColor} ${
          isLoading ? 'opacity-50 cursor-wait' : ''
        }`}
        aria-label={isPlaying ? "Pausar" : "Reproducir"}
      >
        {isLoading ? (
          <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ 
              borderColor: isCurrentUser ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.3)', 
              borderTopColor: 'transparent' 
            }}
          />
        ) : isPlaying ? (
          <Pause size={18} className={textColor} />
        ) : (
          <Play size={18} className={textColor} />
        )}
      </button>
      
      {/* Visualización de audio + slider */}
      <div className="flex-1 flex flex-col">
        {/* Simulación de onda de audio */}
        <div 
          className="h-8 flex items-center cursor-pointer"
          onClick={handleSliderChange}
          ref={sliderRef}
        >
          <div className="flex-1 h-6 flex items-center">
            {generateWaveform()}
          </div>
        </div>
      </div>
      
      {/* Tiempo actual/total */}
      <div className={`text-xs flex-shrink-0 ${
        isCurrentUser ? 'text-white' : 'text-gray-700 dark:text-gray-200'
      }`}>
        {error 
          ? "Error" 
          : isLoading 
            ? "..."  // Mostrar puntos mientras carga en lugar de valores predeterminados
            : `${formatTime(currentTime)}/${formatTime(duration)}`}
      </div>
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
  const [socketAuthenticated, setSocketAuthenticated] = useState(false);

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
    },
    onDisconnect: () => {
      console.log('Socket desconectado en ChatWindow');
    },
    onError: (error) => {
      console.error('Error en socket:', error);
    }
  });

  // Mantener un registro de qué conversaciones ya se han unido
  const joinedConversationRef = useRef<string | null>(null);

  // Manejar la unión a salas de conversación en un efecto separado
  useEffect(() => {
    // Solo intentar unirse si el socket está inicializado y tenemos un ID de conversación
    if (socketInitialized && safeConversationId && currentUserId && connected) {
      // Primero, asegurarse de que el usuario esté identificado correctamente
      // Identificar explícitamente al usuario antes de unirse a la conversación
      socketInstance?.emit('identify', { 
        userId: currentUserId, 
        username: session?.user?.name || session?.user?.username || 'Usuario' 
      });
      
      // Ahora unirse a la conversación después de un pequeño retraso
      const timer = setTimeout(() => {
        setSocketAuthenticated(true);
        
        // Si ya estamos en esta conversación, no hacer nada
        if (joinedConversationRef.current === safeConversationId) {
          console.log(`Ya estamos unidos a la conversación: ${safeConversationId}`);
          return;
        }
        
        // Si estábamos en otra conversación, salir primero
        if (joinedConversationRef.current && joinedConversationRef.current !== safeConversationId) {
          console.log(`Saliendo de la conversación anterior: ${joinedConversationRef.current}`);
          leaveConversation(joinedConversationRef.current);
        }
        
        // Unirse a la nueva conversación
        console.log(`Uniéndose a la conversación: ${safeConversationId} con usuario ${currentUserId}`);
        joinConversation(safeConversationId);
        joinedConversationRef.current = safeConversationId;

        // Si hay un ID real de conversación, también unirse a esa sala
        if (actualConversationId && actualConversationId !== safeConversationId) {
          console.log(`Uniéndose a la conversación real: ${actualConversationId}`);
          joinConversation(actualConversationId);
        }
      }, 500); // 500ms debería ser suficiente después de la identificación
      
      return () => clearTimeout(timer);
    }
    
    // Limpieza al desmontar o cambiar de conversación
    return () => {
      // Solo intentar salir si estamos unidos a una conversación
      if (socketInitialized && joinedConversationRef.current && currentUserId) {
        console.log(`Limpieza: saliendo de la conversación: ${joinedConversationRef.current} con usuario ${currentUserId}`);
        leaveConversation(joinedConversationRef.current);
        
        // También salir de la conversación real si existe
        if (actualConversationId && actualConversationId !== joinedConversationRef.current) {
          leaveConversation(actualConversationId);
        }
        
        joinedConversationRef.current = null;
      }
    };
  }, [socketInitialized, safeConversationId, actualConversationId, currentUserId, joinConversation, leaveConversation, connected, socketInstance, session]);
  
  // Función para procesar y deduplicar mensajes
  const processMessages = useCallback((newMessages: Message[], existingMessages: Message[] = []) => {
    // Evitar procesar mensajes vacíos
    if (!newMessages || newMessages.length === 0) return existingMessages;
    
    // Clonar el mapa actual para trabajar sobre una copia
    const updatedMap = new Map(messageMap);
    
    // Filtrar mensajes para incluir solo los que corresponden a esta conversación
    const filteredMessages = newMessages.filter(msg => {
      // Solo procesar mensajes que pertenezcan específicamente a esta conversación
      return msg.conversationId === actualConversationId || 
             msg.conversationId === safeConversationId || 
             // Para mensajes directos sin ID de conversación
             (!msg.conversationId && (
               (msg.senderId === currentUserId && msg.receiverId === otherUser?.id) ||
               (msg.senderId === otherUser?.id && msg.receiverId === currentUserId)
             ));
    });
    
    // Añadir los nuevos mensajes, reemplazando cualquier mensaje temporal con su versión final si tiene ID
    filteredMessages.forEach(msg => {
      // Usamos el ID como clave principal si existe
      if (msg.id) {
        // Si el mensaje tiene ID, es un mensaje confirmado por el servidor
        updatedMap.set(msg.id, msg);
        
        // Si este mensaje tenía un tempId, eliminar la versión temporal
        if (msg.tempId && updatedMap.has(msg.tempId)) {
          updatedMap.delete(msg.tempId);
        }
      } 
      // Para mensajes temporales sin ID (enviados desde el cliente pero aún no confirmados)
      else if (msg.tempId && !updatedMap.has(msg.tempId)) {
        updatedMap.set(msg.tempId, msg);
      }
    });
    
    // Convertir el mapa actualizado a un array y ordenar por fecha de creación
    const allMessages = Array.from(updatedMap.values());
    
    // Aplicar filtro de conversación otra vez para garantizar que solo se muestren mensajes de esta conversación
    const finalMessages = allMessages.filter(msg => {
      return msg.conversationId === actualConversationId || 
             msg.conversationId === safeConversationId || 
             // Para mensajes sin conversationId pero que coincidan con los participantes
             (!msg.conversationId && (
               (msg.senderId === currentUserId && msg.receiverId === otherUser?.id) || 
               (msg.senderId === otherUser?.id && msg.receiverId === currentUserId)
             ));
    });
    
    // Ordenar mensajes por fecha
    finalMessages.sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Actualizar el mapa de mensajes (para referencia futura)
    setMessageMap(updatedMap);
    
    // Aplicar nuevo estado solo si hay cambios
    return finalMessages;
  }, [messageMap, currentUserId, otherUser?.id, actualConversationId, safeConversationId]);
  
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
    const fetchMessages = async (pageNum = 1, existingMessages: Message[] = []) => {
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
        
        // Definir el parámetro 'with'
        let withParam: string;
        
        // Si tenemos un ID de conversación real, añadimos el prefijo adecuado
        if (actualConversationId) {
          // No modificar IDs que ya tengan prefijos
          if (actualConversationId.startsWith('conv_') || actualConversationId.startsWith('group_')) {
            withParam = actualConversationId;
          } else {
            // Para IDs sin prefijo, añadir el prefijo 'conv_'
            withParam = `conv_${actualConversationId}`;
          }
          console.log(`Consultando mensajes con ID de conversación: ${withParam}`);
        } 
        // Si no, usamos el ID del otro usuario directamente
        else {
          withParam = safeConversationId;
          console.log(`Consultando mensajes con ID de usuario: ${withParam}`);
        }
        
        const response = await fetch(
          `${API_ROUTES.messages.list}?with=${withParam}&page=${pageNum}&limit=${pageSize}&t=${Date.now()}`, 
          { cache: 'no-store' } // Evitar caché para obtener siempre datos frescos
        );
        
        // Obtener el texto de la respuesta para diagnóstico
        const responseText = await response.text();
        
        // Si la respuesta indica que la conversación no existe (404)
        if (response.status === 404) {
          console.log('La conversación ya no existe en la base de datos');
          
          // Limpiar la referencia en localStorage
          if (typeof window !== 'undefined' && otherUser?.id) {
            const storageKey = `chat_conv_${otherUser.id}`;
            if (localStorage.getItem(storageKey)) {
              console.log(`Eliminando referencia a conversación eliminada: ${actualConversationId}`);
              localStorage.removeItem(storageKey);
            }
          }
          
          // Liberar recursos del socket si existe una conversación real
          if (actualConversationId && socketInstance) {
            console.log(`Saliendo de la sala de conversación: ${actualConversationId}`);
            leaveConversation(actualConversationId);
          }
          
          // Mostrar mensaje amigable
          setErrorLoadingMessages('Esta conversación ya no existe. Por favor, vuelve a la lista de mensajes e inicia una nueva conversación.');
          setMessages([]);
          
          isFetchingRef.current = false;
          setIsLoadingMessages(false);
          return;
        }
        
        // Para otros errores
        if (!response.ok) {
          console.error(`Error al cargar mensajes (${response.status}): ${responseText}`);
          throw new Error(`Error al cargar los mensajes: ${response.status}`);
        }
        
        // Verificar nuevamente si el ID de conversación ha cambiado durante la carga
        if (currentConversationId !== safeConversationId) {
          isFetchingRef.current = false;
          return;
        }
        
        // Convertir la respuesta de texto a JSON
        let data;
        try {
          data = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Error al parsear la respuesta JSON:', parseError, responseText);
          throw new Error('La respuesta del servidor no es un JSON válido');
        }
        
        // Verificar que la estructura de datos es la esperada
        if (!data) {
          console.error('Estructura de datos inesperada: respuesta vacía');
          throw new Error('El servidor devolvió una respuesta vacía');
        }
        
        // Si la respuesta contiene un array de mensajes (vacío o no), procesarlo normalmente
        if (Array.isArray(data.messages)) {
          console.log(`Recibidos ${data.messages.length} mensajes para la conversación ${withParam}`);
          
          const fetchedMessages = data.messages;
          
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
          const combinedMessages = [...messages, ...fetchedMessages];
          const uniqueMessages = processMessages(combinedMessages, []);
          
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
          const uniqueKey = `old-${msg.senderId}-${Date.parse(msg.createdAt)}-${Math.random().toString(36).substring(2, 9)}`;
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
  
  // Manejador de scroll para detectar si estamos en la parte inferior - versión unificada
  const handleScroll = () => {
    const element = chatContainerRef.current;
    if (element) {
      const isNearBottom = 
        element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      setIsAtBottom(isNearBottom);
      setAutoScrollEnabled(isNearBottom);
    }
  };
  
  useEffect(() => {
    const element = chatContainerRef.current;
    if (element) {
      const isNearBottom = 
        element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      setIsAtBottom(isNearBottom);
      setAutoScrollEnabled(isNearBottom);
    }
  }, [chatContainerRef]);

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
    
    // Ya no unimos directamente aquí, esto se maneja en el efecto específico arriba
    
    // Al desmontar el componente, marcar como inactivo
    return () => {
      if (setActive && currentUserId) {
        // No desconectamos inmediatamente al salir, solo marcamos como inactivo
        setActive(false);
      }
      
      // Ya no manejamos la salida de la conversación aquí
    };
  }, [socketInitialized, currentUserId, setActive, connected, reconnect]);

  // Manejar los eventos del socket para nuevos mensajes
  useEffect(() => {
    // No hacer nada si no hay usuario actual, receptor o ID de conversación o si el socket no está autenticado
    if (!currentUserId || !otherUser?.id || !safeConversationId || !socketAuthenticated) return;
    
    // Callback para manejar nuevos mensajes recibidos por el socket
    const handleNewMessage = (message: any) => {
      console.log('Nuevo mensaje recibido por socket:', message);
      
      // Verificar si el mensaje pertenece a esta conversación
      const belongsToConversation = 
        message.conversationId === actualConversationId || 
        message.conversationId === safeConversationId ||
        // Para mensajes directos sin ID de conversación
        (!message.conversationId && (
          (message.senderId === currentUserId && message.receiverId === otherUser?.id) ||
          (message.senderId === otherUser?.id && message.receiverId === currentUserId)
        ));
      
      if (!belongsToConversation) {
        console.log('Mensaje ignorado: no pertenece a esta conversación');
        return;
      }
      
      // Si el mensaje es de otra persona, marcarlo como leído
      if (message.senderId === otherUser?.id && !message.read && socketInstance) {
        console.log('Marcando mensaje como leído:', message.id);
        socketMarkMessageAsRead({
          messageId: message.id as string,
          conversationId: message.conversationId || safeConversationId
        });
      }
      
      // Procesar el nuevo mensaje con nuestra función de deduplicación
      processMessages([message], messages);
      
      // Scroll automático a la parte inferior si el usuario está cerca del final
      if (isAtBottom && messagesEndRef.current) {
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    };
    
    // Conectarse a los eventos del socket solo si el socket está inicializado
    if (socketInitialized) {
      console.log('Registrando handler para new_message en conversación', safeConversationId);
      // Evitar conectarse múltiples veces
      socketInstance?.off('new_message', handleNewMessage);
      socketInstance?.on('new_message', handleNewMessage);
    }
    
    // Limpieza al desmontar
    return () => {
      console.log('Eliminando handler para new_message');
      socketInstance?.off('new_message', handleNewMessage);
    };
  }, [currentUserId, otherUser?.id, safeConversationId, actualConversationId, socketInitialized, isAtBottom, socketMarkMessageAsRead, socketInstance, socketAuthenticated]);
  
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
  
  // Efecto para reconectar el socket automáticamente si se desconecta
  useEffect(() => {
    if (!connected && currentUserId) {
      console.log('Socket desconectado, intentando reconectar...');
      reconnect();
    }
  }, [connected, currentUserId, reconnect]);
  
  // Efecto para notificar al servidor cuando el usuario está activo en la conversación
  useEffect(() => {
    // Solo ejecutar cuando cambia la conversación o se inicializa el socket
    if (socketInitialized && safeConversationId) {
      setActive(true);
      
      // Marcar mensajes no leídos como leídos una sola vez cuando se inicia la conversación
      const unreadMessages = messages.filter(m => 
        m.senderId === otherUser?.id && 
        !m.read && 
        m.id
      );
      
      if (unreadMessages.length > 0) {
        console.log(`Marcando ${unreadMessages.length} mensajes como leídos`);
        unreadMessages.forEach(message => {
          if (message.id) {
            socketMarkMessageAsRead({
              messageId: message.id,
              conversationId: message.conversationId || safeConversationId
            });
          }
        });
      }
    }
    
    return () => {
      if (socketInitialized) {
        setActive(false);
      }
    };
  }, [socketInitialized, safeConversationId, otherUser?.id, messages, setActive, socketMarkMessageAsRead]);
  
  // Efecto para cargar el ID de conversación real desde localStorage al iniciar (una sola vez)
  useEffect(() => {
    if (typeof window !== 'undefined' && otherUser?.id && !actualConversationId) {
      const savedConversationId = localStorage.getItem(`chat_conv_${otherUser.id}`);
      if (savedConversationId) {
        console.log(`Recuperando conversationId guardado: ${savedConversationId}`);
        setActualConversationId(savedConversationId);
      }
    }
  }, [otherUser?.id, actualConversationId]);
  
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

  // Efecto para hacer scroll al final cuando los mensajes se cargan inicialmente
  useEffect(() => {
    if (!isLoadingMessages && messages.length > 0) {
      scrollToBottom();
    }
  }, [isLoadingMessages, messages.length]);

  return (
    <div className={`flex flex-col max-h-[calc(100vh-4rem)] ${className}`}>
      {/* Contenedor principal con altura controlada y flex-col */}
      <div className="flex flex-col h-full">
        {/* Área de mensajes con scroll */}
        <div className="flex-1 overflow-y-auto min-h-0" ref={chatContainerRef} onScroll={handleScroll}>
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-sm text-gray-500">Cargando mensajes...</p>
            </div>
          ) : (
            <>
              {hasMore && (
                <div className="flex justify-center p-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={loadMoreMessages}
                    disabled={isLoadingMore}
                    className="text-xs flex items-center gap-1"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>Cargando...</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="h-3 w-3" />
                        <span>Cargar mensajes anteriores</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              <div className="flex flex-col space-y-2 p-4 pb-2">
                {/* Renderizar mensajes agrupados por día */}
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
                
                {/* Mostrar indicador de "está escribiendo" */}
                {peerIsTyping && (
                  <div className="flex items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8">
                        {otherUser?.image ? (
                          <AvatarImage src={otherUser.image} />
                        ) : (
                          <AvatarFallback>
                            {otherUser?.username?.[0]?.toUpperCase() || "?"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-lg">
                        <span className="typing-indicator">
                          <span className="dot"></span>
                          <span className="dot"></span>
                          <span className="dot"></span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Elemento para el scroll automático */}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>

        {/* Indicador de escritura - fuera del área de scroll pero antes del input */}
        {peerIsTyping && (
          <div className="px-4 py-1 text-xs text-gray-500 italic bg-white dark:bg-gray-800">
            {otherUser?.username || 'El otro usuario'} está escribiendo...
          </div>
        )}

        {/* Contenedor para la entrada de mensajes - ajustado para no quedar pegado al footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-3 pb-4 mb-3 flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm">
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
      </div>

      {/* Componente de grabación de voz */}
      {isVoiceRecorderVisible && currentUserId && otherUser && (
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
          isVisible={true}
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
    </div>
  );
}
