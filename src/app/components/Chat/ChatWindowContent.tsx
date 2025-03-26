"use client";
import * as React from 'react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, Mic, Play, Pause, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import useSocket, { MessageType, ReadReceiptType } from '@/src/hooks/useSocket';
import { API_ROUTES } from '@/src/config/api-routes';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import { useToast } from '@/src/app/components/ui/use-toast';

type User = {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

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
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
};

type ChatWindowContentProps = {
  otherUser: User | null;
  conversationId?: string;
  className?: string;
};

type _MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

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
  _index,
  session
}: { 
  message: Message, 
  currentUserId: string,
  otherUser: User | null,
  showAvatar: boolean,
  showDateSeparator: boolean,
  _index: number,
  session: { user?: { id?: string; name?: string | null; image?: string | null; } }
}) => {
  const _isCurrentUser = message.senderId === currentUserId;
  
  return (
    <>
      {/* Separador de fecha cuando cambia el día */}
      {showDateSeparator && (
        <DateSeparator date={message.createdAt} />
      )}
      
      <div
        className={`flex ${_isCurrentUser ? 'justify-end' : 'justify-start'} items-end gap-2`}
      >
        {!_isCurrentUser && showAvatar && (
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
        
        <div className={`flex flex-col ${!_isCurrentUser && showAvatar ? 'ml-0' : !_isCurrentUser ? 'ml-10' : ''}`}>
          <div
            className={cn(
              'max-w-xs md:max-w-md p-3 rounded-lg',
              _isCurrentUser
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
            )}
          >
            {/* Mostrar reproductor de audio si es un mensaje de voz */}
            {message.messageType === 'voice' && message.mediaUrl ? (
              <div className="flex flex-col space-y-1 w-full">
                <div className="flex items-center space-x-2">
                  <VoiceMessagePlayer mediaUrl={message.mediaUrl} isCurrentUser={_isCurrentUser} />
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap break-words">{message.content || ''}</div>
            )}
          </div>
          
          <div className={`flex items-center mt-1 text-xs text-gray-500 ${_isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <span>
              {message.createdAt &&
                format(
                  typeof message.createdAt === 'string'
                    ? new Date(message.createdAt)
                    : message.createdAt,
                  'HH:mm'
                )}
            </span>
            
            {_isCurrentUser && message.status && (
              <span className="ml-2">
                {message.status === 'sending' && <span>Enviando...</span>}
                {message.status === 'sent' && <span>Enviado</span>}
                {message.status === 'delivered' && <span>Entregado</span>}
                {message.status === 'read' && <span>Leído</span>}
                {message.status === 'failed' && <span className="text-red-500">Error</span>}
              </span>
            )}
          </div>
        </div>
        
        {_isCurrentUser && showAvatar && (
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
  const [_isPaused, setIsPaused] = useState(false);
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
    const audio = new Audio();
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
    
    const handleError = (e: Event) => {
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
  }, [mediaUrl, isPlaying]);
  
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
  }, [isPlaying, mediaUrl]);

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
  
  const _skipForward = () => {
    if (!audioRef.current || isLoading) return;
    
    const newTime = Math.min(audioRef.current.duration, currentTime + 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const _skipBackward = () => {
    if (!audioRef.current || isLoading) return;
    
    const newTime = Math.max(0, currentTime - 10);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  const _changePlaybackRate = () => {
    if (!audioRef.current || isLoading) return;
    
    // Ciclo entre velocidades: 1x -> 1.5x -> 2x -> 0.5x -> 1x
    const rates = [1, 1.5, 2, 0.5];
    const currentIndex = rates.indexOf(1); // Valor predeterminado
    const nextRate = rates[(currentIndex + 1) % rates.length];
    
    audioRef.current.playbackRate = nextRate;
  };
  
  const handleSliderChange = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
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
  const { toast } = useToast();
  const currentUserId = session?.user?.id;
  const [messages, setMessages] = useState<Message[]>([]);
  const [_processedMessageIds, _setProcessedMessageIds] = useState<Set<string>>(new Set());
  const [messageMap, setMessageMap] = useState<Map<string, Message>>(new Map());
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isVoiceRecorderVisible, setIsVoiceRecorderVisible] = useState(false);
  const [canSendMessages, setCanSendMessages] = useState<boolean | null>(null);
  const [isCheckingRelationship, setIsCheckingRelationship] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const _isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const [isTyping, setIsTyping] = useState(false);
  const [peerIsTyping, _setPeerIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [_uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  
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
  const loadedRef = useRef(false);
  const lastConversationIdRef = useRef<string | null>(null);
  
  // Estado para el socket
  const [socketInitialized, setSocketInitialized] = useState(false);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [_socketAuthenticated, setSocketAuthenticated] = useState(false);

  // Al principio del componente, asegurar que conversationId siempre sea string
  const safeConversationId = conversationId || (otherUser?.id || '');
  
  // Nuevo estado para almacenar el ID de conversación real después de obtenerlo
  const [actualConversationId, setActualConversationId] = useState<string | null>(conversationId || null);
  
  // Socket.io
  const { 
    socketInstance,
    connected,
    error: _socketError,
    sendMessage: _socketSendMessage,
    updateTypingStatus: socketUpdateTypingStatus,
    markMessageAsRead: socketMarkMessageAsRead,
    joinConversation,
    leaveConversation,
    reconnect  
  } = useSocket({
    userId: currentUserId,
    username: session?.user?.name || session?.user?.username || undefined,
    onConnect: () => {
      console.log('Socket conectado en ChatWindow');
      setSocketInitialized(true);
      
      // Si hay una conversación activa y estamos conectados, unirse a ella
      if (conversationId && currentUserId) {
        joinConversation(conversationId);
      }
    },
    onDisconnect: () => {
      console.log('Socket desconectado en ChatWindow');
      setSocketInitialized(false);
      
      // Intentar reconectar automáticamente
      setTimeout(() => {
        if (currentUserId) {
          reconnect();
        }
      }, 3000);
    },
    onError: (error) => {
      console.error('Error en socket:', error);
    },
    onNewMessage: (message) => {
      // Solo procesar el mensaje si pertenece a esta conversación
      if (message.conversationId === conversationId || 
          (message.senderId === otherUser?.id && message.receiverId === currentUserId) ||
          (message.senderId === currentUserId && message.receiverId === otherUser?.id)) {
        
        console.log('Nuevo mensaje recibido en Chat:', message);
        
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
            // Añadir un retraso y verificación adicional de conexión para evitar errores de "socket no conectado"
            setTimeout(() => {
              if (socketInitialized && connected) {
                socketMarkMessageAsRead({
                  messageId: message.id as string,
                  conversationId: (conversationId || safeConversationId) as string
                });
              } else {
                console.log('Socket no inicializado o conectado. No se pudo marcar como leído:', message.id);
              }
            }, 500); // Pequeño retraso para dar tiempo a que el socket se conecte
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
    onTypingStatus: (data) => {
      // Solo mostrar indicador de escritura si es del usuario con el que estamos chateando
      if (data.userId === otherUser?.id && 
          (data.conversationId === conversationId || 
           (!conversationId && safeConversationId.includes(data.userId)))) {
        
        console.log('Usuario está escribiendo:', data);
        
        if (data.isTyping) {
          setIsTyping(true);
          // Limpiar cualquier temporizador anterior
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          // Establecer un nuevo temporizador para ocultar el indicador después de 3 segundos
          typingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false);
          }, 3000);
        } else {
          setIsTyping(false);
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
        }
      }
    },
    onMessageRead: (data: ReadReceiptType) => {
      // Actualizar el estado de los mensajes marcados como leídos
      if ((data.conversationId === conversationId || 
           (!conversationId && data.userId === otherUser?.id)) && 
          data.userId !== currentUserId) {
        
        console.log('Mensajes marcados como leídos:', data);
        
        setMessages(prev => prev.map(msg => {
          // Si el mensaje es nuestro y está en la lista de leídos, actualizarlo
          if (msg.senderId === currentUserId && 
              data.messageIds.includes(msg.id || '')) {
            return {...msg, status: 'read'};
          }
          return msg;
        }));
      }
    }
  });

  // Mantener un registro de qué conversaciones ya se han unido
  const joinedConversationRef = useRef<string | null>(null);

  // Manejar la unión a salas de conversación en un efecto separado
  React.useEffect(() => {
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
  const processMessages = useCallback((newMessages: Message[] | MessageType[]) => {
    // Evitar procesar mensajes vacíos
    if (!newMessages || newMessages.length === 0) return [];
    
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
        // Asegurarnos de que msg.id existe y es string
        updatedMap.set(msg.id as string, msg);
      } else {
        // Si no tiene ID (raro para mensajes antiguos), usar timestamp y random
        const createdAtStr = typeof msg.createdAt === 'string' 
          ? msg.createdAt 
          : (msg.createdAt as Date).toISOString();
        const uniqueKey = `old-${msg.senderId}-${Date.parse(createdAtStr)}-${Math.random().toString(36).substring(2, 9)}`;
        updatedMap.set(uniqueKey, msg);
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
    
    // Retornar los mensajes ordenados y filtrados
    return finalMessages;
  }, [messageMap, currentUserId, otherUser?.id, actualConversationId, safeConversationId]);

  // Actualizar el estado de mensajes cuando cambia el mapa
  React.useEffect(() => {
    const uniqueMessages = Array.from(messageMap.values()).sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateA.getTime() - dateB.getTime();
    });
    
    setMessages(uniqueMessages);
  }, [messageMap]);

  // Verificar si los usuarios se siguen mutuamente
  React.useEffect(() => {
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
  React.useEffect(() => {
    // No hacer nada si no hay ID de conversación
    if (!safeConversationId) return;

    // Prevenir recargas innecesarias
    if (safeConversationId === lastConversationIdRef.current && loadedRef.current) {
      return;
    }
    
    // Guardar el ID de conversación actual para detectar cambios
    const currentConversationId = safeConversationId;
    
    // Limpiar mensajes si cambia la conversación
    if (lastConversationIdRef.current !== safeConversationId) {
      setPage(1);
      setHasMore(true);
      setMessages([]);
      setMessageMap(new Map());
      loadedRef.current = false;
      lastConversationIdRef.current = safeConversationId;
    }
    
    // Función para obtener mensajes
    const fetchMessages = async (pageNum = 1) => {
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
              if (typeof window !== 'undefined' && otherUser?.id) {
                localStorage.setItem(`chat_conv_${otherUser.id}`, msgConversationId);
              }
            }
          }
          
          // Procesar los mensajes obtenidos
          const combinedMessages = processMessages(fetchedMessages);
          
          setMessages(combinedMessages);
          setHasMore(fetchedMessages.length === pageSize);
          setPage(pageNum);

          // Marcar como cargado para prevenir recargas innecesarias
          loadedRef.current = true;
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
    
    if (!loadedRef.current || lastConversationIdRef.current !== safeConversationId) {
      fetchMessages();
    }
    
  // useEffect dependencies estables
  }, [safeConversationId, pageSize, actualConversationId, currentUserId, 
      otherUser?.id, leaveConversation, socketInstance, processMessages]);

  // Cargar más mensajes
  const _loadMoreMessages = async () => {
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
      oldMessages.forEach((msg: Message) => {
        // Asegurarnos de que msg.id existe y es string
        if (msg.id) {
          setMessageMap(prevMap => {
            const newMap = new Map(prevMap);
            newMap.set(msg.id as string, msg);
            return newMap;
          });
        } else {
          // Si no tiene ID (raro para mensajes antiguos), usar timestamp y random
          const createdAtStr = typeof msg.createdAt === 'string' 
            ? msg.createdAt 
            : (msg.createdAt as Date).toISOString();
          const uniqueKey = `old-${msg.senderId}-${Date.parse(createdAtStr)}-${Math.random().toString(36).substring(2, 9)}`;
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
  React.useEffect(() => {
    if (preserveScrollPosition && chatContainerRef.current) {
      const newScrollHeight = chatContainerRef.current.scrollHeight;
      const heightDifference = newScrollHeight - scrollHeightBeforeLoad.current;
      chatContainerRef.current.scrollTop = scrollTopBeforeLoad.current + heightDifference;
      setPreserveScrollPosition(false);
    }
  }, [preserveScrollPosition, messages]);

  // Manejar scroll automático
  React.useEffect(() => {
    const handleNewMessage = (message: MessageType) => {
      if (message.conversationId === safeConversationId) {
        // Procesar el nuevo mensaje con nuestra función de deduplicación
        processMessages([message]);
        
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
  }, [socketInstance, safeConversationId, autoScrollEnabled, processMessages]);

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

  React.useEffect(() => {
    const element = chatContainerRef.current;
    if (element) {
      const isNearBottom = 
        element.scrollHeight - element.scrollTop <= element.clientHeight + 100;
      setIsAtBottom(isNearBottom);
      setAutoScrollEnabled(isNearBottom);
    }
  }, [chatContainerRef]);

  // Enviar notificación de escritura
  const sendTypingNotification = React.useCallback((newMessage: string) => {
    if (newMessage.trim().length > 0 && !isTyping && socketInstance && socketInitialized && currentUserId && otherUser?.id) {
      setIsTyping(true);
      
      // Enviar estado de "escribiendo" al receptor
      socketUpdateTypingStatus({ 
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
            conversationId: safeConversationId, 
            isTyping: false 
          });
        }
      }, 3000);
    }
  }, [isTyping, socketInstance, socketInitialized, otherUser?.id, currentUserId, safeConversationId, socketUpdateTypingStatus]);

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
        messageType: 'text',
        conversationId: actualConversationId || undefined,
      };
      
      // Añadir mensaje al estado local
      processMessages([messageToSend]);
      setMessages(prev => [...prev, messageToSend]);
      
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
        content: message.content || '',
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
      processMessages([{
        ...message,
        id: data.id,
        status: 'sent',
        conversationId: data.conversationId
      }]);
      
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
      processMessages([{
        ...message,
        status: 'failed'
      }]);
      
      throw error; // Re-lanzar el error para que el catch de nivel superior lo maneje
    }
  };

  // Marcar mensaje como leído
  const _markMessageAsRead = (messageId?: string, conversationId?: string) => {
    if (!messageId || !conversationId || !socketInstance || !socketInitialized) {
      console.warn('No se puede marcar mensaje como leído. Faltan datos o socket no disponible', {
        messageId, conversationId, socketAvailable: !!socketInstance
      });
      return;
    }
    
    console.log(`Marcando mensaje ${messageId} como leído`);
    // Añadir un retraso y verificación adicional de conexión para evitar errores de "socket no conectado"
    setTimeout(() => {
      if (socketInitialized && connected) {
        socketMarkMessageAsRead({
          messageId: messageId as string,
          conversationId: (conversationId || safeConversationId) as string
        });
      } else {
        console.log('Socket no inicializado o conectado. No se pudo marcar como leído:', messageId);
      }
    }, 500); // Pequeño retraso para dar tiempo a que el socket se conecte
  };

  // Actualizar estado de un mensaje
  const _updateLocalMessage = React.useCallback((messageId: string, updates: Partial<Message>) => {
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
  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!isLoadingMessages && messages.length > 0) {
      scrollToBottom();
    }
  }, [isLoadingMessages, messages.length]);

  // Nueva función para enviar mensaje de voz
  const handleVoiceMessageSend = async (audioBlob: Blob) => {
    try {
      setIsSending(true);
      
      // Crear un FormData para subir el archivo
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      
      if (actualConversationId) {
        formData.append('conversationId', actualConversationId);
      }
      
      // Subir el archivo al servidor
      const response = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Error al subir el mensaje de voz');
      }
      
      const { url } = await response.json();
      
      // Generar un ID temporal único
      const tempId = Date.now().toString();
      
      // Crear el mensaje
      const messageToSend: Message = {
        content: '',
        senderId: currentUserId || '',
        receiverId: otherUser?.id,
        createdAt: new Date(),
        tempId,
        status: 'sending',
        mediaUrl: url,
        messageType: 'voice',
        conversationId: actualConversationId || undefined,
      };
      
      // Añadir mensaje al estado local
      processMessages([messageToSend]);
      setMessages(prev => [...prev, messageToSend]);
      
      // Enviar mensaje al servidor
      await sendMessageToServer(messageToSend, tempId);
      
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
  };

  // Función para manejar teclas presionadas en el textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enviar mensaje al presionar Enter (sin Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevenir nueva línea
      sendMessage();
    }
  };

  return (
    <div className={cn("flex flex-col h-full max-h-full", className)}>
      {/* Contenedor de mensajes - max-height para evitar desbordamiento */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0"
        onScroll={handleScroll}
      >
        {isLoadingMessages ? (
          <div className="flex justify-center items-center h-full">
            <LoadingSpinner className="w-8 h-8 text-blue-500" />
          </div>
        ) : errorLoadingMessages ? (
          <div className="text-center py-4 text-red-500">
            <p>{errorLoadingMessages}</p>
            {!errorLoadingMessages.includes('no existe') && (
              <Button 
                onClick={() => {
                  // Reintentar la carga con los parámetros iniciales
                  setPage(1);
                  setMessages([]);
                  setMessageMap(new Map());
                  setIsLoadingMessages(true);
                  setErrorLoadingMessages('');
                  // UseEffect detectará estos cambios y llamará a fetchMessages
                }} 
                variant="outline" 
                className="mt-2 text-sm" 
                size="sm"
              >
                Reintentar
              </Button>
            )}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 text-gray-400">
              <MessageSquare className="h-12 w-12" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-gray-700 dark:text-gray-300">Conversación vacía</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Aún no hay mensajes en esta conversación.<br />
              ¡Escribe algo para comenzar a chatear!
            </p>
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
                const _isCurrentUser = message.senderId === currentUserId;
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
                      _index={index}
                      session={{ user: { id: session?.user?.id, name: session?.user?.name, image: session?.user?.image } }}
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
          <>
            {isVoiceRecorderVisible ? (
              <VoiceMessageRecorder 
                onSend={handleVoiceMessageSend}
                onCancel={() => setIsVoiceRecorderVisible(false)}
                isVisible={isVoiceRecorderVisible}
                senderId={currentUserId || ''}
                receiverId={otherUser?.id || ''}
                session={session}
                onClose={() => setIsVoiceRecorderVisible(false)}
                setUploadStatus={setUploadStatus}
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
                  disabled={isSending || !canSendMessages}
                >
                  <Mic className="h-5 w-5" />
                </Button>
                
                <Textarea
                  ref={messageInputRef}
                  value={newMessage}
                  onChange={(e) => {
                    setNewMessage(e.target.value);
                    sendTypingNotification(e.target.value);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  className="min-h-10 max-h-32 resize-none flex-1"
                  rows={1}
                  disabled={isSending || !canSendMessages}
                />
                
                <Button 
                  onClick={sendMessage} 
                  disabled={!newMessage.trim() || isSending || !canSendMessages}
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
          </>
        )}
      </div>
  
      {/* Estado de error */}
      {errorLoadingMessages && (
        <div className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 rounded-lg mx-auto my-4 max-w-md">
          <p className="mb-2">{errorLoadingMessages}</p>
          {!errorLoadingMessages.includes('no existe') && (
            <Button 
              onClick={() => {
                // Reintentar la carga con los parámetros iniciales
                setPage(1);
                setMessages([]);
                setMessageMap(new Map());
                setIsLoadingMessages(true);
                setErrorLoadingMessages('');
                // UseEffect detectará estos cambios y llamará a fetchMessages
              }} 
              variant="outline" 
              className="mt-2 text-sm" 
              size="sm"
            >
              Reintentar
            </Button>
          )}
        </div>
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

export default ChatWindowContent;
