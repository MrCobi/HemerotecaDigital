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
const getPendingMessages = (): Record<string, unknown>[] => {
  // No se almacenan mensajes pendientes, siempre retorna array vacío
  return [];
};

// Función para limpiar todos los mensajes pendientes
const clearAllPendingMessages = () => {
  // No hay necesidad de hacer nada ya que no se almacenan mensajes
  console.log('[Socket] No hay mensajes pendientes que limpiar (desactivado)');
};

// Función para limpiar mensajes de una conversación específica
const clearConversationPendingMessages = (_conversationId: string) => {
  // No hay necesidad de hacer nada ya que no se almacenan mensajes
  console.log(`[Socket] No hay mensajes pendientes que limpiar para la conversación (desactivado)`);
};

const _storePendingMessage = (_message: Record<string, unknown>) => {
  // No se almacenan mensajes pendientes
  console.log('[Socket] Almacenamiento de mensajes desactivado, no se guardará el mensaje pendiente');
};

const removePendingMessage = (_messageId: string) => {
  // No hay necesidad de hacer nada ya que no se almacenan mensajes
  console.log(`[Socket] No hay mensajes pendientes que eliminar (desactivado)`);
};

// Función para limpiar mensajes pendientes antiguos
const _clearOldPendingMessages = () => {
  // No hay necesidad de hacer nada ya que no se almacenan mensajes
  console.log('[Socket] No hay mensajes antiguos que limpiar (desactivado)');
};

// Define the MessageType interface for type safety
export interface MessageType {
  id?: string;
  tempId: string;
  content: string | null;
  senderId: string;
  receiverId?: string;
  conversationId?: string;
  createdAt: string;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  read?: boolean;
  // Extension property for retry tracking that's not part of the server model
  _retryAttempt?: number;
}

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

