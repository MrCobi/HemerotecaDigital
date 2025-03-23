import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

// El puerto debe coincidir con el del servidor Socket.io
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Variable global para mantener una única instancia del socket
let globalSocket: Socket | null = null;
let globalSocketUserId: string | null = null;
let connectionAttemptInProgress = false;
let socketInitCount = 0;

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
  
  // Use a properly typed ref for the socket that points to the global instance
  const socketRef = useRef<Socket | null>(null);
  const instanceId = useRef<number>(++socketInitCount);
  const callbacksRef = useRef({
    onNewMessage,
    onUserOnline,
    onTypingStatus,
    onMessageStatus,
    onMessageRead,
    onConnect,
    onDisconnect,
    onError
  });
  
  // Actualizar callbacks cuando cambien
  useEffect(() => {
    callbacksRef.current = {
      onNewMessage,
      onUserOnline,
      onTypingStatus,
      onMessageStatus,
      onMessageRead,
      onConnect,
      onDisconnect,
      onError
    };
  }, [
    onNewMessage,
    onUserOnline,
    onTypingStatus,
    onMessageStatus,
    onMessageRead,
    onConnect,
    onDisconnect,
    onError
  ]);
  
  const inactivityTimeout = useRef<NodeJS.Timeout>();

  const resetInactivityTimer = () => {
    clearTimeout(inactivityTimeout.current!);
    inactivityTimeout.current = setTimeout(() => {
      socketRef.current?.emit('user_inactive');
      socketRef.current?.disconnect();
    }, 1800000); // 30 minutos
  };

  // Handler for identifying user to the server
  const identifyUser = useCallback(() => {
    if (socketRef.current && userId && username) {
      console.log(`[Socket ${instanceId.current}] Identificando usuario al servidor:`, userId, username);
      socketRef.current.emit('identify', { userId, username });
    }
  }, [userId, username]);
  
  // Setup event handlers for the socket
  const setupEventHandlers = useCallback(() => {
    if (!socketRef.current) return;
    
    const socket = socketRef.current;
    
    // Limpiar manejadores previos para evitar duplicación
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.off('reconnect_attempt');
    socket.off('reconnect_error');
    socket.off('users_online');
    socket.off('new_message');
    socket.off('message_status');
    socket.off('message_updated');
    socket.off('typing_status');
    socket.off('message_read');
    socket.off('force_disconnect');
    socket.off('pong');
    socket.off('reidentify');
    
    // Connection events
    socket.on('connect', () => {
      console.log(`[Socket ${instanceId.current}] Socket.io conectado exitosamente con ID:`, socket.id);
      setConnected(true);
      
      // Identificar usuario automáticamente al conectar
      identifyUser();
      
      if (callbacksRef.current.onConnect) callbacksRef.current.onConnect();
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`[Socket ${instanceId.current}] Socket.io desconectado:`, reason);
      setConnected(false);
      
      if (callbacksRef.current.onDisconnect) callbacksRef.current.onDisconnect();
    });
    
    socket.on('connect_error', (err) => {
      console.error(`[Socket ${instanceId.current}] Error de conexión Socket.io:`, err);
      setConnected(false);
      setError(err);
      
      if (callbacksRef.current.onError) callbacksRef.current.onError(err);
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[Socket ${instanceId.current}] Intento de reconexión Socket.io #${attemptNumber}`);
    });
    
    socket.on('reconnect_error', (e) => {
      console.error(`[Socket ${instanceId.current}] Error de reconexión Socket.io:`, e);
      
      // Intentar cambiar a transport polling después de errores
      try {
        socket.io.opts.transports = ['polling', 'websocket'];
      } catch (e) {
        console.error('Error al cambiar transporte:', e);
      }
      
      if (callbacksRef.current.onError) callbacksRef.current.onError(e);
    });
    
    // El servidor notifica que este socket será desconectado porque hay uno nuevo
    socket.on('force_disconnect', (data) => {
      console.log(`[Socket ${instanceId.current}] Socket forzado a desconectar. Razón: ${data.reason}`);
      // No hacemos nada más, el evento disconnect se disparará después
    });
    
    // Servidor solicita reidentificación
    socket.on('reidentify', () => {
      console.log(`[Socket ${instanceId.current}] Servidor solicitó reidentificación`);
      identifyUser();
    });
    
    // Respuesta a ping para mantener la conexión
    socket.on('pong', ({ timestamp }) => {
      const latency = Date.now() - timestamp;
      console.log(`[Socket ${instanceId.current}] Pong recibido. Latencia: ${latency}ms`);
    });
    
    // Application events
    socket.on('users_online', (users: UserType[]) => {
      setOnlineUsers(users);
      
      if (callbacksRef.current.onUserOnline) callbacksRef.current.onUserOnline(users);
    });
    
    socket.on('new_message', (message: MessageType) => {
      console.log(`[Socket ${instanceId.current}] Recibido nuevo mensaje:`, message);
      
      // Ensure message has a valid creation date
      if (!message.createdAt) {
        console.warn('Mensaje recibido sin fecha de creación, añadiendo fecha actual');
        message.createdAt = new Date().toISOString();
      } else if (typeof message.createdAt === 'object' && message.createdAt instanceof Date) {
        message.createdAt = message.createdAt.toISOString();
      }
      
      if (callbacksRef.current.onNewMessage) callbacksRef.current.onNewMessage(message);
    });
    
    socket.on('message_status', (update: { messageId: string; status: string }) => {
      console.log(`[Socket ${instanceId.current}] Estado de mensaje actualizado:`, update);
      
      if (callbacksRef.current.onMessageStatus) callbacksRef.current.onMessageStatus(update);
    });
    
    socket.on('message_updated', (message: MessageType) => {
      console.log(`[Socket ${instanceId.current}] Mensaje actualizado:`, message);
    });
    
    socket.on('typing_status', (status: TypingStatusType) => {
      if (callbacksRef.current.onTypingStatus) callbacksRef.current.onTypingStatus(status);
    });
    
    socket.on('message_read', (data: { messageId: string; conversationId?: string; readBy?: string }) => {
      console.log(`[Socket ${instanceId.current}] Mensaje marcado como leído:`, data);
      
      if (callbacksRef.current.onMessageRead) callbacksRef.current.onMessageRead(data);
    });
    
    console.log(`[Socket ${instanceId.current}] Eventos de socket configurados`);
  }, [identifyUser]);

  // Initialize socket connection
  useEffect(() => {
    // Si no hay userId, no intentamos conectar
    if (!userId) return;
    
    // Si ya hay una conexión global con el mismo userId, la reutilizamos
    if (globalSocket && globalSocketUserId === userId) {
      console.log(`[Socket ${instanceId.current}] Reutilizando conexión global existente`);
      socketRef.current = globalSocket;
      setupEventHandlers();
      return;
    }
    
    // Prevenir conexiones simultáneas
    if (connectionAttemptInProgress) {
      console.log(`[Socket ${instanceId.current}] Conexión en progreso, esperando...`);
      const checkInterval = setInterval(() => {
        if (!connectionAttemptInProgress && globalSocket && globalSocketUserId === userId) {
          clearInterval(checkInterval);
          console.log(`[Socket ${instanceId.current}] Usando conexión recién establecida`);
          socketRef.current = globalSocket;
          setupEventHandlers();
        }
      }, 100);
      
      // Tiempo máximo de espera de 3 segundos
      setTimeout(() => {
        clearInterval(checkInterval);
      }, 3000);
      
      return;
    }
    
    // Si hay una conexión global con otro userId, la desconectamos
    if (globalSocket && globalSocketUserId !== userId) {
      console.log(`[Socket ${instanceId.current}] Desconectando socket de usuario anterior:`, globalSocketUserId);
      globalSocket.disconnect();
      globalSocket = null;
      globalSocketUserId = null;
    }
    
    connectionAttemptInProgress = true;
    console.log(`[Socket ${instanceId.current}] Iniciando nueva conexión socket para usuario:`, userId);
    
    // Create new socket connection
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: {
        userId: userId
      }
    });
    
    // Update refs and globals
    socketRef.current = newSocket;
    globalSocket = newSocket;
    globalSocketUserId = userId;
    
    // Set up socket event handlers
    setupEventHandlers();
    
    // Start inactivity timer
    resetInactivityTimer();
    
    connectionAttemptInProgress = false;
    
    // Cleanup on unmount
    return () => {
      console.log(`[Socket ${instanceId.current}] Componente desmontado, manteniendo conexión global`);
      
      // Note: we don't disconnect because we want to keep
      // the global socket alive for other components
      
      // Clear inactivity timeout
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
    };
  }, [userId, setupEventHandlers]);
  
  // Functions to interact with the socket
  const sendMessage = useCallback((message: Omit<MessageType, 'createdAt'>) => {
    if (!socketRef.current || !connected) {
      console.error(`[Socket ${instanceId.current}] No se puede enviar mensaje: socket no conectado`);
      return false;
    }
    
    resetInactivityTimer();
    console.log(`[Socket ${instanceId.current}] Enviando mensaje:`, message);
    socketRef.current.emit('send_message', message);
    return true;
  }, [connected]);
  
  const updateTypingStatus = useCallback(({ conversationId, isTyping }: { conversationId?: string; isTyping: boolean }) => {
    if (!socketRef.current || !connected) {
      return false;
    }
    
    resetInactivityTimer();
    socketRef.current.emit('typing', { conversationId, isTyping });
    return true;
  }, [connected]);
  
  const markMessageAsRead = useCallback(({ messageId, conversationId }: { messageId: string, conversationId?: string }) => {
    if (!socketRef.current || !connected) {
      console.error(`[Socket ${instanceId.current}] No se puede marcar mensaje como leído: socket no conectado`);
      return false;
    }
    
    resetInactivityTimer();
    console.log(`[Socket ${instanceId.current}] Marcando mensaje como leído:`, messageId);
    socketRef.current.emit('mark_read', { messageId, conversationId });
    return true;
  }, [connected]);
  
  const joinConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !connected) {
      console.error(`[Socket ${instanceId.current}] No se puede unir a la conversación: socket no conectado`);
      return false;
    }
    
    resetInactivityTimer();
    console.log(`[Socket ${instanceId.current}] Uniéndose a la conversación:`, conversationId);
    socketRef.current.emit('join_conversation', { conversationId });
    return true;
  }, [connected]);
  
  const leaveConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !connected) {
      return false;
    }
    
    resetInactivityTimer();
    socketRef.current.emit('leave_conversation', { conversationId });
    return true;
  }, [connected]);
  
  // Expose functions to reset inactivity timer when user performs actions
  const resetTimeout = useCallback(() => {
    resetInactivityTimer();
  }, []);
  
  // Export the socket and associated functions
  return {
    socket: socketRef.current,
    connected,
    error,
    onlineUsers,
    sendMessage,
    updateTypingStatus,
    markMessageAsRead,
    joinConversation,
    leaveConversation,
    resetTimeout,
  };
}
