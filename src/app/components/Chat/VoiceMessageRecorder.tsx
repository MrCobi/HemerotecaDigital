'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import useAudioRecorder from '../../../hooks/useAudioRecorder';
import { Send, Mic, Pause, Play, Trash2, X, AlertCircle } from 'lucide-react';
import { Session } from 'next-auth';

// Definir ruta API para mensajes
const API_ROUTES = {
  MESSAGES: '/api/messages'
};

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  onCancel: () => void;
  isVisible: boolean;
  senderId: string;
  receiverId: string;
  session: Session | null;
  onClose: () => void;
  setUploadStatus: (status: 'idle' | 'uploading' | 'success' | 'error') => void;
}

const VoiceMessageRecorder = React.memo(({ 
  onSend,
  onCancel,
  isVisible,
  senderId,
  receiverId, 
  session,
  onClose, 
  setUploadStatus
}: VoiceMessageRecorderProps) => {
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSliding, setIsSliding] = useState(false);
  const cancelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { 
    audioURL, 
    isRecording, 
    isPaused, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    pauseRecording, 
    resumeRecording, 
    clearRecording,
    setAudioURL
  } = useAudioRecorder();

  // Limpiar recursos al desmontar
  useEffect(() => {
    return () => {
      // Limpiar cualquier timeout pendiente
      if (cancelTimeoutRef.current) {
        clearTimeout(cancelTimeoutRef.current);
      }
    };
  }, []);

  // Si el componente no es visible, no renderizar nada
  if (!isVisible) return null;

  // Manejar el inicio de grabación de manera optimizada
  const handleStartRecording = async () => {
    try {
      setError(null);
      await startRecording();
    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Permiso para usar el micrófono denegado. Por favor, concede acceso al micrófono.'
        : 'Error al iniciar la grabación. Por favor, inténtalo de nuevo.';
      
      setError(errorMessage);
      console.error('Error al iniciar la grabación:', err);
    }
  };

  // Manejar la pausa/reanudación de grabación de manera optimizada
  const handlePauseResume = () => {
    if (isRecording) {
      pauseRecording();
    } else if (isPaused) {
      resumeRecording();
    }
  };

  // Manejar el deslizamiento para cancelar
  const handleTouchStart = () => {
    if (!isRecording) return;
    
    // Iniciar timer para mostrar la instrucción después de un tiempo
    cancelTimeoutRef.current = setTimeout(() => {
      setIsSliding(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (cancelTimeoutRef.current) {
      clearTimeout(cancelTimeoutRef.current);
      cancelTimeoutRef.current = null;
    }
    setIsSliding(false);
  };

  // Manejar cancelación de grabación
  const handleCancel = () => {
    clearRecording();
    setError(null);
    onCancel();
  };

  // Función para enviar el mensaje de voz
  const handleSendRecord = async () => {
    if (!audioURL || !session?.user?.id) {
      console.error('No hay audio para enviar o sesión de usuario');
      return;
    }

    try {
      setIsSending(true);
      setError(null);
      setUploadStatus('uploading');

      // Convertir audioURL a Blob
      const response = await fetch(audioURL);
      const audioBlob = await response.blob();

      // Enviar el mensaje de voz utilizando la función de callback proporcionada
      await onSend(audioBlob);
      setUploadStatus('success');
      
      // Limpiar grabación después de enviar exitosamente
      clearRecording();
      
      // Cerrar el componente
      onClose();
      
    } catch (err: any) {
      console.error('Error al enviar mensaje de voz:', err);
      setError(err.message || 'Error al enviar el mensaje de voz');
      setUploadStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  // Formatear el tiempo de grabación como MM:SS
  const formattedRecordingTime = useMemo(() => {
    const minutes = Math.floor(recordingTime / 60);
    const seconds = recordingTime % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [recordingTime]);

  // Optimizar renders con clases y estados memoizados
  const micButtonClasses = useMemo(() => {
    return `rounded-full p-3 ${
      isRecording 
        ? 'bg-red-500 text-white animate-pulse' 
        : isPaused 
          ? 'bg-amber-500 text-white' 
          : audioURL 
            ? 'bg-blue-500 text-white' 
            : 'bg-blue-500 text-white'
    }`;
  }, [isRecording, isPaused, audioURL]);

  const slidingText = useMemo(() => {
    return isSliding ? (
      <div className="absolute bottom-16 left-0 right-0 text-center text-sm text-red-500 animate-pulse">
        Desliza hacia arriba para cancelar
      </div>
    ) : null;
  }, [isSliding]);

  const recordingControls = useMemo(() => {
    if (isRecording || isPaused) {
      return (
        <div className="flex items-center space-x-4">
          <button
            type="button"
            onClick={handleCancel}
            className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-full transition-colors"
            aria-label="Cancelar grabación"
          >
            <Trash2 size={20} />
          </button>
          
          <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-300">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
            <span>{formattedRecordingTime}</span>
          </div>
          
          <button
            type="button"
            onClick={handlePauseResume}
            className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-full transition-colors"
            aria-label={isRecording ? 'Pausar grabación' : 'Reanudar grabación'}
          >
            {isRecording ? <Pause size={20} /> : <Play size={20} />}
          </button>
        </div>
      );
    }
    return null;
  }, [isRecording, isPaused, formattedRecordingTime, handleCancel, handlePauseResume]);

  const mainActionButton = useMemo(() => {
    if (audioURL) {
      return (
        <button
          type="button"
          disabled={isSending}
          onClick={handleSendRecord}
          className={`p-3 rounded-full bg-blue-500 text-white transition-colors ${
            isSending ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-600'
          }`}
          aria-label="Enviar mensaje de voz"
        >
          {isSending ? (
            <div className="w-6 h-6 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
          ) : (
            <Send size={20} />
          )}
        </button>
      );
    }
    
    return (
      <button
        type="button"
        onClick={handleStartRecording}
        disabled={!!error || isRecording || isPaused}
        className={micButtonClasses}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        aria-label="Grabar mensaje de voz"
      >
        <Mic size={20} />
      </button>
    );
  }, [
    audioURL, 
    isSending, 
    handleSendRecord, 
    handleStartRecording, 
    error, 
    isRecording, 
    isPaused, 
    micButtonClasses, 
    handleTouchStart, 
    handleTouchEnd
  ]);

  const errorDisplay = useMemo(() => {
    if (!error) return null;
    
    return (
      <div className="flex items-center space-x-2 text-red-500 text-sm p-2 bg-red-50 dark:bg-red-900/20 rounded-md mt-2">
        <AlertCircle size={16} />
        <span>{error}</span>
      </div>
    );
  }, [error]);

  return (
    <div className="p-2 border-t border-gray-200 dark:border-gray-700 relative">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
          aria-label="Cerrar grabadora"
        >
          <X size={20} />
        </button>
        
        {recordingControls}
        
        {mainActionButton}
      </div>
      
      {errorDisplay}
      {slidingText}
    </div>
  );
});

VoiceMessageRecorder.displayName = 'VoiceMessageRecorder';

export default VoiceMessageRecorder;