// Helper function to get message status with type safety
function getMessageStatus(message: Record<string, unknown>): MessageType['status'] | undefined {
  const status = message.status as string | undefined;
  if (status === "sending" || 
      status === "sent" || 
      status === "delivered" || 
      status === "read" || 
      status === "failed") {
    return status;
  }
  return undefined;
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

  // Estado de conexión
  const [connected, setConnected] = useState(false);
  const [_initialized, _setInitialized] = useState(false);
  const [_error, _setError] = useState<Error | unknown>(null);
  const [_onlineUsers, _setOnlineUsers] = useState<UserType[]>([]);
  
  // Use a properly typed ref for the socket that points to the global instance
  const socketRef = useRef<Socket | null>(null);
  const instanceId = useRef<number>(++socketInitCount);
  const hasInitSocket = useRef<boolean>(false); // Nueva ref para controlar la inicialización una sola vez
  
  // Refs para callbacks y estado interno
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
  
  // Registro de mensajes procesados para evitar duplicados
  const recentlyProcessedMessages = useRef<Set<string>>(new Set());
  const activeConversations = useRef<Set<string>>(new Set());
  
  // Función para evitar procesamiento de mensajes duplicados - MEJORADO
  const shouldProcessMessageOnce = useCallback((messageId: string) => {
    if (!messageId) return true; // Si no hay ID, procesarlo (mensajes temporales)
    
    // Si ya procesamos este mensaje recientemente, ignorarlo
    if (recentlyProcessedMessages.current.has(messageId)) {
      console.log(`[Socket] Mensaje ${messageId} ya procesado, ignorando duplicado`);
      return false;
    }
    
    // Añadir a los mensajes procesados
    recentlyProcessedMessages.current.add(messageId);
    
    // Limitar el tamaño del conjunto para evitar crecimiento indefinido
    if (recentlyProcessedMessages.current.size > 200) { // Aumentado de 100 a 200 para mayor seguridad
      // Eliminar los mensajes más antiguos (primeros añadidos)
      const oldMessages = Array.from(recentlyProcessedMessages.current).slice(0, 50);
      oldMessages.forEach(msgId => recentlyProcessedMessages.current.delete(msgId));
    }
    
    return true;
  }, []);

  // Estado para mensajes en proceso de envío
  const [_messagesInFlight, setMessagesInFlight] = useState<Record<string, boolean>>({});
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
  const [isActive, _setIsActive] = useState(true);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  
  // Resetear timer de inactividad sin usar setState
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    
    // Al comenzar, marcamos como activos sin usar setState
    if (isActive && userId && socketRef.current) {
      socketRef.current.emit('user_active', { active: true });
    }
    
    // Configurar nuevo timer sin usar setState
    inactivityTimeout.current = setTimeout(() => {
      // Solo hacemos algo si aún hay una conexión socket
      if (socketRef.current?.connected && userId) {
        console.log('Usuario inactivo por 60 segundos');
        // Enviar evento de inactividad sin cambiar estado
        socketRef.current.emit('user_active', { active: false });
      }
    }, 60000); // 60 segundos de inactividad
  }, [isActive, userId]);

  // Define the function implementation to process pending messages
  function processPendingMessagesImpl(socketRef: React.MutableRefObject<Socket | null>, connected: boolean, userId: string | null) {
    if (!socketRef.current || !connected) return;
    
    // Obtener mensajes pendientes
    const pendingMessages = getPendingMessages();
    
    if (pendingMessages.length > 0) {
      console.log(`[Socket] Procesando ${pendingMessages.length} mensajes pendientes...`);
      
      // Procesar mensajes con un retraso para evitar saturación
      setTimeout(() => {
        pendingMessages.forEach((message, index) => {
          setTimeout(() => {
            if (socketRef.current && socketRef.current.connected) {
              // Solo reenviar si el socket aún está conectado
              const conversationId = message.conversationId as string | undefined;
              const senderId = message.senderId as string | undefined;
              
              if (conversationId && senderId) {
                console.log(`[Socket] Reenviando mensaje pendiente:`, message);
                
                // Crear un objeto de mensaje compatible con MessageType
                const typedMessage: MessageType = {
                  id: message.id as string | undefined,
                  tempId: (message.tempId as string) || `temp-${Date.now()}-${index}`,
                  content: (message.content as string) || "",
                  senderId: (message.senderId as string) || userId || "",
                  conversationId: message.conversationId as string | undefined,
                  receiverId: message.receiverId as string | undefined,
                  createdAt: (message.createdAt as string) || new Date().toISOString(),
                  status: getMessageStatus(message) || "sending",
                  _retryAttempt: (((message._retryAttempt as number) || 0) + 1)
                };
                
                // Limitar los reintentos
                const retryAttempt = typedMessage._retryAttempt || 0;
                if (retryAttempt <= 3) {
                  socketRef.current.emit('send_message', typedMessage);
                } else {
                  console.log(`[Socket] Demasiados intentos de reenvío para el mensaje:`, typedMessage);
                  // Opcionalmente, eliminar del almacenamiento
                  if (typedMessage.tempId) {
                    removePendingMessage(typedMessage.tempId);
                  }
                }
              } else {
                console.log(`[Socket] Mensaje pendiente no reenviado automáticamente:`, message);
              }
            }
          }, index * 500); // 500ms entre mensajes para no saturar
        });
      }, 1000); // Esperar 1 segundo después de la conexión para empezar a enviar
    }
  };

  // Usar una referencia para la función processPendingMessages
  const processPendingMessages = useCallback(() => {
    processPendingMessagesImpl(socketRef, connected, userId || null);
  }, [connected, userId]); 

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
        
        // Unirse a todas las conversaciones activas después de reconectar
        if (activeConversations.current.size > 0) {
          console.log(`[Socket] Reconectando a ${activeConversations.current.size} conversaciones activas`);
          
          // Dar tiempo para que la conexión se establezca completamente antes de unirse a salas
          setTimeout(() => {
            activeConversations.current.forEach(conversationId => {
              socket.emit('join_conversation', { conversationId, userId });
              console.log(`[Socket] Reconectado a conversación: ${conversationId}`);
            });
          }, 500);
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
      console.log(`[Socket] Mensaje nuevo recibido:`, message);
      
      // Verificar si el mensaje tiene un ID
      if (!message.id) {
        console.log(`[Socket] Mensaje sin ID, generando uno temporal para rastreo`);
        message.id = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Almacenar el ID del mensaje para evitar procesar duplicados
      const messageId = message.id;
      
      // Verificar si el mensaje pertenece a una conversación activa
      const shouldProcessMessage = 
        message.receiverId === userId || 
        (message.conversationId && activeConversations.current.has(message.conversationId)) ||
        // También procesar mensajes de salas a las que pertenecemos aunque no los tengamos en activeConversations
        (message.conversationId && (message.conversationId.startsWith('conv_') || message.conversationId.startsWith('group_')));
      
      // Verificar si es un mensaje duplicado - SOLUCIÓN MEJORADA
      const isDuplicate = !shouldProcessMessageOnce(messageId);
      
      if (shouldProcessMessage && !isDuplicate && callbacksRef.current.onNewMessage) {
        console.log(`[Socket] Procesando nuevo mensaje para UI:`, messageId);
        
        // Añadir protección adicional contra duplicados
        // Por si el shouldProcessMessageOnce no fue efectivo
        callbacksRef.current.onNewMessage(message);
      } else {
        if (isDuplicate) {
          console.log(`[Socket] Mensaje duplicado ignorado (ID: ${messageId})`);
        } else if (!shouldProcessMessage) {
          console.log(`[Socket] Mensaje no pertenece a una conversación activa:`, message.conversationId);
        } else {
          console.log(`[Socket] No hay callback para procesar el mensaje`);
        }
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
  }, [processPendingMessages, userId, username, shouldProcessMessageOnce]); // Agregando shouldProcessMessageOnce como dependencia

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
      
      // Procesar mensajes pendientes
      processPendingMessages();
      
      if (callbacksRef.current.onConnect) {
        callbacksRef.current.onConnect();
      }
      
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
  }, [userId, setupEventHandlers, processPendingMessages]); // Agregando processPendingMessages como dependencia

  // Manejar reconexión con backoff exponencial
  const _handleReconnect = useCallback(() => {
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
    
    reconnectAttempts.current++;
    
    // Programar próximo intento
    reconnectTimeout.current = setTimeout(() => {
      if (isActive) {
        initSocket();
      }
    }, delay);
  }, [isActive, initSocket]);

  // Función para unirse a una conversación (sala de chat)
  const joinConversation = useCallback((conversationId: string) => {
    if (!connected || !socketRef.current || !userId || !conversationId) {
      console.warn(`[Socket] No se puede unir a la conversación: socket no conectado o faltan datos`);
      return false;
    }
    
    console.log(`[Socket] Solicitando unirse a la conversación: ${conversationId}`);
    
    // Enviar evento al servidor
    socketRef.current.emit('join_conversation', { conversationId, userId });
    
    return true;
  }, [connected, userId]); // Quitar shouldProcessMessageOnce como no es necesario

  // Función para salir de una conversación (sala de chat)
  const leaveConversation = useCallback((conversationId: string) => {
    if (!socketRef.current || !conversationId) return;
    
    console.log(`[Socket] Saliendo de la conversación: ${conversationId}`);
    
    // Emitir el evento para salir de la sala solo si está conectado
    if (socketRef.current.connected) {
      socketRef.current.emit('leave_conversation', { conversationId, userId });
    }
    
    // Eliminar de las conversaciones activas
    activeConversations.current.delete(conversationId);
    
    console.log(`[Socket] Fuera de la conversación: ${conversationId}, Restantes: ${activeConversations.current.size}`);
  }, [userId]);

  // Efecto principal para inicializar y limpiar el socket
  useEffect(() => {
    // Capturamos el valor actual de instanceId al inicio del efecto para usarlo en la limpieza
    const currentInstanceId = instanceId.current;

    // Si ya inicializamos el socket en esta instancia, no lo hacemos de nuevo
    if (hasInitSocket.current) {
      console.log(`[Socket ${currentInstanceId}] Socket ya inicializado en esta instancia, omitiendo nueva inicialización`);
      return;
    }

    // Verificar si tenemos lo necesario para inicializar la conexión
    if (!userId) {
      console.log(`[Socket ${currentInstanceId}] No se puede inicializar sin userId`);
      return;
    }

    console.log(`[Socket ${currentInstanceId}] Inicializando socket para userId: ${userId}`);
    hasInitSocket.current = true;
    
    // Función para limpieza global
    const cleanupSocket = () => {
      // Limpieza más robusta al desmontar el componente
      if (socketRef.current) {
        console.log(`[Socket ${currentInstanceId}] Limpiando recursos del socket...`);
        
        // Limpieza de timeouts
        if (inactivityTimeout.current) {
          clearTimeout(inactivityTimeout.current);
          inactivityTimeout.current = null;
        }
        
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
          reconnectTimeout.current = null;
        }
        
        // Limpieza de reintentos de mensajes
        Object.keys(messageRetryTimeouts.current).forEach(msgId => {
          clearTimeout(messageRetryTimeouts.current[msgId]);
          delete messageRetryTimeouts.current[msgId];
        });
        
        // Desconectar el socket actual
        stopHeartbeat();
        if (socketRef.current !== globalSocket) {
          // Solo desconectamos si no es el socket global
          socketRef.current.disconnect();
        }
        
        socketRef.current = null;
        setConnected(false);
      }
    };

    // Inicializar el socket (ahora fuera del setTimeout para mejorar respuesta inicial)
    initSocket();
    
    // Limpiar cuando el componente se desmonte
    return () => {
      console.log(`[Socket ${currentInstanceId}] Desmontando componente, limpiando recursos`);
      cleanupSocket();
    };
  }, [userId, initSocket]); // Solo dependemos de userId y la función initSocket

  // Efecto secundario para gestionar eventos de página y actividad del usuario
  useEffect(() => {
    if (!hasInitSocket.current || !socketRef.current) return;
    
    // Capturamos el ID de instancia actual para usarlo en las funciones dentro del efecto
    const currentInstanceId = instanceId.current;
    
    // Para evitar fugas de memoria, inicializamos los listeners solo una vez
    // y nos aseguramos de limpiarlos después
    const handleVisibilityChange = () => {
      const isPageVisible = document.visibilityState === 'visible';
      console.log(`[Socket ${currentInstanceId}] Cambio de visibilidad: ${isPageVisible ? 'visible' : 'oculto'}`);
      
      if (isPageVisible && socketRef.current) {
        // Reconectar solo si estamos desconectados
        if (!socketRef.current.connected && userId) {
          console.log(`[Socket ${currentInstanceId}] Página visible - intentando reconectar`);
          socketRef.current.connect();
        }
        
        // Reiniciar timer de inactividad
        resetInactivityTimer();
      }
    };
    
    // Handlers de interacción del usuario para rastrear actividad
    const userActivityHandler = () => {
      resetInactivityTimer();
    };
    
    // Agregar event listeners para estado de página y actividad
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('mousemove', userActivityHandler, { passive: true });
    document.addEventListener('keydown', userActivityHandler, { passive: true });
    document.addEventListener('click', userActivityHandler, { passive: true });
    document.addEventListener('touchstart', userActivityHandler, { passive: true });
    
    // Iniciar el timer de inactividad
    resetInactivityTimer();
    
    // Limpiar event listeners
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('mousemove', userActivityHandler);
      document.removeEventListener('keydown', userActivityHandler);
      document.removeEventListener('click', userActivityHandler);
      document.removeEventListener('touchstart', userActivityHandler);
      
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
        inactivityTimeout.current = null;
      }
    };
  }, [resetInactivityTimer, userId]);

  // Inicializar automáticamente cuando el componente se monta
  useEffect(() => {
    if (!userId) return;
    
    // Capturamos el ID de instancia al inicio del efecto
    const currentInstanceId = instanceId.current;
    
    console.log(`[Socket ${currentInstanceId}] Inicialización automática`);
    initSocket();
  }, [initSocket, userId]); // Removido instanceId de las dependencias ya que ahora capturamos su valor

  // Verificar conexión y mostrar mensajes pendientes cada vez que cambian las dependencias
  useEffect(() => {
    if (connected && userId) {
      processPendingMessages();
    }
  }, [connected, processPendingMessages, userId]);

  // Reconectar cuando el navegador vuelve a estar online
  useEffect(() => {
    const handleOnline = () => {
      console.log('[Socket] Navegador online, intentando reconectar...');
      if (socketRef.current && !socketRef.current.connected) {
        initSocket();
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [initSocket, userId]);

  // Prefixed with underscore since it's currently unused
  const _handleSocketError = useCallback((errorData: Error | unknown) => {
    console.error('[Socket] Error:', errorData);
    
    if (callbacksRef.current.onError) {
      callbacksRef.current.onError(errorData);
    }
  }, []);

  // Función para programar reintento de mensaje
  const scheduleMessageRetry = useCallback((message: MessageType, attempt: number = 0) => {
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
  const sendMessage = useCallback((message: Partial<MessageType>) => {
    if (!socketRef.current || !connected) {
      return false;
    }
    
    resetInactivityTimer();
    
    const messageWithId = {
      ...message,
      tempId: message.tempId || `temp-${Date.now()}`,
      senderId: message.senderId || userId,
      createdAt: message.createdAt || new Date().toISOString(),
      status: "sending"
    };
    
    socketRef.current.emit('send_message', messageWithId);
    
    // Programar reintento en caso de que no recibamos confirmación
    scheduleMessageRetry(messageWithId as MessageType);
    
    return true;
  }, [connected, scheduleMessageRetry, resetInactivityTimer, userId]);

  const updateTypingStatus = useCallback(({ conversationId, isTyping }: { conversationId?: string; isTyping: boolean }) => {
    if (!socketRef.current || !connected) {
      return false;
    }

    resetInactivityTimer();
    socketRef.current.emit('typing', { conversationId, isTyping });
    return true;
  }, [connected, resetInactivityTimer]);

  const markMessageAsRead = useCallback(async ({ messageId, conversationId }: { messageId: string, conversationId: string }) => {
    if (!socketRef.current || !connected) {
      console.error(`[Socket] No se puede marcar mensaje como leído: socket no conectado`);
      return false;
    }

    resetInactivityTimer();
    console.log(`[Socket] Marcando mensaje como leído:`, messageId);
    socketRef.current.emit('mark_read', { messageId, conversationId });
    return true;
  }, [connected, resetInactivityTimer]); // Quitar shouldProcessMessageOnce como no es necesario

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

  // Return the interface
  return {
    connected,
    error: _error,
    onlineUsers: _onlineUsers,
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
      remove: removePendingMessage,
      clearAll: clearAllPendingMessages,
      clearConversation: clearConversationPendingMessages
    }
  };
}
