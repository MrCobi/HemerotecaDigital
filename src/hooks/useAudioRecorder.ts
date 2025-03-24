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

  // Cleanup function
  useEffect(() => {
    return () => {
      // Limpiar recursos al desmontar
      cleanupResources();
    };
  }, []);

  // Función centralizada para limpiar recursos
  const cleanupResources = useCallback(() => {
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
        track.stop();
        mediaStreamRef.current?.removeTrack(track);
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
  }, [audioURL]);

  // Start recording audio
  const startRecording = useCallback(async () => {
    try {
      // Asegurar que limpiamos recursos previos
      cleanupResources();
      
      // Reset previous recording data
      audioChunksRef.current = [];
      setAudioURL(null);
      setRecordingTime(0);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      mediaStreamRef.current = stream;

      // Create new MediaRecorder with options for broader compatibility
      const options = { mimeType: 'audio/webm;codecs=opus' };
      let recorder;
      
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (e) {
        console.log('MediaRecorder with opus not supported, trying without codec specification');
        try {
          recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        } catch (e) {
          console.log('MediaRecorder with webm not supported, trying default');
          recorder = new MediaRecorder(stream);
        }
      }
      
      mediaRecorderRef.current = recorder;

      // Handle data available event
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Start recording
      recorder.start(100); // Collect data every 100ms
      setRecordingState('recording');

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (mediaRecorderRef.current && recordingState !== 'inactive') {
        const mediaRecorder = mediaRecorderRef.current;

        mediaRecorder.onstop = () => {
          console.log('MediaRecorder stopped');
          // Stop all tracks
          if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
          }

          // Create blob from audio chunks
          // Determine the MIME type based on recorder's mimeType
          const mimeType = mediaRecorder.mimeType || 'audio/webm';
          const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
          
          console.log('Audio recorded with MIME type:', mimeType);
          console.log('Audio duration:', recordingTime, 'seconds');
          console.log('Audio chunks:', audioChunksRef.current.length, 'Size:', audioBlob.size, 'bytes');
          
          if (audioBlob.size > 0) {
            const url = URL.createObjectURL(audioBlob);
            console.log('Audio URL created:', url);
            setAudioURL(url);
          } else {
            console.error('Audio blob is empty');
          }

          // Stop timer
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          setRecordingState('inactive');
          resolve(audioBlob);
        };

        // Make sure we collect any remaining data
        mediaRecorder.requestData();
        
        try {
          // Stop the recorder immediately, not after a delay
          mediaRecorder.stop();
          console.log('Stop command sent to MediaRecorder');
        } catch (error) {
          console.error('Error stopping MediaRecorder:', error);
          setRecordingState('inactive');
          resolve(null);
        }
      } else {
        console.log('No active MediaRecorder to stop', { recordingState });
        resolve(null);
      }
    });
  }, [recordingState, recordingTime]);

  // Pause recording
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
      
      // Pause timer
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [recordingState]);

  // Resume recording
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
      
      // Resume timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    }
  }, [recordingState]);

  // Clear recording
  const clearRecording = useCallback(() => {
    cleanupResources();
    setAudioURL(null);
    setRecordingTime(0);
    setRecordingState('inactive');
  }, [cleanupResources]);

  // Set audio URL (for restoring from storage)
  const setAudioURLState = useCallback((url: string) => {
    // Si ya hay un URL, revocarlo primero
    if (audioURL) {
      try {
        URL.revokeObjectURL(audioURL);
      } catch (e) {
        console.warn("Error al revocar URL anterior:", e);
      }
    }
    setAudioURL(url);
  }, [audioURL]);

  return {
    audioURL,
    isRecording: recordingState === 'recording',
    isPaused: recordingState === 'paused',
    recordingTime,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    setAudioURL: setAudioURLState
  };
}
