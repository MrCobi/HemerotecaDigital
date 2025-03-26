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

// Funciones para mensajes pendientes
const getPendingMessages = (): Record<string, any>[] => {
  try {
    return JSON.parse(localStorage.getItem('pendingMessages') || '[]');
  } catch (error) {
    console.error('Error al recuperar mensajes pendientes:', error);
    return [];
  }
};

const storePendingMessage = (message: Record<string, any>) => {
  try {
    const pendingMessages = getPendingMessages();
    
    // Añadir timestamp para control de edad
    const messageWithTimestamp = {
      ...message,
      _queuedAt: Date.now(),
      _attempts: (message._attempts || 0) + 1
    };
    
    // No guardar más de 100 mensajes para evitar problemas de almacenamiento
    const updatedMessages = [messageWithTimestamp, ...pendingMessages.slice(0, 99)];
    localStorage.setItem('pendingMessages', JSON.stringify(updatedMessages));
  } catch (error) {
    console.error('Error al guardar mensaje pendiente:', error);
  }
};

const removePendingMessage = (messageId: string) => {
  try {
    const pendingMessages = getPendingMessages();
    const filteredMessages = pendingMessages.filter(
      (msg) => msg.id !== messageId && msg.tempId !== messageId
    );
    localStorage.setItem('pendingMessages', JSON.stringify(filteredMessages));
  } catch (error) {
    console.error('Error al eliminar mensaje pendiente:', error);
  }
};

const clearOldPendingMessages = () => {
  try {
    const pendingMessages = getPendingMessages();
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    
    // Eliminar mensajes con más de un día
    const freshMessages = pendingMessages.filter(
      (msg) => !msg._queuedAt || (now - msg._queuedAt < oneDayMs)
    );
    
    localStorage.setItem('pendingMessages', JSON.stringify(freshMessages));
  } catch (error) {
    console.error('Error al limpiar mensajes antiguos:', error);
  }
};

