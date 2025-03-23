import React, { useState, useEffect, useRef } from 'react';
import useAudioRecorder from '@/src/hooks/useAudioRecorder';
import { Mic, Square, Trash, Send, Pause, Play, X } from 'lucide-react';

interface VoiceMessageRecorderProps {
  onSend: (audioBlob: Blob) => Promise<void>;
  onCancel: () => void;
  isVisible: boolean;
  senderId: string;
  receiverId: string;
  session: any;
  onClose: () => void;
  setUploadStatus: (status: string) => void;
}

// Clave para almacenar el audioUrl en localStorage
const AUDIO_URL_STORAGE_KEY = 'voice_recorder_audio_url';
const RECORDING_STATE_STORAGE_KEY = 'voice_recorder_state';

const VoiceMessageRecorder: React.FC<VoiceMessageRecorderProps> = ({
  onSend,
  onCancel,
  isVisible,
  senderId,
  receiverId,
  session,
  onClose,
  setUploadStatus
}) => {
  const {
    audioURL,
    isRecording,
    isPaused,
    recordingTime,
    startRecording: startRecordingHook,
    stopRecording: stopRecordingHook,
    pauseRecording: pauseRecordingHook,
    resumeRecording: resumeRecordingHook,
    clearRecording: clearRecordingHook,
    setAudioURL: setAudioURLHook
  } = useAudioRecorder();

  // Recuperar el estado y audioURL del localStorage
  const getSavedState = () => {
    try {
      const savedState = localStorage.getItem(RECORDING_STATE_STORAGE_KEY);
      return savedState || 'idle';
    } catch (err) {
      console.error('Error al leer el estado de localStorage:', err);
      return 'idle';
    }
  };

  const getSavedAudioURL = () => {
    try {
      return localStorage.getItem(AUDIO_URL_STORAGE_KEY) || null;
    } catch (err) {
      console.error('Error al leer audioURL de localStorage:', err);
      return null;
    }
  };

  // Usar el estado recuperado del localStorage
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'recorded'>(getSavedState() as any);
  const [isSending, setIsSending] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  
  // Si hay un audioURL guardado, restaurarlo
  useEffect(() => {
    const savedAudioURL = getSavedAudioURL();
    if (savedAudioURL && !audioURL) {
      console.log('Restaurando audioURL del localStorage:', savedAudioURL);
      setAudioURLHook(savedAudioURL);
    }
  }, [audioURL, setAudioURLHook]);

  // Guardar el estado y audioURL en localStorage cuando cambien
  useEffect(() => {
    try {
      localStorage.setItem(RECORDING_STATE_STORAGE_KEY, recordingState);
      console.log('Estado guardado en localStorage:', recordingState);
    } catch (err) {
      console.error('Error al guardar el estado en localStorage:', err);
    }
  }, [recordingState]);

  useEffect(() => {
    if (audioURL) {
      try {
        localStorage.setItem(AUDIO_URL_STORAGE_KEY, audioURL);
        console.log('AudioURL guardado en localStorage');
      } catch (err) {
        console.error('Error al guardar audioURL en localStorage:', err);
      }
    }
  }, [audioURL]);

  // Cuando el componente se monta o se actualiza
  useEffect(() => {
    console.log('Componente montado/actualizado, isVisible:', isVisible);
    
    if (isVisible) {
      console.log('Componente visible, estado actual:', recordingState);
      
      const savedAudioURL = getSavedAudioURL();
      if (savedAudioURL) {
        console.log('Hay un audioURL guardado, estableciendo estado recorded');
        setRecordingState('recorded');
        if (!audioURL) {
          setAudioURLHook(savedAudioURL);
        }
      }
    }
    
    return () => {
      console.log('Componente desmontado');
    };
  }, [isVisible, audioURL, setAudioURLHook]);

  // Actualizar el estado basado en la grabación
  useEffect(() => {
    if (isRecording) {
      console.log('useEffect: isRecording=true, cambiando a estado recording');
      setRecordingState('recording');
    } else if (audioURL && !isRecording) {
      console.log('useEffect: audioURL presente, cambiando a estado recorded');
      setRecordingState('recorded');
    } else if (!isRecording && !audioURL && isPaused) {
      console.log('useEffect: pausado, manteniendo estado recording');
      setRecordingState('recording');
    }
  }, [isRecording, audioURL, isPaused]);

  // Configurar los eventos del reproductor de audio
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onplay = () => setIsPlaying(true);
      audioRef.current.onpause = () => setIsPlaying(false);
      audioRef.current.onended = () => setIsPlaying(false);
    }
  }, [audioURL]);

  // Asegurar que el estado de envío se restablezca si el componente se remonta durante un envío
  useEffect(() => {
    // Restablecer el estado de envío si hay recargas durante un envío en progreso
    const resetSendingStateOnMount = () => {
      if (isSending) {
        console.log('Restableciendo estado de envío después de recarga/remontaje');
        setIsSending(false);
        setUploadStatus('idle');
      }
    };
    
    resetSendingStateOnMount();
    
    // Limpiar estados si el componente se desmonta durante un envío
    return () => {
      if (isSending) {
        console.log('Componente desmontado durante envío, limpiando estado');
        setUploadStatus('idle');
      }
    };
  }, [isSending, setUploadStatus]);

  // Cerrar modal al hacer clic fuera del contenido
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        handleCancel();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible]);

  // Formatear tiempo como MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Función para iniciar grabación
  const handleStartRecording = async () => {
    console.log('Iniciando grabación...');
    // Limpiar cualquier grabación anterior del localStorage
    localStorage.removeItem(AUDIO_URL_STORAGE_KEY);
    
    try {
      await startRecordingHook();
    } catch (error) {
      console.error('Error al iniciar la grabación:', error);
      alert('No se pudo iniciar la grabación. Comprueba los permisos del micrófono.');
    }
  };

  // Función para detener grabación
  const handleStopRecording = async () => {
    try {
      console.log('Intentando detener la grabación...');
      
      const audioBlob = await stopRecordingHook();
      console.log('Grabación detenida, audioBlob:', audioBlob ? `Presente (${audioBlob.size} bytes)` : 'Ausente');
      
      if (audioBlob && audioBlob.size > 0) {
        console.log('Grabación completada exitosamente, cambiando a estado recorded');
        setRecordingState('recorded');
      } else {
        console.error('No se obtuvo un blob de audio válido al detener la grabación');
        clearRecordingHook();
        setRecordingState('idle');
        localStorage.removeItem(AUDIO_URL_STORAGE_KEY);
        alert('No se pudo grabar el audio. Por favor, intenta de nuevo.');
      }
    } catch (error) {
      console.error('Error al detener la grabación:', error);
      clearRecordingHook();
      setRecordingState('idle');
      localStorage.removeItem(AUDIO_URL_STORAGE_KEY);
      alert('Error al grabar el audio. Por favor, intenta de nuevo.');
    }
  };

  // Función para pausar grabación
  const handlePauseRecording = () => {
    try {
      console.log('Pausando grabación...');
      pauseRecordingHook();
      // Mantenemos el estado en 'recording' aunque esté pausado
      setRecordingState('recording');
    } catch (error) {
      console.error('Error al pausar la grabación:', error);
    }
  };

  // Función para reanudar grabación
  const handleResumeRecording = () => {
    try {
      console.log('Reanudando grabación...');
      resumeRecordingHook();
    } catch (error) {
      console.error('Error al reanudar la grabación:', error);
    }
  };

  // Función para limpiar grabación
  const handleClearRecording = () => {
    console.log('Limpiando grabación...');
    clearRecordingHook();
    setRecordingState('idle');
    localStorage.removeItem(AUDIO_URL_STORAGE_KEY);
  };

  // Función para enviar grabación
  const handleSendRecord = async () => {
    const savedAudioURL = getSavedAudioURL();
    const currentAudioURL = audioURL || savedAudioURL;
    
    if (!currentAudioURL || !senderId || !receiverId) {
      console.error('Falta información para enviar el mensaje de voz');
      return;
    }

    try {
      setIsSending(true);
      setUploadStatus('uploading');
      
      // Obtener el blob desde el audio URL
      const audioResponse = await fetch(currentAudioURL);
      const audioBlob = await audioResponse.blob();
      
      console.log('Enviando audio, tamaño:', audioBlob.size, 'bytes');
      
      if (audioBlob.size === 0) {
        throw new Error('El archivo de audio está vacío');
      }
      
      await onSend(audioBlob);
      setUploadStatus('success');
      
      // Limpiar el almacenamiento después de enviar correctamente
      localStorage.removeItem(AUDIO_URL_STORAGE_KEY);
      localStorage.removeItem(RECORDING_STATE_STORAGE_KEY);
      
      // Asegurar que todos los estados se restablezcan
      clearRecordingHook();
      setRecordingState('idle');
      
      onClose();
    } catch (error) {
      console.error('Error al enviar el mensaje de voz:', error);
      setUploadStatus('error');
    } finally {
      setIsSending(false);
    }
  };

  // Función para cancelar grabación
  const handleCancel = () => {
    clearRecordingHook();
    localStorage.removeItem(AUDIO_URL_STORAGE_KEY);
    localStorage.removeItem(RECORDING_STATE_STORAGE_KEY);
    onCancel();
  };

  // Si el componente no es visible, no renderizar nada
  if (!isVisible) return null;

  // Determinar si hay un audio guardado
  const savedAudioURL = getSavedAudioURL();
  const hasAudio = Boolean(audioURL || savedAudioURL);
  const displayState = hasAudio ? 'recorded' : recordingState;

  console.log('Renderizando con estado:', displayState, 'hasAudio:', hasAudio);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div 
        ref={modalRef}
        className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">Grabación de voz</h3>
          <button 
            onClick={handleCancel} 
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            type="button"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          {displayState === 'idle' && (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-center text-gray-500 mb-4">Presiona el botón para comenzar a grabar</p>
              <button
                onClick={handleStartRecording}
                className="p-4 bg-red-500 text-white rounded-full hover:bg-red-600"
                disabled={isSending}
                type="button"
                aria-label="Iniciar grabación"
              >
                <Mic size={24} />
              </button>
            </div>
          )}

          {displayState === 'recording' && (
            <div className="flex flex-col space-y-4">
              <div className="flex justify-center items-center space-x-4">
                <div className="recording-indicator flex items-center space-x-2">
                  <div className="recording-dot"></div>
                  <span className="text-red-500 font-bold">Grabando: {formatTime(recordingTime)}</span>
                </div>
              </div>
              
              <div className="flex justify-center space-x-4">
                {isPaused ? (
                  <button
                    onClick={handleResumeRecording}
                    className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                    disabled={isSending}
                    type="button"
                    aria-label="Reanudar grabación"
                  >
                    <Play size={24} />
                  </button>
                ) : (
                  <button
                    onClick={handlePauseRecording}
                    className="p-3 bg-yellow-500 text-white rounded-full hover:bg-yellow-600"
                    disabled={isSending}
                    type="button"
                    aria-label="Pausar grabación"
                  >
                    <Pause size={24} />
                  </button>
                )}
                
                <button
                  onClick={handleStopRecording}
                  className="p-4 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center space-x-2 shadow-lg"
                  disabled={isSending}
                  type="button"
                  aria-label="Detener grabación"
                >
                  <Square size={24} />
                  <span className="font-bold">Detener</span>
                </button>
              </div>
            </div>
          )}

          {displayState === 'recorded' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Vista previa</h4>
                <div className="flex space-x-2">
                  <button
                    onClick={handleClearRecording}
                    className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-full"
                    type="button"
                    aria-label="Descartar grabación"
                  >
                    <Trash size={16} />
                  </button>
                </div>
              </div>
              
              <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-lg">
                <audio 
                  ref={audioRef} 
                  src={audioURL || savedAudioURL || undefined} 
                  controls 
                  className="w-full" 
                  preload="metadata" 
                />
              </div>
              
              <div className="flex justify-center pt-2">
                <button
                  onClick={handleSendRecord}
                  className="flex items-center justify-center space-x-2 py-2 px-6 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                  disabled={isSending}
                  type="button"
                  aria-label="Enviar mensaje de voz"
                >
                  {isSending ? (
                    <span>Enviando...</span>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Enviar mensaje</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <style jsx>{`
        .recording-dot {
          height: 12px;
          width: 12px;
          background-color: red;
          border-radius: 50%;
          display: inline-block;
          animation: pulse 1.5s infinite;
        }
        
        @keyframes pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.7);
          }
          
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 10px rgba(255, 0, 0, 0);
          }
          
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceMessageRecorder;
