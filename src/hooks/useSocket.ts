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
  
  const socketRef = useRef<Socket | null>(null);
  
  // Inicializar conexión de Socket.io
  useEffect(() => {
    if (!userId) return;
    
    // Crear instancia de Socket.io si no existe
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_SERVER_URL, {
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        autoConnect: true,
        transports: ['websocket', 'polling'],
        withCredentials: true,
        extraHeaders: {
          'Access-Control-Allow-Origin': window.location.origin
        }
      });
    }
    
    const socket = socketRef.current;
    
    // Eventos de conexión
    socket.on('connect', () => {
      console.log('Socket.io conectado exitosamente con ID:', socket.id);
      setConnected(true);
      setError(null);
      
      // Identificar al usuario
      if (userId && username) {
        console.log(`Identificando usuario: ${username} (${userId})`);
        socket.emit('identify', { userId, username });
      } else {
        console.error('No se puede identificar al usuario, falta ID o nombre');
      }
      
      if (onConnect) onConnect();
    });
    
    socket.on('connect_error', (error) => {
      console.error('Error de conexión Socket.io:', error);
      setConnected(false);
      setError(error);
      
      // Intentar reconectar con WebSocket solamente
      try {
        console.log('Cambiando a transporte WebSocket sólo');
        // Cerrar la conexión actual
        socket.disconnect();
        
        // Reconectar con websocket solamente
        setTimeout(() => {
          socket.io.opts = {
            ...socket.io.opts,
            transports: ['websocket']
          };
          socket.connect();
        }, 1000);
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
    
    // Eventos de mensajería
    socket.on('new_message', (message: MessageType) => {
      console.log('Recibido nuevo mensaje en useSocket:', message);
      
      // Asegurarse de que el mensaje tenga una fecha de creación válida
      if (!message.createdAt) {
        console.warn('Mensaje recibido sin fecha de creación, añadiendo fecha actual');
        message.createdAt = new Date().toISOString();
      } else if (typeof message.createdAt === 'object' && message.createdAt instanceof Date) {
        // Convertir objeto Date a string ISO para consistencia
        message.createdAt = message.createdAt.toISOString();
      } else if (typeof message.createdAt === 'string') {
        // Validar que la fecha sea un formato ISO válido
        try {
          const fecha = new Date(message.createdAt);
          if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
          message.createdAt = fecha.toISOString(); // Normalizar formato
        } catch {
          console.warn(`Fecha inválida en mensaje: ${message.createdAt}, reemplazando con fecha actual`);
          message.createdAt = new Date().toISOString();
        }
      }
      
      // Validar que el mensaje tenga un remitente y contenido
      if (!message.senderId) {
        console.error('Mensaje recibido sin ID de remitente, ignorando');
        return;
      }
      
      if (!message.content) {
        console.error('Mensaje recibido sin contenido, ignorando');
        return;
      }
      
      // Asegurar que el mensaje tenga un ID, sea temporal o real
      if (!message.id && !message.tempId) {
        console.warn('Mensaje sin ID ni tempId, generando uno temporal');
        message.tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      }
      
      // Log detallado para depuración
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
    
    socket.on('message_updated', (data: { tempId: string, realId: string, status: string }) => {
      console.log('Mensaje actualizado con ID real de base de datos:', data);
      
      // Emitir evento de actualización de estado del mensaje
      if (onMessageStatus) {
        onMessageStatus({
          messageId: data.tempId,
          status: data.status
        });
      } else {
        console.warn('No hay manejador onMessageStatus definido');
      }
    });
    
    socket.on('users_online', (users: UserType[]) => {
      console.log('Usuarios online:', users);
      setOnlineUsers(users);
      if (onUserOnline) onUserOnline(users);
    });
    
    socket.on('typing_status', (status: TypingStatusType) => {
      if (onTypingStatus) onTypingStatus(status);
    });
    
    socket.on('message_read', (data: { messageId: string; conversationId: string }) => {
      if (onMessageRead) onMessageRead(data);
    });
    
    socket.on('message_read_confirmed', (data: { messageId: string; conversationId: string }) => {
      console.log('Confirmación de lectura de mensaje:', data);
      // Puedes manejar la confirmación de lectura si es necesario
    });
    
    // Handle socket errors
    socket.on('error', (error) => {
      console.error('Socket.io error:', error);
      setError(error);
      if (onError) onError(error);
    });

    // Handle socket disconnect
    socket.on('disconnect', () => {
      console.log('Socket.io disconnected');
      setConnected(false);
      if (onDisconnect) onDisconnect();
    });

    // Handle connection error (this is different from regular errors)
    socket.on('connect_error', (error) => {
      console.error('Socket.io connection error:', error);
      setError(error);
      if (onError) onError(error);
    });
    
    // Conectar si no está conectado
    if (!socket.connected) {
      socket.connect();
    }
    
    // Limpieza al desmontar el componente
    return () => {
      socket.off('connect');
      socket.off('connect_error');
      socket.off('disconnect');
      socket.off('new_message');
      socket.off('message_status');
      socket.off('message_updated');
      socket.off('users_online');
      socket.off('typing_status');
      socket.off('message_read');
      socket.off('message_read_confirmed');
      socket.off('error');
    };
  }, [userId, username, onNewMessage, onUserOnline, onTypingStatus, onMessageStatus, onMessageRead, onConnect, onDisconnect, onError]);
  
  // Funciones para interactuar con Socket.io
  const sendMessage = (message: Omit<MessageType, 'status' | 'createdAt'>) => {
    if (!socketRef.current || !socketRef.current.connected) {
      console.error('No hay conexión con el servidor de chat. Estado del socket:', socketRef.current ? 'Instanciado' : 'Nulo');
      setError(new Error('No hay conexión con el servidor de chat'));
      return false;
    }
    
    try {
      // Asegurarse que el mensaje tenga toda la información necesaria
      if (!message.content) {
        console.error('Intento de enviar mensaje sin contenido');
        return false;
      }
      
      if (!message.senderId || !message.receiverId) {
        console.error('Intento de enviar mensaje sin emisor o receptor:', message);
        return false;
      }
      
      // Generar un ID temporal único si no existe
      const tempId = message.tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      
      // Crear mensaje mejorado con todos los campos necesarios
      const enhancedMessage = {
        ...message,
        tempId,
        id: message.id, // Mantener ID original si existe
        createdAt: new Date().toISOString(), // Usar string ISO para evitar problemas de serialización
        status: 'sending' as const
      };
      
      console.log('Enviando mensaje via Socket.io:', JSON.stringify(enhancedMessage, null, 2));
      
      // Primero emitir un evento para el propio remitente para actualizar UI inmediatamente
      if (onNewMessage) {
        console.log('Notificando localmente el mensaje enviado (UI inmediata)');
        onNewMessage({
          ...enhancedMessage,
          status: 'sending'
        });
      }
      
      // Luego enviar al servidor
      socketRef.current.emit('send_message', enhancedMessage);
      
      // Verificar estado del socket después de enviar
      setTimeout(() => {
        if (socketRef.current && socketRef.current.connected) {
          console.log('Socket sigue conectado después de enviar mensaje');
          
          // Actualizar estado a 'sent' después de un breve retraso
          // ya que es muy probable que el mensaje se haya enviado correctamente
          if (onMessageStatus) {
            onMessageStatus({
              messageId: tempId,
              status: 'sent'
            });
          }
        } else {
          console.error('Socket desconectado después de enviar mensaje');
          // Notificar error de envío
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
  
  return {
    socket: socketRef.current,
    connected,
    error,
    onlineUsers,
    sendMessage,
    setTypingStatus,
    markMessageAsRead,
    disconnect
  };
}