export type MessageType = {
  id?: string;
  tempId?: string;
  content: string | null;
  senderId: string;
  receiverId?: string;
  conversationId?: string;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
  createdAt: Date | string;
  read?: boolean;
  sender?: {
    id: string;
    username: string | null;
    name?: string | null;
    image?: string | null;
  };
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  retries?: number;
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

export type ReadReceiptType = {
  userId: string;
  conversationId: string;
  messageIds: string[];
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
};

interface UseSocketOptions {
  userId?: string;
  username?: string;
  onNewMessage?: (message: MessageType) => void;
  onUserOnline?: (users: UserType[]) => void;
  onTypingStatus?: (status: TypingStatusType) => void;
  onMessageStatus?: (status: { messageId: string; status: string }) => void;
  onMessageRead?: (data: ReadReceiptType) => void;
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

  // Estado para mensajes en proceso de envío
  const [messagesInFlight, setMessagesInFlight] = useState<Record<string, boolean>>({});
  const messageRetryTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  
  // Variables para la estrategia de backoff
  const maxRetries = 5;
  const initialRetryDelay = 1000; // 1 segundo
  const maxRetryDelay = 30000; // 30 segundos
  
  // Referencias para manejo de reintentos
  const reconnectAttempts = useRef<number>(0);
  const reconnectDelay = 1000; // ms
  const maxReconnectAttempts = 10;
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

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
  
  // Resetear timer de inactividad sin usar setState
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    
    // Al comenzar, marcamos como activos sin usar setState
    isActive && userId && socketRef.current?.emit('user_active', { active: true });
    
    // Configurar nuevo timer sin usar setState
    inactivityTimeout.current = setTimeout(() => {
      // Solo hacemos algo si aún hay una conexión socket
      if (socketRef.current?.connected && userId) {
        console.log('Usuario inactivo por 60 segundos');
        // Enviar evento de inactividad sin cambiar estado
        socketRef.current.emit('user_active', { active: false });
        
        // Al terminar, configuramos otro timer sin usar setState
        resetInactivityTimer();
      }
    }, 60000); // 60 segundos
  }, [userId, isActive]);

  // Configurar manejadores de eventos del socket
  const setupEventHandlers = useCallback(() => {
    if (!socketRef.current) return;
    
    const socket = socketRef.current;
    
    // Limpiamos listeners previos para evitar duplicados
    socket.off('connect');
    socket.off('disconnect');
    socket.off('connect_error');
    socket.off('reconnect_error');
    socket.off('new_message');
    socket.off('typing_status');
    socket.off('message_status');
    socket.off('message_read');
    socket.off('message_ack');
    
    socket.on('connect', () => {
      console.log(`[Socket] Conectado`);
      setConnected(true);
      
      // Si el usuario está identificado, enviamos datos
      if (userId) {
        console.log(`[Socket] Identificando usuario: ${userId}`);
        socket.emit('identify', { userId, username: username || 'Usuario' });
        
        // Iniciar heartbeat sin depender de actualizaciones de estado
        if (!heartbeatInterval) {
          startHeartbeat(socket);
        }
        
        // Procesar mensajes pendientes
        processPendingMessages();
      }
      
      // Llamar al callback sin depender de actualizaciones de estado
      if (callbacksRef.current.onConnect) {
        callbacksRef.current.onConnect();
      }
    });
    
    socket.on('disconnect', (reason) => {
      console.log(`[Socket] Desconectado: ${reason}`);
      setConnected(false);
      stopHeartbeat();
      
      // Llamar al callback sin depender de actualizaciones de estado
      if (callbacksRef.current.onDisconnect) {
        callbacksRef.current.onDisconnect();
      }
    });
    
    // Evento de mensaje nuevo - sin actualizar estados adicionales
    socket.on('new_message', (message: MessageType) => {
      const shouldProcessMessage = message.receiverId === userId || 
        (message.conversationId && activeConversations.current.has(message.conversationId));
      
      if (shouldProcessMessage && callbacksRef.current.onNewMessage) {
        callbacksRef.current.onNewMessage(message);
      }
    });
    
    // Nuevo evento para confirmación de mensaje
    socket.on('message_ack', (ack: { messageId: string, status: string, tempId?: string }) => {
      console.log(`[Socket] Confirmación de mensaje recibida:`, ack);
      
      // Eliminar el mensaje de pendientes
      if (ack.messageId) {
        removePendingMessage(ack.messageId);
      }
      
      // También eliminar usando tempId si está disponible
      if (ack.tempId) {
        removePendingMessage(ack.tempId);
      }
      
      // Actualizar estado de envío
      setMessagesInFlight(prev => {
        const newState = { ...prev };
        if (ack.messageId) delete newState[ack.messageId];
        if (ack.tempId) delete newState[ack.tempId];
        return newState;
      });
      
      // Cancelar cualquier reintento programado
      if (ack.messageId && messageRetryTimeouts.current[ack.messageId]) {
        clearTimeout(messageRetryTimeouts.current[ack.messageId]);
        delete messageRetryTimeouts.current[ack.messageId];
      }
      
      if (ack.tempId && messageRetryTimeouts.current[ack.tempId]) {
        clearTimeout(messageRetryTimeouts.current[ack.tempId]);
        delete messageRetryTimeouts.current[ack.tempId];
      }
      
      // Llamar al callback de status si existe
      if (callbacksRef.current.onMessageStatus) {
        callbacksRef.current.onMessageStatus(ack);
      }
    });
    
    // Resto de manejadores sin actualizar estados adicionales
    socket.on('typing_status', (status: TypingStatusType) => {
      if (callbacksRef.current.onTypingStatus) {
        callbacksRef.current.onTypingStatus(status);
      }
    });
    
    socket.on('message_status', (status: { messageId: string; status: string }) => {
      if (callbacksRef.current.onMessageStatus) {
        callbacksRef.current.onMessageStatus(status);
      }
    });
    
    socket.on('message_read', (data: ReadReceiptType) => {
      if (callbacksRef.current.onMessageRead) {
        callbacksRef.current.onMessageRead(data);
      }
    });
  }, [userId, username]);

  // Función para inicializar el socket
  const initSocket = useCallback(() => {
    // Si no hay userId, no intentamos conectar
    if (!userId) return;
    
    // Si ya hay una conexión global con el mismo userId, la reutilizamos
    if (globalSocket && globalSocketUserId === userId && globalSocket.connected) {
      console.log(`[Socket ${instanceId.current}] Reutilizando conexión global existente`);
      socketRef.current = globalSocket;
      setupEventHandlers();
      setConnected(true);
      return;
    }
    
    // Prevenir conexiones simultáneas
    if (connectionAttemptInProgress) {
      console.log('Ya hay un intento de conexión en progreso, esperando...');
      return;
    }
    
    connectionAttemptInProgress = true;
    
    // Cerrar cualquier socket previo si es de otro usuario
    if (globalSocket && globalSocketUserId !== userId) {
      console.log(`[Socket ${instanceId.current}] Cerrando conexión previa de otro usuario`);
      globalSocket.disconnect();
      globalSocket = null;
      globalSocketUserId = null;
    }
    
    // Crear nueva conexión
    console.log(`[Socket ${instanceId.current}] Creando nueva conexión para ${userId}`);
    const newSocket = io(SOCKET_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
      auth: { userId }
    });
    
    socketRef.current = newSocket;
    globalSocket = newSocket;
    globalSocketUserId = userId;
    
    setupEventHandlers();
    connectionAttemptInProgress = false;
    reconnectAttempts.current = 0;
  }, [userId, setupEventHandlers, instanceId]);

  // Procesar mensajes pendientes cuando se conecta
  const processPendingMessages = useCallback(() => {
    if (!socketRef.current || !connected || !userId) {
      console.log('[Socket] No se pueden procesar mensajes pendientes: socket desconectado');
      return;
    }
    
    console.log('[Socket] Procesando mensajes pendientes...');
    
    // Limpiar mensajes antiguos
    clearOldPendingMessages();
    
    // Obtener mensajes pendientes
    const pendingMessages = getPendingMessages();
    
    if (pendingMessages.length > 0) {
      console.log(`[Socket] Encontrados ${pendingMessages.length} mensajes pendientes`);
      
      // Enviar mensajes con un pequeño retraso entre ellos
      pendingMessages.forEach((message, index) => {
        setTimeout(() => {
          if (socketRef.current && socketRef.current.connected) {
            // Solo reenviar si el mensaje es del usuario actual
            if (message.senderId === userId) {
              console.log(`[Socket] Reenviando mensaje pendiente:`, message);
              socketRef.current.emit('send_message', message);
            }
          }
        }, index * 300); // 300ms entre mensajes para no saturar
      });
    }
  }, [connected, userId]);

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
  }, [userId, isActive, initSocket]);

  // Verificar conexión y mostrar mensajes pendientes cada vez que cambian las dependencias
  useEffect(() => {
    if (connected && userId) {
      processPendingMessages();
    }
  }, [connected, userId, processPendingMessages]);

  // Reconectar cuando el navegador vuelve a estar online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Socket] Navegador online, intentando reconectar...');
      if (userId && socketRef.current && !socketRef.current.connected) {
        initSocket();
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [userId, initSocket]);

  // Initialize socket connection
  useEffect(() => {
    if (!userId) return;
    
    console.log(`[Socket ${instanceId.current}] Inicializando socket para usuario ${userId}`);
    initSocket();
    
    // Escuchar eventos de actividad para reiniciar timer sin provocar rerenderizados
    const handleActivity = () => {
      // No usamos setState aquí, solo reiniciamos el timer si es necesario
      if (userId && socketRef.current && socketRef.current.connected) {
        resetInactivityTimer();
      }
    };
    
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('click', handleActivity);
    
    return () => {
      // Limpiar listeners de eventos
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('click', handleActivity);
      
      // Limpiar timers
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
        inactivityTimeout.current = null;
      }
      
      // No desconectamos el socket global para mantener la conexión
      console.log(`[Socket ${instanceId.current}] Componente desmontado, manteniendo conexión global`);
    };
  }, [userId, setupEventHandlers, resetInactivityTimer, initSocket, instanceId]);

  // Función para programar reintento de mensaje
  const scheduleMessageRetry = useCallback((message: any, attempt: number = 0) => {
    const messageId = message.id || message.tempId;
    if (!messageId) return;
    
    // No reintentar si ya supera el máximo de intentos
    if (attempt >= maxRetries) {
      console.log(`[Socket] Máximo número de reintentos alcanzado para mensaje: ${messageId}`);
      
      // Marcar como fallido pero mantener en pendientes por si se reconecta
      if (callbacksRef.current.onMessageStatus) {
        callbacksRef.current.onMessageStatus({
          messageId,
          status: 'failed'
        });
      }
      return;
    }
    
    // Calcular delay con backoff exponencial
    const delay = Math.min(initialRetryDelay * Math.pow(2, attempt), maxRetryDelay);
    
    console.log(`[Socket] Programando reintento ${attempt + 1}/${maxRetries} en ${delay}ms para mensaje: ${messageId}`);
    
    // Limpiar timeout anterior si existe
    if (messageRetryTimeouts.current[messageId]) {
      clearTimeout(messageRetryTimeouts.current[messageId]);
    }
    
    // Programar reintento
    messageRetryTimeouts.current[messageId] = setTimeout(() => {
      if (!socketRef.current || !connected) {
        console.log(`[Socket] No se puede reintentar: socket desconectado`);
        return;
      }
      
      console.log(`[Socket] Reintentando envío de mensaje: ${messageId}`);
      socketRef.current.emit('send_message', {
        ...message,
        _retryAttempt: attempt + 1
      });
      
      // Programar siguiente reintento
      scheduleMessageRetry(message, attempt + 1);
    }, delay);
  }, [connected, maxRetries]);

  // Funciones para interactuar con el socket
  const sendMessage = useCallback((message: Omit<MessageType, 'createdAt'>) => {
    // Asegurarse de que hay un id o tempId
    const messageWithId = {
      ...message,
      tempId: message.tempId || message.id || crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      status: 'sending'
    };
    
    const messageId = messageWithId.id || messageWithId.tempId;
    
    // Almacenar en pendientes antes de intentar enviar
    storePendingMessage(messageWithId);
    
    // Registrar que estamos intentando enviar este mensaje
    setMessagesInFlight(prev => ({
      ...prev,
      [messageId]: true
    }));
    
    if (!socketRef.current || !connected) {
      console.error(`[Socket] No se puede enviar mensaje: socket no conectado`);
      
      // Programar reintentos si no hay conexión
      scheduleMessageRetry(messageWithId);
      
      // Informar del estado
      if (callbacksRef.current.onMessageStatus) {
        callbacksRef.current.onMessageStatus({
          messageId,
          status: 'queued'
        });
      }
      
      return false;
    }

    resetInactivityTimer();
    console.log(`[Socket] Enviando mensaje:`, messageWithId);
    socketRef.current.emit('send_message', messageWithId);
    
    // Programar reintento en caso de que no recibamos confirmación
    scheduleMessageRetry(messageWithId);
    
    return true;
  }, [connected, scheduleMessageRetry, resetInactivityTimer]);

  const updateTypingStatus = useCallback(({ conversationId, isTyping }: { conversationId?: string; isTyping: boolean }) => {
    if (!socketRef.current || !connected) {
      return false;
    }

    resetInactivityTimer();
    socketRef.current.emit('typing', { conversationId, isTyping });
    return true;
  }, [connected, resetInactivityTimer]);

  const markMessageAsRead = useCallback(({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
    if (!socketRef.current || !connected) {
      console.error(`[Socket] No se puede marcar mensaje como leído: socket no conectado`);
      return false;
    }

    resetInactivityTimer();
    console.log(`[Socket] Marcando mensaje como leído:`, messageId);
    socketRef.current.emit('mark_read', { messageId, conversationId });
    return true;
  }, [connected, resetInactivityTimer]);

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
  }, [connected]);

  const setActive = useCallback((conversationId: string) => {
    if (!socketRef.current || !connected || !userId) {
      console.warn('No se puede establecer conversación como activa: socket no conectado o userId no definido');
      return false;
    }
    
    console.log(`Estableciendo como activa la conversación: ${conversationId}`);
    
    // Añadir a conversaciones activas
    activeConversations.current.add(conversationId);
    
    // Informar al servidor que esta es la conversación activa
    socketRef.current.emit('set_active_conversation', { conversationId });
    return true;
  }, [connected, userId]);

  // Función para forzar reconexión
  const reconnect = useCallback(() => {
    console.log('Forzando reconexión del socket');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    
    // Breve retraso para asegurar que el socket se ha desconectado
    setTimeout(() => {
      reconnectAttempts.current = 0;  // Resetear intentos
      initSocket();
    }, 500);
  }, [initSocket]);

  // Función para desconectar manualmente
  const disconnect = useCallback(() => {
    console.log('Desconectando socket manualmente');
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    stopHeartbeat();
  }, []);

  // Inicializar automáticamente cuando el componente se monta
  useEffect(() => {
    if (!userId) return;
    
    console.log(`[Socket ${instanceId.current}] Inicialización automática`);
    initSocket();
  }, [userId, initSocket, instanceId]);

  // Return the interface
  return {
    connected,
    error,
    onlineUsers,
    sendMessage,
    updateTypingStatus,
    markMessageAsRead,
    joinConversation,
    leaveConversation,
    setActive,
    reconnect,
    disconnect,
    socketInstance: socketRef.current,
    
    // Exponer funciones para mensajes pendientes
    pendingMessages: {
      get: getPendingMessages,
      process: processPendingMessages,
      remove: removePendingMessage
    }
  };
}
