'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Pause } from 'lucide-react';
import { formatTime } from '@/src/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  className?: string;
  messageId: string;
  isSender: boolean;
}

const AudioPlayer = ({ audioUrl, className, messageId, isSender }: AudioPlayerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(30); // Valor predeterminado de 30 segundos
  const [isDragging, setIsDragging] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [_attemptCount, setAttemptCount] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  // Definir función para manejar metadata cargada usando useCallback
  const handleLoadedMetadata = useCallback(() => {
    if (!audioRef.current) return;
    
    console.log("Audio metadata cargada, duración:", audioRef.current.duration);
    if (isFinite(audioRef.current.duration) && audioRef.current.duration > 0) {
      setDuration(audioRef.current.duration);
      setAudioLoaded(true);
    } else {
      // Si la duración es infinita o inválida, usar valor predeterminado
      console.log("Duración inválida, usando valor predeterminado");
      setAudioLoaded(true);
    }
  }, []);

  // Definir función para actualizar tiempo usando useCallback
  const handleTimeUpdate = useCallback(() => {
    if (!audioRef.current) return;
    
    if (!isDragging && isFinite(audioRef.current.currentTime)) {
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [isDragging]);

  // Definir función para fin de reproducción usando useCallback
  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  }, []);

  // Definir función para manejar errores usando useCallback
  const handleError = useCallback(() => {
    console.error("Error al cargar el audio:", audioUrl);
    // Para dataURLs, no mostrar error ya que es probable que solo
    // sea una visualización temporal antes de la URL final
    const isDataUrl = audioUrl.startsWith('data:');
    const isBlobUrl = audioUrl.startsWith('blob:');
    
    if (!isDataUrl && !isBlobUrl) {
      setAudioError(true);
    } else {
      // Para dataURLs/blobURLs, mantener como "cargado" para la visualización
      setAudioLoaded(true);
    }
  }, [audioUrl]);

  // Forzar estado de carga para evitar problemas de UI
  useEffect(() => {
    // Siempre iniciar como cargado después de un breve delay
    // Esto evita que se quede en estado de carga indefinidamente
    const forceLoadTimer = setTimeout(() => {
      if (!audioLoaded) {
        console.log("Forzando estado de carga para AudioPlayer:", messageId);
        setAudioLoaded(true);
      }
    }, 1000);
    
    return () => clearTimeout(forceLoadTimer);
  }, [messageId, audioLoaded]);

  // Manejar cambios en la URL de audio
  useEffect(() => {
    if (!audioUrl || audioUrl === audioRef.current?.src) return;
    
    console.log("URL de audio cambiada, recargando componente:", audioUrl);
    
    // Limpiar audio anterior si existe
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
    
    // Reiniciar estados
    setAudioError(false);
    setAudioLoaded(false);
    setAttemptCount(0);
    
    // Crear nuevo audio con la URL actualizada
    try {
      let finalUrl = audioUrl;
      const isCloudinaryUrl = audioUrl.includes('cloudinary.com');
      
      // Para URLs de Cloudinary, asegurarse de que tenga formato MP3
      if (isCloudinaryUrl && !audioUrl.includes('.mp3') && !audioUrl.includes('/upload/f_mp3/')) {
        finalUrl = audioUrl.replace('/upload/', '/upload/f_mp3/');
        console.log("URL modificada para compatibilidad:", finalUrl);
      }
      
      // Asegurarse de que sea una URL absoluta
      if (!finalUrl.startsWith('http') && !finalUrl.startsWith('data:') && !finalUrl.startsWith('blob:')) {
        console.error("URL no absoluta detectada, esto podría causar errores:", finalUrl);
        // Si empieza con /, es relativa a la raíz
        if (finalUrl.startsWith('/')) {
          finalUrl = `${window.location.origin}${finalUrl}`;
        } else {
          finalUrl = `${window.location.origin}/${finalUrl}`;
        }
        console.log("URL corregida a:", finalUrl);
      }
      
      const audio = new Audio(finalUrl);
      audioRef.current = audio;
      
      // Configurar eventos
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
    } catch (error) {
      console.error("Error al crear elemento de audio:", error);
      setAudioError(true);
      setAudioLoaded(true); // Forzar carga para mostrar mensaje de error
    }
  }, [audioUrl, handleEnded, handleError, handleLoadedMetadata, handleTimeUpdate]);

  // Pausar audio cuando cambia la URL (si se está reproduciendo otro mensaje)
  useEffect(() => {
    const cleanupAudio = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    return cleanupAudio;
  }, [audioUrl, isPlaying, handleError, handleTimeUpdate]);

  // Efecto principal para cargar el audio - solo se ejecuta una vez por URL
  useEffect(() => {
    if (!audioUrl || audioUrl.trim() === '') {
      console.error("URL de audio vacía o inválida", audioUrl);
      setAudioError(true);
      setAudioLoaded(true);
      return;
    }
    
    console.log("Inicializando audio con URL:", audioUrl);
    
    // Reset estados al cambiar URL
    setAttemptCount(1); 
    setAudioError(false);
    setAudioLoaded(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    
    // Crear directamente un elemento audio HTML
    try {
      // Comprobamos si es un dataURL o una URL de Cloudinary
      const isDataUrl = audioUrl.startsWith('data:');
      const isBlobUrl = audioUrl.startsWith('blob:');
      const isCloudinaryUrl = audioUrl.includes('cloudinary.com');
      
      // URL modificada para asegurar compatibilidad
      let finalUrl = audioUrl;
      
      // Asegurarse de que sea una URL absoluta
      if (!finalUrl.startsWith('http') && !finalUrl.startsWith('data:') && !finalUrl.startsWith('blob:')) {
        console.error("URL no absoluta detectada:", finalUrl);
        // Si empieza con /, es relativa a la raíz
        if (finalUrl.startsWith('/')) {
          finalUrl = `${window.location.origin}${finalUrl}`;
        } else {
          finalUrl = `${window.location.origin}/${finalUrl}`;
        }
        console.log("URL corregida a:", finalUrl);
      }
      
      // Para URLs de Cloudinary, intentar forzar formato MP3 si no lo tiene ya
      if (isCloudinaryUrl && !audioUrl.includes('.mp3') && !audioUrl.includes('/upload/f_mp3/')) {
        finalUrl = audioUrl.replace('/upload/', '/upload/f_mp3/');
        console.log("URL modificada para compatibilidad:", finalUrl);
      }
      
      // Crear y configurar el audio
      const audio = new Audio(finalUrl);
      audioRef.current = audio;
      
      // Configurar eventos
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);
      
      // Cargar el audio
      audio.load();
      
      // Limpieza al desmontar
      return () => {
        audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audio.removeEventListener('timeupdate', handleTimeUpdate);
        audio.removeEventListener('ended', handleEnded);
        audio.removeEventListener('error', handleError);
        audio.pause();
        
        // Liberar memoria y recursos
        if (isDataUrl || isBlobUrl) {
          URL.revokeObjectURL(audioUrl);
        }
      };
    } catch (error) {
      console.error("Error al inicializar el audio:", error);
      setAudioError(true);
      setAudioLoaded(true);
    }
  }, [audioUrl, handleEnded, handleError, handleLoadedMetadata, handleTimeUpdate]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;
    
    // URL actual que está intentando reproducir
    const currentSrc = audioRef.current.src;
    console.log("URL actual:", currentSrc);
    console.log("URL original:", audioUrl);
    
    // Si la URL es incorrecta o tenemos problemas, recrear el elemento audio completamente
    if (currentSrc.includes('/messages') || audioError) {
      console.log("Recreando elemento de audio con URL directa");
      
      // Crear un nuevo elemento
      const newAudio = new Audio();
      
      // Establecer atributos importantes
      newAudio.crossOrigin = "anonymous";
      newAudio.preload = "auto";
      
      // Usar la URL original sin modificaciones
      newAudio.src = audioUrl;
      
      // Establecer eventos
      newAudio.addEventListener('loadedmetadata', handleLoadedMetadata);
      newAudio.addEventListener('timeupdate', handleTimeUpdate);
      newAudio.addEventListener('ended', handleEnded);
      newAudio.addEventListener('error', handleError);
      
      // Forzar la carga
      newAudio.load();
      
      // Reemplazar la referencia
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = newAudio;
      
      // Reiniciar estado de error
      setAudioError(false);
      
      console.log("Elemento de audio recreado con URL:", newAudio.src);
    }

    if (isPlaying) {
      console.log("Pausando audio");
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      console.log("Reproduciendo audio");
      // Pausar todos los demás audios
      document.querySelectorAll('audio').forEach(audio => {
        if (audio !== audioRef.current) {
          audio.pause();
        }
      });
      
      // Reproducir directamente, sin delays ni complicaciones
      audioRef.current.play()
        .then(() => {
          console.log("Reproducción iniciada correctamente");
          setIsPlaying(true);
        })
        .catch(error => {
          console.error('Error reproduciendo audio:', error);
          
          // En caso de error, intentar una vez más con un objeto Audio nativo
          console.log("Último intento con objeto Audio nativo");
          const fallbackAudio = new Audio(audioUrl);
          fallbackAudio.play()
            .then(() => {
              console.log("Reproducción iniciada con fallback");
              setIsPlaying(true);
              audioRef.current = fallbackAudio;
            })
            .catch(finalError => {
              console.error("Error final, no se puede reproducir:", finalError);
              setAudioError(true);
            });
        });
    }
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current || !progressBarRef.current) return;
    
    try {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickPosition = (e.clientX - rect.left) / rect.width;
      // Asegurar que el valor está en el rango correcto
      const newTime = Math.max(0, Math.min(duration || 0, clickPosition * (duration || 0)));
      
      console.log("Ajustando tiempo a:", newTime);
      if (isFinite(newTime)) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    } catch (error) {
      console.error('Error al actualizar tiempo de audio:', error);
    }
  };

  const handleStartDrag = () => {
    setIsDragging(true);
  };

  const handleDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !progressBarRef.current) return;
    
    try {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickPosition = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = Math.max(0, Math.min(duration || 0, clickPosition * (duration || 0)));
      
      if (isFinite(newTime)) {
        setCurrentTime(newTime);
      }
    } catch (error) {
      console.error('Error durante drag:', error);
    }
  };

  const handleEndDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !audioRef.current || !progressBarRef.current) return;
    
    try {
      const rect = progressBarRef.current.getBoundingClientRect();
      const clickPosition = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const newTime = Math.max(0, Math.min(duration || 0, clickPosition * (duration || 0)));
      
      console.log("Finalizando drag, tiempo:", newTime);
      if (isFinite(newTime)) {
        audioRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    } catch (error) {
      console.error('Error al finalizar drag:', error);
    } finally {
      setIsDragging(false);
    }
  };

  const getProgressBarWidth = () => {
    if (duration <= 0) return '0%';
    const percent = Math.min(100, (currentTime / duration) * 100);
    return `${percent}%`;
  };

  // Colores adaptados al tema
  const primaryColor = isSender ? 'text-white' : 'text-blue-500 dark:text-blue-400';
  const bgColor = isSender ? 'bg-white/30' : 'bg-blue-200 dark:bg-blue-800/30';
  const progressColor = isSender ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400';
  const secondaryColor = isSender ? 'text-white/70' : 'text-gray-500 dark:text-gray-400';
  const sliderThumbColor = isSender ? 'bg-white' : 'bg-blue-500 dark:bg-blue-400';

  // Si hay error en la carga del audio
  if (audioError) {
    return (
      <div className={`flex items-center gap-2 p-1 rounded-lg ${className}`}>
        <div className="text-red-500 text-sm">Error al cargar el audio</div>
      </div>
    );
  }

  // Si el audio está cargando
  if (!audioLoaded && !audioError) {
    return (
      <div className={`flex items-center gap-2 p-1 rounded-lg ${className}`}>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse" />
          <div className="h-2 w-32 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 p-1 rounded-lg ${className} ${isSender ? 'text-white' : 'text-gray-900 dark:text-white'}`}
      data-audio-id={messageId}
    >
      <button
        onClick={togglePlayPause}
        className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-opacity-20 ${bgColor} hover:bg-opacity-30 transition`}
      >
        {isPlaying ? (
          <Pause className={`h-4 w-4 ${primaryColor}`} />
        ) : (
          <Play className={`h-4 w-4 ${primaryColor}`} />
        )}
      </button>
      
      <div className="flex-1 flex flex-col gap-1 min-w-[150px]">
        {/* Barra de progreso simplificada y elegante */}
        <div 
          className="relative h-5 cursor-pointer group"
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          onMouseDown={handleStartDrag}
          onMouseMove={handleDrag}
          onMouseUp={handleEndDrag}
          onMouseLeave={() => isDragging && setIsDragging(false)}
        >
          {/* Visualización de onda de audio elegante */}
          <div className="absolute inset-0 flex items-center justify-between px-1">
            {Array.from({ length: 27 }).map((_, i) => {
              // Patrón de onda más estético
              const baseHeight = 30; // altura mínima
              
              // Crear un patrón de onda que se eleva en el centro
              let heightFactor;
              if (i < 9) {
                heightFactor = 0.3 + (i * 0.08); // aumenta gradualmente
              } else if (i < 18) {
                heightFactor = 0.8 + ((i - 9) * 0.04); // altura máxima en el centro
              } else {
                heightFactor = 1 - ((i - 18) * 0.07); // disminuye gradualmente
              }
              
              const height = baseHeight + (heightFactor * 40);
              
              // Si el mensaje está reproduciendo, añadir animación
              const isActive = currentTime / Math.max(duration, 0.01) > i / 27;
              const isHighlighted = isActive;
              
              return (
                <div
                  key={i}
                  className={`h-full w-[2px] rounded-full transition-all duration-200 ${
                    isHighlighted
                      ? progressColor
                      : `${bgColor} opacity-40`
                  }`}
                  style={{
                    height: `${height}%`,
                    transform: isPlaying && isActive ? `scaleY(${1 + Math.sin(Date.now() / 500) * 0.2})` : 'scaleY(1)',
                  }}
                />
              );
            })}
          </div>
          
          {/* Barra de progreso debajo de la visualización */}
          <div className={`absolute bottom-0 left-0 h-[2px] ${bgColor} rounded-full w-full`}>
            <div
              className={`absolute bottom-0 left-0 h-full rounded-full ${progressColor}`}
              style={{ width: getProgressBarWidth() }}
            ></div>
            
            {/* Círculo indicador de posición */}
            <div
              className={`absolute bottom-0 h-3 w-3 rounded-full -translate-x-1/2 -translate-y-1/3 ${sliderThumbColor} opacity-0 group-hover:opacity-100 ${isDragging ? 'opacity-100' : ''}`}
              style={{ 
                left: getProgressBarWidth(),
                transition: isDragging ? 'none' : 'all 0.1s ease-out'
              }}
            ></div>
          </div>
        </div>
        
        {/* Tiempo */}
        <div className="flex justify-between text-xs opacity-90">
          <span className={secondaryColor}>
            {formatTime(currentTime)}
          </span>
          <span className={secondaryColor}>
            {formatTime(duration)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
