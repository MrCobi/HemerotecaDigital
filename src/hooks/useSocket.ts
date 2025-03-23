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
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
  createdAt: Date | string;
  read?: boolean;
  readBy?: string[];
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
  conversationId?: string;
  isTyping: boolean;
};

export type ConversationType = {
  id: string;
  name?: string;
  isGroup: boolean;
  imageUrl?: string;
  participants: {
    userId: string;
    username?: string;
    image?: string;
    isAdmin?: boolean;
  }[];
  lastMessage?: MessageType;
};

interface UseSocketOptions {
  userId?: string;
  username?: string;
  onNewMessage?: (message: MessageType) => void;
  onUserOnline?: (users: UserType[]) => void;
  onTypingStatus?: (status: TypingStatusType) => void;
  onMessageStatus?: (status: { messageId: string; status: string }) => void;
  onMessageRead?: (data: { messageId: string; conversationId?: string; readBy?: string }) => void;
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
        socket.emit('identify', { userId, username });
        
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
      
      socket.on('message_read', (data: { messageId: string; conversationId?: string; readBy?: string }) => {
        console.log('Mensaje marcado como leído:', data);
        if (onMessageRead) onMessageRead(data);
      });
      
      socket.on('typing_status', (status: TypingStatusType) => {
        console.log('Estado de escritura actualizado:', status);
        if (onTypingStatus) onTypingStatus(status);
      });
      
      socket.on('users_online', (users: UserType[]) => {
        console.log('Lista de usuarios online actualizada:', users);
        setOnlineUsers(users);
        
        if (onUserOnline) onUserOnline(users);
      });
      
      socket.on('message_updated', (update: { tempId: string; realId: string; status: string }) => {
        console.log('Actualización de ID de mensaje:', update);
        // Este evento sólo lo maneja internamente el componente de chat
      });
    } catch (e) {
      console.error('Error al inicializar Socket.io:', e);
      setError(e);
      
      if (onError) onError(e);
    }
    
    // Cleanup on unmount
    return cleanup;
  }, [userId, username, onConnect, onDisconnect, onError, onMessageRead, onMessageStatus, onNewMessage, onTypingStatus, onUserOnline]);
  
  // Function to send a message
  const sendMessage = (message: Omit<MessageType, 'createdAt' | 'status'>) => {
    if (!socketRef.current || !connected) {
      console.error('No se puede enviar mensaje: Socket no conectado');
      return false;
    }
    
    try {
      // Generate tempId if not provided
      const finalMessage = {
        ...message,
        tempId: message.tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        status: 'sending',
        createdAt: new Date(),
      };
      
      console.log('Enviando mensaje:', finalMessage);
      socketRef.current.emit('send_message', finalMessage);
      
      return finalMessage.tempId;
    } catch (e) {
      console.error('Error al enviar mensaje:', e);
      return false;
    }
  };
  
  // Function to send a voice message
  const sendVoiceMessage = (message: {
    senderId: string;
    conversationId: string;
    mediaUrl: string;
    content?: string;
    tempId?: string;
  }) => {
    if (!socketRef.current || !connected) {
      console.error('No se puede enviar mensaje de voz: Socket no conectado');
      return false;
    }
    
    try {
      const voiceMessage = {
        ...message,
        messageType: 'voice' as const,
        tempId: message.tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      };
      
      console.log('Enviando mensaje de voz:', {
        ...voiceMessage, 
        mediaUrl: voiceMessage.mediaUrl.substring(0, 50) + '...'
      });
      
      socketRef.current.emit('send_voice_message', voiceMessage);
      
      return voiceMessage.tempId;
    } catch (e) {
      console.error('Error al enviar mensaje de voz:', e);
      return false;
    }
  };
  
  // Function to indicate user is typing
  const sendTyping = (conversationId: string, isTyping: boolean) => {
    if (!socketRef.current || !connected || !userId) {
      return;
    }
    
    try {
      socketRef.current.emit('typing', { userId, conversationId, isTyping });
    } catch (e) {
      console.error('Error al enviar estado de escritura:', e);
    }
  };
  
  // Function to mark a message as read
  const markMessageAsRead = (messageId: string, conversationId: string) => {
    if (!socketRef.current || !connected || !userId) {
      return;
    }
    
    try {
      socketRef.current.emit('mark_read', { messageId, conversationId, userId });
    } catch (e) {
      console.error('Error al marcar mensaje como leído:', e);
    }
  };
  
  // Function to join a conversation
  const joinConversation = (conversationId: string) => {
    if (!socketRef.current || !connected || !userId) {
      console.error('No se puede unir a la conversación: Socket no conectado');
      return;
    }
    
    try {
      socketRef.current.emit('join_conversation', { userId, conversationId });
      console.log(`Unido a la conversación: ${conversationId}`);
    } catch (e) {
      console.error('Error al unirse a la conversación:', e);
    }
  };
  
  // Function to leave a conversation
  const leaveConversation = (conversationId: string) => {
    if (!socketRef.current || !connected || !userId) {
      return;
    }
    
    try {
      socketRef.current.emit('leave_conversation', { userId, conversationId });
      console.log(`Abandonada la conversación: ${conversationId}`);
    } catch (e) {
      console.error('Error al abandonar la conversación:', e);
    }
  };
  
  return {
    connected,
    error,
    onlineUsers,
    socket: socketRef.current,
    sendMessage,
    sendVoiceMessage,
    sendTyping,
    markMessageAsRead,
    joinConversation,
    leaveConversation
  };
}
