import { useState, useRef, useCallback, useEffect } from 'react';

type RecorderState = 'inactive' | 'recording' | 'paused';

interface UseAudioRecorderReturn {
  audioURL: string | null;
  isRecording: boolean;
  isPaused: boolean;
  recordingTime: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
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
        } catch (e) {
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
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && recordingState !== 'inactive') {
        const mediaRecorder = mediaRecorderRef.current;

        mediaRecorder.onstop = () => {
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
                setAudioURL(url);
                
                setRecordingState('inactive');
                resolve(audioBlob);
                return;
              }
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

        // Detener la grabación de manera segura
        try {
          mediaRecorder.stop();
        } catch (error) {
          console.error('Error stopping MediaRecorder:', error);
          cleanupResources();
          setRecordingState('inactive');
          resolve(null);
        }
      } else {
        // No hay grabación activa
        setRecordingState('inactive');
        resolve(null);
      }
    });
  }, [audioURL, recordingState, recordingTime, cleanupResources, createOptimizedAudioBlob]);

  // Función optimizada para pausar grabación
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      try {
        mediaRecorderRef.current.pause();
        setRecordingState('paused');
        
        // Pausar el temporizador
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      } catch (error) {
        console.error('Error pausing recording:', error);
      }
    }
  }, [recordingState]);

  // Función optimizada para reanudar grabación
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      try {
        mediaRecorderRef.current.resume();
        setRecordingState('recording');
        
        // Reanudar el temporizador
        if (!timerRef.current) {
          timerRef.current = setInterval(() => {
            setRecordingTime(prevTime => prevTime + 1);
          }, 1000);
        }
      } catch (error) {
        console.error('Error resuming recording:', error);
      }
    }
  }, [recordingState]);

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
  const isPaused = recordingState === 'paused';

  // Exportar valores memoizados para evitar re-renders innecesarios
  return {
    audioURL,
    isRecording,
    isPaused,
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    setAudioURL,
  };
}
