'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  const [duration, setDuration] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Crear elemento de audio
    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    // Definir función para manejar metadata cargada
    const handleLoadedMetadata = () => {
      console.log("Audio metadata cargada, duración:", audio.duration);
      if (isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    // Definir función para actualizar tiempo
    const handleTimeUpdate = () => {
      if (!isDragging && isFinite(audio.currentTime)) {
        setCurrentTime(audio.currentTime);
      }
    };

    // Definir función para fin de reproducción
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
      }
    };

    // Añadir event listeners
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    // Limpiar al desmontar
    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.src = '';
    };
  }, [audioUrl, isDragging]);

  // Pausar audio cuando cambia la URL (si se está reproduciendo otro mensaje)
  useEffect(() => {
    const cleanupAudio = () => {
      if (audioRef.current && isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };
    return cleanupAudio;
  }, [audioUrl, isPlaying]);

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    console.log("Intentando reproducir audio:", audioUrl);

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
      
      // Reproducir este audio
      audioRef.current.play().catch(error => {
        console.error('Error reproduciendo audio:', error);
      });
      setIsPlaying(true);
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
