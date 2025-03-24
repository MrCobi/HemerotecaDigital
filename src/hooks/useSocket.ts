import { useEffect, useRef, useState, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';

// El puerto debe coincidir con el del servidor Socket.io
const SOCKET_SERVER_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

// Variable global para mantener una única instancia del socket
let globalSocket: Socket | null = null;
let globalSocketUserId: string | null = null;
let connectionAttemptInProgress = false;
let socketInitCount = 0;
let heartbeatInterval: NodeJS.Timeout | null = null;

// Función para mantener viva la conexión
const startHeartbeat = (socket: Socket) => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }
  
  // Enviar un heartbeat cada 20 segundos para mantener la conexión viva
  heartbeatInterval = setInterval(() => {
    if (socket && socket.connected) {
      socket.emit('heartbeat', { timestamp: Date.now() });
    } else {
      // Si el socket está desconectado, detener el heartbeat
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
        heartbeatInterval = null;
      }
    }
  }, 20000); // 20 segundos
};

// Función para detener el heartbeat
const stopHeartbeat = () => {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }
};

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

  // Estado de actividad del usuario
  const [isActive, setIsActive] = useState(true);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const activeConversations = useRef<Set<string>>(new Set());
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 segundos inicial
  
  // Función para reiniciar el temporizador de inactividad
  const resetInactivityTimer = useCallback(() => {
    // Si no hay usuario logueado, no iniciar temporizador
    if (!userId) return;
    
    // Limpiar temporizador existente
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    
    // El usuario está activo
    setIsActive(true);
    
    // Iniciar nuevo temporizador
    inactivityTimeout.current = setTimeout(() => {
      setIsActive(false);
      // No desconectamos automáticamente, solo marcamos como inactivo
    }, 1800000); // 30 minutos
  }, [userId]);

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
    socket.off('reconnect_error');
    socket.off('force_disconnect');
    socket.off('reidentify');
    socket.off('pong');
    socket.off('users_online');
    socket.off('new_message');
    socket.off('typing_status');
    socket.off('message_status');
    socket.off('message_read');

    socket.on('connect', () => {
      console.log(`[Socket ${instanceId.current}] Socket.io conectado con ID: ${socket.id}`);
      setConnected(true);
      resetInactivityTimer();
      reconnectAttempts.current = 0; // Resetear intentos de reconexión cuando se conecta

      // Iniciar el heartbeat para mantener la conexión viva
      startHeartbeat(socket);
      
      // Identificar al usuario cuando la conexión se establezca
      identifyUser();
      
      if (callbacksRef.current.onConnect) callbacksRef.current.onConnect();
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket ${instanceId.current}] Socket.io desconectado. Razón: ${reason}`);
      setConnected(false);
      stopHeartbeat();

      // Si es el usuario actual, intentar reconectar
      if (userId === globalSocketUserId) {
        // Intentar reconectar solo si hay un usuario y el componente está activo
        if (userId && isActive) {
          handleReconnect();
        }
      }

      if (callbacksRef.current.onDisconnect) callbacksRef.current.onDisconnect();
    });

    socket.on('connect_error', (e) => {
      console.error(`[Socket ${instanceId.current}] Error de conexión Socket.io:`, e);
      setConnected(false);
      setError(e);
      stopHeartbeat();
      
      // Intentar reconectar con retraso incremental si hay un usuario y el componente está activo
      if (userId && isActive) {
        handleReconnect();
      }

      if (callbacksRef.current.onError) callbacksRef.current.onError(e);
    });

    // Respuesta a ping para mantener la conexión
    socket.on('pong', ({ timestamp }) => {
      const latency = Date.now() - timestamp;
      console.log(`[Socket ${instanceId.current}] Pong recibido. Latencia: ${latency}ms`);
      
      // Reiniciar temporizador de inactividad en cada pong
      resetInactivityTimer();
    });
    
    // Respuesta a heartbeat
    socket.on('heartbeat_ack', () => {
      // Registro opcional para depuración
      // console.log(`[Socket ${instanceId.current}] Heartbeat ACK recibido`);
      resetInactivityTimer();
    });

    // Application events
    socket.on('users_online', (users: UserType[]) => {
      setOnlineUsers(users);
      resetInactivityTimer();

      if (callbacksRef.current.onUserOnline) callbacksRef.current.onUserOnline(users);
    });

    socket.on('new_message', (message: MessageType) => {
      const shouldProcess = message.receiverId === userId ||
        (message.conversationId && activeConversations.current.has(message.conversationId));
      
      // Reiniciar temporizador al recibir un mensaje
      resetInactivityTimer();

      if (shouldProcess && callbacksRef.current.onNewMessage) {
        callbacksRef.current.onNewMessage(message);
      }
    });
  }, [identifyUser, userId]);

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

  // Manejar reconexión con backoff exponencial
  const handleReconnect = useCallback(() => {
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
    }
    
    if (reconnectAttempts.current >= maxReconnectAttempts) {
      console.log(`[Socket] Máximo número de intentos de reconexión alcanzado (${maxReconnectAttempts})`);
      return;
    }
    
    // Calcular delay de reconexión con backoff exponencial
    const delay = reconnectDelay * Math.pow(1.5, reconnectAttempts.current);
    
    console.log(`[Socket] Intentando reconectar en ${delay}ms (intento ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);
    
    reconnectTimeout.current = setTimeout(() => {
      reconnectAttempts.current++;
      
      // Intentar reconexión solo si el usuario sigue en la página de chat
      if (isActive && userId) {
        initSocket();
      }
    }, delay);
  }, [userId, isActive]);

  const initSocket = useCallback(() => {
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

    connectionAttemptInProgress = false;
  }, [userId, setupEventHandlers]);

  // Actualiza el estado de actividad del usuario
  const setUserActive = useCallback((active: boolean) => {
    setIsActive(active);
    
    // Si el usuario vuelve a estar activo pero el socket está desconectado, reconectar
    if (active && !connected && userId) {
      console.log('[Socket] Usuario activo de nuevo, reconectando socket...');
      initSocket();
    }
  }, [connected, userId]);

  // Reiniciar manualmente el socket
  const reconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    reconnectAttempts.current = 0;
    initSocket();
  }, []);

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

  const markMessageAsRead = useCallback(({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
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
    if (!socketRef.current || !connected || !userId) {
      console.warn('No se puede unir a la conversación: socket no conectado o userId no definido');
      return;
    }
    
    console.log(`Uniéndose a la conversación: ${conversationId}`);
    
    // Solo enviamos el conversationId, el servidor obtendrá el userId del socket
    socketRef.current.emit('join_conversation', { conversationId });
    activeConversations.current.add(conversationId);
    return true;
  }, [connected, userId]);

  const leaveConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !connected) {
      return;
    }
    
    // Solo enviamos el conversationId, el servidor obtendrá el userId del socket
    socketRef.current.emit('leave_conversation', { conversationId });
    activeConversations.current.delete(conversationId);
    return true;
  }, [connected]);

  // Expose functions to reset inactivity timer when user performs actions
  const resetTimeout = useCallback(() => {
    resetInactivityTimer();
  }, []);

  // Cleanups on unmount
  useEffect(() => {
    return () => {
      // Limpiar timeouts
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
      
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }
      
      // Detener el heartbeat
      stopHeartbeat();
      
      // Si este componente creó el socket global, limpiarlo al desmontar
      if (socketRef.current === globalSocket && userId === globalSocketUserId) {
        console.log(`[Socket ${instanceId.current}] Limpiando socket global en desmontaje.`);
        
        // No desconectar inmediatamente, dar tiempo a que otras instancias tomen el control
        setTimeout(() => {
          if (globalSocketUserId === userId) {
            console.log(`[Socket] Desconectando socket global para ${userId} porque nadie más lo está usando`);
            if (globalSocket) {
              globalSocket.disconnect();
              globalSocket = null;
              globalSocketUserId = null;
            }
          }
        }, 1000);
      }
    };
  }, [userId]);

  return {
    socketInstance: socketRef.current,
    connected,
    error,
    onlineUsers,
    // Funciones expuestas
    sendMessage: (message: MessageType) => {
      if (socketRef.current && connected) {
        resetInactivityTimer();
        socketRef.current.emit('message', message);
      } else if (userId && !connected) {
        // Si el socket está desconectado pero deberíamos estar conectados, reconectar
        reconnectSocket();
        // Almacenar el mensaje para enviarlo cuando el socket se reconecte
        // Esto podría ser una mejora futura
      }
    },
    updateTypingStatus: (status: TypingStatusType) => {
      if (socketRef.current && connected) {
        resetInactivityTimer();
        socketRef.current.emit('typing_status', status);
      }
    },
    markMessageAsRead: (data: { messageId: string; conversationId?: string }) => {
      if (socketRef.current && connected) {
        resetInactivityTimer();
        socketRef.current.emit('mark_message_read', data);
      }
    },
    joinConversation: (conversationId: string) => {
      if (socketRef.current && connected && conversationId) {
        resetInactivityTimer();
        console.log(`[Socket ${instanceId.current}] Uniendo a la conversación: ${conversationId}`);
        activeConversations.current.add(conversationId);
        socketRef.current.emit('join_conversation', { conversationId });
      }
    },
    leaveConversation: (conversationId: string) => {
      if (socketRef.current && connected && conversationId) {
        console.log(`[Socket ${instanceId.current}] Saliendo de la conversación: ${conversationId}`);
        activeConversations.current.delete(conversationId);
        socketRef.current.emit('leave_conversation', { conversationId });
      }
    },
    reconnect: reconnectSocket,
    setActive: setUserActive
  };
}
