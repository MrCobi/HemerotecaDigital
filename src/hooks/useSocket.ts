import { useEffect, useRef, useState } from 'react';
import io, { Socket } from 'socket.io-client';

// El puerto debe coincidir con el del servidor Socket.io
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export type MessageType = {
  id?: string;
  tempId?: string;
  content: string;
  senderId: string;
  receiverId?: string;
  conversationId?: string;
  createdAt: Date | string;
  read?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'error';
};

export type UserType = {
  userId: string;
  username: string;
  socketId: string;
  image?: string;
};

export type TypingStatusType = {
  userId: string;
  isTyping: boolean;
};

interface UseSocketOptions {
  userId?: string;
  username?: string;
  onNewMessage?: (message: MessageType) => void;
  onUserOnline?: (users: UserType[]) => void;
  onTypingStatus?: (status: TypingStatusType) => void;
  onMessageStatus?: (status: { messageId: string; status: string }) => void;
  onMessageRead?: (data: { messageId: string; conversationId: string }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Error | unknown) => void;
}

export default function useSocket(options: UseSocketOptions) {
  const { 
    userId, 
    username,
    onNewMessage,
    onUserOnline,
    onTypingStatus,
    onMessageStatus,
    onMessageRead,
    onConnect,
    onDisconnect,
    onError
  } = options;
  
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<Error | unknown>(null);
  const [onlineUsers, setOnlineUsers] = useState<UserType[]>([]);
  
  // Use a properly typed ref for the socket
  const socketRef = useRef<Socket | null>(null);
  
  // Initialize Socket.io connection
  useEffect(() => {
    // Don't initialize without a userId
    if (!userId) {
      console.warn('No se puede inicializar socket sin userId');
      return;
    }
    
    console.log('Inicializando conexión de Socket.io con userId:', userId);
    
    // Cleanup function to properly disconnect the socket
    const cleanup = () => {
      if (socketRef.current) {
        console.log('Desconectando socket existente');
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    
    // Create a new Socket.io instance
    try {
      // Always clean up previous socket if it exists
      cleanup();
      
      // Create the new socket
      socketRef.current = io(SOCKET_SERVER_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        transports: ['websocket', 'polling'],
        auth: { userId, username },
        query: { userId, username }
      });
      
      const socket = socketRef.current;
      
      console.log('Socket.io instanciado correctamente');
      
      // Connection events
      socket.on('connect', () => {
        console.log('Socket.io conectado exitosamente con ID:', socket.id);
        setConnected(true);
        
        // Enviar información del usuario al conectarse
        socket.emit('user_connected', { userId, username });
        
        if (onConnect) onConnect();
      });
      
      socket.on('connect_error', (err) => {
        console.error('Error de conexión Socket.io:', err);
        setConnected(false);
        setError(err);
        
        if (onError) onError(err);
      });
      
      socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Intento de reconexión Socket.io #${attemptNumber}`);
      });
      
      socket.on('reconnect_error', (e) => {
        console.error('Error de reconexión Socket.io:', e);
        
        // Intentar cambiar a transport polling después de errores
        try {
          socket.io.opts.transports = ['polling', 'websocket'];
        } catch (e) {
          console.error('Error al cambiar transporte:', e);
        }
        
        if (onError) onError(error);
      });
      
      socket.on('disconnect', (reason) => {
        console.log('Socket.io desconectado:', reason);
        setConnected(false);
        
        if (onDisconnect) onDisconnect();
      });
      
      // Message events
      socket.on('new_message', (message: MessageType) => {
        console.log('Recibido nuevo mensaje en useSocket:', message);
        
        // Ensure message has a valid creation date
        if (!message.createdAt) {
          console.warn('Mensaje recibido sin fecha de creación, añadiendo fecha actual');
          message.createdAt = new Date().toISOString();
        } else if (typeof message.createdAt === 'object' && message.createdAt instanceof Date) {
          // Convert Date object to ISO string for consistency
          message.createdAt = message.createdAt.toISOString();
        } else if (typeof message.createdAt === 'string') {
          // Validate that the date is a valid ISO format
          try {
            const fecha = new Date(message.createdAt);
            if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
            message.createdAt = fecha.toISOString(); // Normalize format
          } catch {
            console.warn('Fecha de mensaje inválida, usando fecha actual');
            message.createdAt = new Date().toISOString();
          }
        }
        
        // Ensure message has a tempId for tracking
        if (!message.id && !message.tempId) {
          console.warn('Mensaje sin ID temporal, generando uno');
          message.tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        }
        
        // Detailed log for debugging
        console.log('Mensaje antes de procesarlo:', JSON.stringify(message, null, 2));
        
        if (onNewMessage) {
          console.log('Enviando mensaje a callback onNewMessage');
          onNewMessage(message);
        } else {
          console.error('No hay manejador onNewMessage definido, el mensaje no será mostrado en la UI');
        }
      });
      
      socket.on('message_status', (data: { messageId: string, status: string }) => {
        console.log('Estado de mensaje actualizado:', data);
        
        if (onMessageStatus) {
          onMessageStatus(data);
        } else {
          console.warn('No hay manejador onMessageStatus definido');
        }
      });
      
      socket.on('message_read', (data: { messageId: string; conversationId: string }) => {
        if (onMessageRead) onMessageRead(data);
      });
      
      socket.on('typing_status', (status: TypingStatusType) => {
        if (onTypingStatus) onTypingStatus(status);
      });
      
      socket.on('users_online', (users: UserType[]) => {
        console.log('Usuarios online:', users);
        setOnlineUsers(users);
        if (onUserOnline) onUserOnline(users);
      });
      
    } catch (err) {
      console.error('Error al crear instancia de Socket.io:', err);
      setError(err);
      if (onError) onError(err);
    }
    
    // Cleanup on unmount or when dependencies change
    return cleanup;
  }, [userId, username, onNewMessage, onUserOnline, onTypingStatus, onMessageStatus, onMessageRead, onConnect, onDisconnect, onError]);
  
  // Functions to interact with Socket.io
  const sendMessage = (message: MessageType) => {
    try {
      if (!socketRef.current) {
        console.error('No hay conexión con el servidor de chat. Socket es nulo.');
        setError(new Error('Socket no inicializado'));
        if (onMessageStatus && message.tempId) {
          onMessageStatus({
            messageId: message.tempId,
            status: 'error'
          });
        }
        return false;
      }
      
      if (!socketRef.current.connected) {
        console.error('Socket no conectado. Intentando reconectar...');
        socketRef.current.connect();
        
        if (onMessageStatus && message.tempId) {
          onMessageStatus({
            messageId: message.tempId,
            status: 'error'
          });
        }
        return false;
      }
      
      const tempId = message.tempId || `temp-${Date.now()}`;
      const enhancedMessage = {
        ...message,
        tempId
      };
      
      console.log('Enviando mensaje via Socket.io:', JSON.stringify(enhancedMessage, null, 2));
      
      // First emit an event for the sender to update UI immediately
      if (onNewMessage) {
        console.log('Notificando localmente el mensaje enviado (UI inmediata)');
        onNewMessage({
          ...enhancedMessage,
          status: 'sending'
        });
      }
      
      // Then send to server
      socketRef.current.emit('send_message', enhancedMessage);
      
      // Check socket status after sending
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          console.log('Socket sigue conectado después de enviar mensaje');
          
          // Update status to 'sent' after a brief delay
          if (onMessageStatus) {
            onMessageStatus({
              messageId: tempId,
              status: 'sent'
            });
          }
        } else {
          console.error('Socket desconectado después de enviar mensaje');
          // Notify of sending error
          if (onMessageStatus) {
            onMessageStatus({
              messageId: tempId,
              status: 'error'
            });
          }
        }
      }, 500);
      
      return true;
    } catch (err) {
      console.error('Error al enviar mensaje:', err);
      setError(err);
      return false;
    }
  };
  
  const setTypingStatus = (receiverId: string, isTyping: boolean) => {
    if (!socketRef.current || !userId) return;
    
    socketRef.current.emit('typing', { userId, receiverId, isTyping });
  };
  
  const markMessageAsRead = (messageId: string, conversationId: string) => {
    if (!socketRef.current || !userId) return;
    
    socketRef.current.emit('mark_read', { messageId, conversationId });
  };
  
  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
  };
  
  const reconnect = () => {
    if (!socketRef.current) {
      console.error('No se puede reconectar, socket no inicializado');
      return;
    }
    
    console.log('Intentando reconectar socket...');
    socketRef.current.connect();
  };
  
  return {
    socket: socketRef.current,
    connected,
    error,
    onlineUsers,
    sendMessage,
    setTypingStatus,
    markMessageAsRead,
    disconnect,
    reconnect
  };
}
