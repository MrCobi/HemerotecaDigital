import { useState, useRef, useCallback, useEffect } from 'react';

type RecorderState = 'inactive' | 'recording';

interface UseAudioRecorderReturn {
  audioURL: string | null;
  isRecording: boolean;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  clearRecording: () => void;
  setAudioURL: (url: string) => void;
}

export default function useAudioRecorder(): UseAudioRecorderReturn {
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [recordingState, setRecordingState] = useState<RecorderState>('inactive');
  const [recordingTime, setRecordingTime] = useState<number>(0);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);

  // Función centralizada para limpiar recursos con manejo de errores
  const cleanupResources = useCallback(() => {
    try {
      // Limpiar temporizador
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      // Detener y liberar el MediaRecorder
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn("Error al detener mediaRecorder:", e);
        }
      }
      mediaRecorderRef.current = null;
      
      // Detener y liberar la MediaStream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => {
          try {
            track.stop();
            mediaStreamRef.current?.removeTrack(track);
          } catch (e) {
            console.warn("Error al detener pista de audio:", e);
          }
        });
        mediaStreamRef.current = null;
      }
      
      // Revocar URLs de objeto creadas
      if (audioURL) {
        try {
          URL.revokeObjectURL(audioURL);
        } catch (e) {
          console.warn("Error al revocar URL:", e);
        }
      }
      
      // Limpiar chunks de audio
      audioChunksRef.current = [];
    } catch (err) {
      console.error("Error durante la limpieza de recursos:", err);
    }
  }, [audioURL]);

  // Cleanup function optimizada con manejo de errores
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, [cleanupResources]);

  // Función para crear un blob de audio optimizado
  const createOptimizedAudioBlob = useCallback((chunks: Blob[], mimeType: string): Blob => {
    // La compresión depende del mime type disponible
    return new Blob(chunks, { type: mimeType });
  }, []);

  // Función optimizada para detener grabación
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    console.log("stopRecording llamado, estado actual:", recordingState);
    console.log("chunks existentes:", audioChunksRef.current.length);
    
    // Si no hay grabación activa o pausada, no hay nada que detener
    if (!mediaRecorderRef.current || recordingState === 'inactive') {
      console.log("No hay grabación activa para detener");
      return null;
    }
    
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current!;
      
      // Si no hay datos disponibles todavía y el grabador está activo,
      // añadimos un manejador para el evento dataavailable
      const handleStop = () => {
        mediaRecorder.removeEventListener('stop', handleStop);
        
        // Reiniciar el temporizador
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        // Verificar si tenemos chunks válidos
        console.log("Comprobando chunks después de detener:", audioChunksRef.current.length);
        if (audioChunksRef.current.length > 0) {
          // Determinar el formato correcto basado en los datos disponibles
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          
          // Crear blob con compresión optimizada
          const audioBlob = createOptimizedAudioBlob(audioChunksRef.current, mimeType);
          
          console.log(`Audio grabado: ${recordingTime}s, ${audioChunksRef.current.length} chunks, ${audioBlob.size} bytes`);
          
          if (audioBlob.size > 0) {
            // Revocar URL anterior si existe
            if (audioURL) {
              URL.revokeObjectURL(audioURL);
            }
            
            // Crear y almacenar nueva URL
            const url = URL.createObjectURL(audioBlob);
            console.log('useAudioRecorder: Creando URL del blob:', url);
            setAudioURL(url);
            
            // Guardar el blob para que esté disponible cuando se necesite
            audioBlobRef.current = audioBlob;
            
            // Añadir un pequeño retraso para asegurar que la URL se establezca correctamente
            setTimeout(() => {
              setRecordingState('inactive');
              resolve(audioBlob);
            }, 50);
            return;
          }
        }
        
        console.log("No se generaron chunks de audio válidos");
        setRecordingState('inactive');
        resolve(null);
      };
      
      // Añadir controlador para el evento stop
      mediaRecorder.addEventListener('stop', handleStop);
      
      // Limpiar stream de audio
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }
      
      try {
        // Si está grabando, detener la grabación
        if (mediaRecorder.state !== 'inactive') {
          mediaRecorder.stop();
        } else {
          // Invocar el manejador manualmente si ya está inactivo
          handleStop();
        }
      } catch (e) {
        console.error("Error al detener la grabación:", e);
        setRecordingState('inactive');
        resolve(null);
      }
    });
  }, [recordingState, audioURL, recordingTime, createOptimizedAudioBlob]);

  // Iniciar grabación con manejo mejorado de errores y memoria
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      // Verificar si ya hay una grabación en curso
      if (mediaRecorderRef.current) {
        console.log("Ya hay una grabación activa, deteniendo primero");
        await stopRecording();
      }
      
      // Limpiar datos de grabación anterior
      setRecordingTime(0);
      audioChunksRef.current = [];
      
      console.log("Solicitando permiso para acceder al micrófono...");
      // Solicitar acceso al micrófono con parámetros optimizados
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100, // Calidad estándar
        }
      });
      
      mediaStreamRef.current = stream;
      
      // Crear opciones mejoradas para el MediaRecorder
      const options = { mimeType: 'audio/webm' };
      
      // Crear un nuevo MediaRecorder con mejor detección de compatibilidad
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      
      // Manejador para los chunks de audio
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Iniciar grabación con intervalos más pequeños para mejor calidad
      mediaRecorderRef.current.start(250);
      setRecordingState('recording');

      // Start timer with better memory management
      timerRef.current = setInterval(() => {
        setRecordingTime(prevTime => {
          // Limitar la duración máxima a 5 minutos para evitar problemas de memoria
          if (prevTime >= 300) {
            stopRecording().catch(console.error);
            return prevTime;
          }
          return prevTime + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
      // Asegurar limpieza en caso de error
      cleanupResources();
      throw error;
    }
  }, [cleanupResources, stopRecording]);

  // Función optimizada para limpiar grabación
  const clearRecording = useCallback(() => {
    if (audioURL) {
      try {
        URL.revokeObjectURL(audioURL);
      } catch (e) {
        console.warn("Error al revocar URL:", e);
      }
      setAudioURL(null);
    }
    
    // Resetear el estado de grabación
    setRecordingTime(0);
    audioChunksRef.current = [];
  }, [audioURL]);

  // Valores calculados basados en el estado
  const isRecording = recordingState === 'recording';

  // Exportar valores memoizados para evitar re-renders innecesarios
  return {
    audioURL,
    isRecording,
    recordingTime,
    startRecording,
    stopRecording,
    clearRecording,
    setAudioURL,
  };
}
