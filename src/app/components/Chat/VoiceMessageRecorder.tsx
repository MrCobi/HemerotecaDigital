'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import useAudioRecorder from '../../../hooks/useAudioRecorder';
import { Send, Mic, Trash2, X, AlertCircle } from 'lucide-react';
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
  const { 
    audioURL, 
    isRecording, 
    recordingTime, 
    startRecording, 
    stopRecording, 
    clearRecording,
    setAudioURL
  } = useAudioRecorder();
  
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSliding, setIsSliding] = useState(false);
  const wasRecording = useRef<boolean>(false);
  const cancelTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const manuallyStoppedRef = useRef(false);

  // Función para detener y guardar la grabación
  const handleStopRecording = useCallback(async () => {
    try {
      // Marcar que se detuvo manualmente para evitar la detección automática
      manuallyStoppedRef.current = true;
      
      setIsProcessing(true);
      setError(null);
      
      console.log("Iniciando detención manual de la grabación");
      
      // Detener la grabación y obtener el blob de audio
      const audioBlob = await stopRecording();
      
      if (audioBlob) {
        console.log('Audio grabado con éxito, tamaño:', audioBlob.size, 'bytes');
        // Verificar si el audioURL ha sido establecido por useAudioRecorder
        // Esperar brevemente para permitir que la actualización de estado ocurra
        const checkAudioUrl = async () => {
          if (!audioURL) {
            // Intentar crear manualmente la URL del audio blob
            try {
              const url = URL.createObjectURL(audioBlob);
              console.log('Creando URL manualmente:', url);
              setAudioURL(url);
            } catch (err) {
              console.error('Error al crear URL manualmente:', err);
              setError("Error al procesar el audio");
              setIsProcessing(false);
              return;
            }
          } else {
            console.log('URL de audio establecida correctamente:', audioURL);
          }
        };
        
        // Esperar un momento para que el estado se actualice
        setTimeout(checkAudioUrl, 100);
      } else {
        console.error('No se pudo obtener blob de audio');
        setError('Error al procesar el audio. Intenta grabar de nuevo.');
        setIsProcessing(false);
        return;
      }
      
      setIsProcessing(false);
    } catch (err: any) {
      console.error('Error al detener grabación:', err);
      setError(err.message || 'Error al procesar el audio');
      setIsProcessing(false);
    }
  }, [stopRecording, audioURL, setAudioURL]);

  // Manejar el inicio de grabación de manera optimizada
  const handleStartRecording = useCallback(async () => {
    if (isRecording || isSending || isProcessing) return;
    
    try {
      setError(null);
      // Limpiar cualquier grabación anterior
      clearRecording();
      // Iniciar nueva grabación
      await startRecording();
    } catch (err: any) {
      const errorMessage = err.name === 'NotAllowedError' 
        ? 'Permiso para usar el micrófono denegado' 
        : err.message || 'Error al iniciar grabación';
      
      console.error('Error al iniciar grabación:', err);
      setError(errorMessage);
    }
  }, [isRecording, isSending, isProcessing, clearRecording, startRecording]);

  // Manejar la pausa/reanudación de grabación de manera optimizada
  const handlePauseResume = () => {
    // Esta función ya no es necesaria
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
  const handleSendRecord = useCallback(async () => {
    if (!audioURL || !senderId || !session?.user?.id) {
      console.error('No hay audio para enviar o sesión de usuario');
      setError('No hay audio para enviar');
      return;
    }

    try {
      setIsSending(true);
      
      console.log('Iniciando envío de mensaje de voz con URL:', audioURL);
      
      // Fetch el blob desde la URL
      const response = await fetch(audioURL);
      if (!response.ok) {
        throw new Error('Error al acceder al audio grabado');
      }
      
      const audioBlob = await response.blob();
      console.log('Blob recuperado de la URL, tamaño:', audioBlob.size);
      
      if (audioBlob.size === 0) {
        throw new Error('El blob de audio está vacío');
      }

      // Notificar estado de carga
      setUploadStatus('uploading');
      
      // Enviar el audio
      await onSend(audioBlob);
      
      console.log('Mensaje de voz enviado con éxito');
      
      // Notificar estado de éxito
      setUploadStatus('success');
      
      // Limpiar grabación
      clearRecording();
      
      // Cerrar el grabador
      onClose();
    } catch (error) {
      console.error('Error al enviar mensaje de voz:', error);
      setError('Error al enviar el audio');
      setUploadStatus('error');
    } finally {
      setIsSending(false);
    }
  }, [onSend, audioURL, senderId, session, setUploadStatus, clearRecording, onClose]);

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
        : audioURL 
          ? 'bg-blue-500 text-white' 
          : 'bg-blue-500 text-white'
    }`;
  }, [isRecording, audioURL]);

  const slidingText = useMemo(() => {
    return isSliding ? (
      <div className="absolute bottom-16 left-0 right-0 text-center text-sm text-red-500 animate-pulse">
        Desliza hacia arriba para cancelar
      </div>
    ) : null;
  }, [isSliding]);

  const recordingControls = useMemo(() => {
    if (isRecording) {
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
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span>{formattedRecordingTime}</span>
          </div>
          
          {/* Botón para detener la grabación */}
          <button
            type="button"
            onClick={handleStopRecording}
            className="p-2 bg-blue-500 text-white hover:bg-blue-600 rounded-full transition-colors"
            aria-label="Detener grabación"
          >
            <Send size={20} />
          </button>
        </div>
      );
    }
    return null;
  }, [isRecording, formattedRecordingTime, handleCancel, handleStopRecording]);

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
        disabled={!!error || isRecording}
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

  useEffect(() => {
    // Solo para depuración - registrar cambios en audioURL
    console.log("Estado de audioURL actualizado:", audioURL);
  }, [audioURL]);

  useEffect(() => {
    // Solo para depuración - registrar cambios en isRecording
    console.log("Estado de isRecording actualizado:", isRecording);
  }, [isRecording]);

  // Resetear el flag de detención manual cuando comienza una nueva grabación
  useEffect(() => {
    if (isRecording) {
      manuallyStoppedRef.current = false;
    }
  }, [isRecording]);

  // Asegurarnos de detectar cuando se detiene la grabación
  useEffect(() => {
    // Si estábamos grabando y ahora no estamos grabando, 
    // significa que la grabación ha terminado
    if (wasRecording.current && !isRecording && !manuallyStoppedRef.current) {
      console.log("Detección automática de fin de grabación");
      // La grabación se detuvo, probablemente por alcanzar el límite de tiempo
      handleStopRecording();
    }
    
    // Actualizar el estado anterior para la próxima comparación
    wasRecording.current = isRecording;
  }, [isRecording, handleStopRecording]);

  // Manejar la limpieza cuando el componente se desmonta
  useEffect(() => {
    return () => {
      // Limpiar el timeout de cancelación si existe
      if (cancelTimeoutRef.current) {
        clearTimeout(cancelTimeoutRef.current);
      }
      
      // Limpiar cualquier URL de objeto creada
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
      
      // Limpiar grabación si hay una activa
      if (isRecording) {
        clearRecording();
      }
    };
  }, [clearRecording, audioURL, isRecording]);

  // Si el componente no es visible, no renderizar nada
  if (!isVisible) return null;

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
