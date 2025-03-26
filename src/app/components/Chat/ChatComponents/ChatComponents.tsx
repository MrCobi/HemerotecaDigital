"use client";
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday } from 'date-fns';
import { es } from 'date-fns/locale';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import Image from 'next/image';
import { CldImage } from 'next-cloudinary';
import * as React from 'react';

// Tipos para los mensajes y usuarios
export type User = {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

export type Message = {
  id?: string;
  tempId?: string;
  content: string;
  senderId: string;
  receiverId?: string;
  createdAt: Date | string;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  conversationId?: string;
  read?: boolean;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
};

// Componente para mostrar separadores de fecha entre mensajes
export const DateSeparator = ({ date }: { date: Date | string }) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  let displayDate;
  
  if (isToday(dateObj)) {
    displayDate = 'Hoy';
  } else if (isYesterday(dateObj)) {
    displayDate = 'Ayer';
  } else {
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

// Componente Message separado para manejar cada mensaje individualmente
export const MessageItem = memo(({ 
  message, 
  currentUserId,
  otherUser,
  showAvatar,
  showDateSeparator,
  index,
  session,
  isGroupChat = false
}: { 
  message: Message, 
  currentUserId: string,
  otherUser: User | null,
  showAvatar: boolean,
  showDateSeparator: boolean,
  index: number,
  session: any,
  isGroupChat?: boolean
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
            {otherUser?.image && otherUser.image.includes('cloudinary') ? (
              <CldImage
                src={otherUser.image}
                alt={otherUser.username || 'Usuario'}
                width={32}
                height={32}
                crop="fill"
                gravity="face"
                className="object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            ) : otherUser?.image && !otherUser.image.startsWith('/') && !otherUser.image.startsWith('http') ? (
              <CldImage
                src={otherUser.image}
                alt={otherUser.username || 'Usuario'}
                width={32}
                height={32}
                crop="fill"
                gravity="face"
                className="object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            ) : (
              <Image 
                src={otherUser?.image || "/images/AvatarPredeterminado.webp"}
                alt={otherUser?.username || 'Usuario'}
                width={32}
                height={32}
                className="rounded-full object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            )}
          </Avatar>
        )}
        
        <div className={`flex flex-col ${!isCurrentUser && showAvatar ? 'ml-0' : !isCurrentUser ? 'ml-10' : ''}`}>
          {/* Mostrar nombre de usuario en mensajes de grupo cuando no es el usuario actual */}
          {!isCurrentUser && isGroupChat && showAvatar && (
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1 ml-1">
              {otherUser?.username || 'Usuario'}
            </span>
          )}
          
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
                {message.status === 'failed' && <span className="text-red-500">Error</span>}
              </span>
            )}
          </div>
        </div>
        
        {isCurrentUser && showAvatar && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            {session?.user?.image && session.user.image.includes('cloudinary') ? (
              <CldImage
                src={session.user.image}
                alt={session.user.name || 'Usuario'}
                width={32}
                height={32}
                crop="fill"
                gravity="face"
                className="object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            ) : session?.user?.image && !session.user.image.startsWith('/') && !session.user.image.startsWith('http') ? (
              <CldImage
                src={session.user.image}
                alt={session.user.name || 'Usuario'}
                width={32}
                height={32}
                crop="fill"
                gravity="face"
                className="object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            ) : (
              <Image
                src={session?.user?.image || "/images/AvatarPredeterminado.webp"}
                alt={session?.user?.name || 'Usuario'}
                width={32}
                height={32}
                className="rounded-full object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            )}
          </Avatar>
        )}
      </div>
    </>
  );
});

MessageItem.displayName = 'MessageItem';

// Componente reproductor de mensajes de voz
export const VoiceMessagePlayer = React.memo(({ 
  mediaUrl, 
  isCurrentUser 
}: { 
  mediaUrl: string; 
  isCurrentUser: boolean 
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  // Colores según si es mensaje propio o recibido
  const textColor = isCurrentUser ? 'text-white' : 'text-gray-700 dark:text-gray-200';
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
    
    const handleCanPlay = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
      setIsLoading(false);
    };
    
    const handleLoadedMetadata = () => {
      if (audio.duration && isFinite(audio.duration) && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      } else {
        console.warn("Duración inválida:", audio.duration);
        setDuration(0);
      }
      setIsLoading(false);
    };
    
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
