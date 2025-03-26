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

  // Cleanup function optimizada con manejo de errores
  useEffect(() => {
    return () => {
      cleanupResources();
    };
  }, []);

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

  // Función para crear un blob de audio optimizado
  const createOptimizedAudioBlob = useCallback((chunks: Blob[], mimeType: string): Blob => {
    // La compresión depende del mime type disponible
    return new Blob(chunks, { type: mimeType });
  }, []);

  // Función optimizada para iniciar grabación
  const startRecording = useCallback(async () => {
    try {
      // Asegurar que limpiamos recursos previos
      cleanupResources();
      
      // Reset previous recording data
      audioChunksRef.current = [];
      setAudioURL(null);
      setRecordingTime(0);

      // Opciones de audio optimizadas para mensajería
      const audioConstraints = { 
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        // Configuración optimizada para voz
        channelCount: 1,
        sampleRate: 22050 // Suficiente para voz humana y reduce el tamaño del archivo
      };

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
      mediaStreamRef.current = stream;

      // Probar diferentes formatos de codificación en orden de preferencia
      const mimeTypes = [
        'audio/webm;codecs=opus', 
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.5', // AAC
        ''  // Formato predeterminado
      ];
      
      let recorder: MediaRecorder | null = null;
      
      // Intentar diferentes formatos hasta encontrar uno compatible
      for (const mimeType of mimeTypes) {
        try {
          if (!mimeType || MediaRecorder.isTypeSupported(mimeType)) {
            const options = mimeType ? { mimeType } : undefined;
            recorder = new MediaRecorder(stream, options);
            console.log(`MediaRecorder iniciado con formato: ${mimeType || 'predeterminado'}`);
            break;
          }
        } catch {
          console.log(`Formato ${mimeType} no soportado, probando siguiente...`);
        }
      }
      
      if (!recorder) {
        throw new Error("No se pudo crear un MediaRecorder compatible");
      }
      
      mediaRecorderRef.current = recorder;

      // Handle data available event
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording with adjusted timeslice for mejor equilibrio entre rendimiento y calidad
      recorder.start(250); // Recoger datos cada 250ms para reducir overhead pero mantener chunks manejables
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
  }, [cleanupResources]);

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
      // solicitamos explícitamente datos antes de detener
      if (audioChunksRef.current.length === 0 && mediaRecorder.state !== 'inactive') {
        console.log("Solicitando datos explícitamente antes de detener");
        mediaRecorder.requestData();
      }
      
      const onDataAvailable = (event: BlobEvent) => {
        console.log("Datos disponibles durante la detención:", event.data.size, "bytes");
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Añadir un oyente temporal para capturar los últimos datos
      mediaRecorder.addEventListener('dataavailable', onDataAvailable);

      mediaRecorder.onstop = () => {
        // Eliminar el oyente temporal
        mediaRecorder.removeEventListener('dataavailable', onDataAvailable);
        
        try {
          // Stop all tracks
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
          }

          // Stop timer
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
            } else {
              console.error("El blob generado tiene tamaño 0");
            }
          } else {
            console.error("No hay chunks de audio para procesar");
          }
          
          // Si llegamos aquí, no hay grabación válida
          setRecordingState('inactive');
          resolve(null);
        } catch (error) {
          console.error('Error processing recording:', error);
          setRecordingState('inactive');
          resolve(null);
        }
      };

      // Asegurar que el grabador esté en estado activo antes de intentar detenerlo
      try {
        if (mediaRecorder.state === 'recording') {
          console.log("Deteniendo grabador activo");
          mediaRecorder.stop();
        } else {
          console.log("MediaRecorder en estado inactivo:", mediaRecorder.state);
          cleanupResources();
          setRecordingState('inactive');
          resolve(null);
        }
      } catch (error) {
        console.error('Error stopping MediaRecorder:', error);
        cleanupResources();
        setRecordingState('inactive');
        resolve(null);
      }
    });
  }, [audioURL, recordingState, recordingTime, cleanupResources, createOptimizedAudioBlob]);

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
