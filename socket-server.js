// Servidor Socket.io para mensajería en tiempo real
import { createServer } from 'http';
import { Server } from 'socket.io';
import chalk from 'chalk';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';

// Definir las rutas API para uso del servidor socket
const API_BASE_URL = 'http://localhost:3000';
const API_ROUTES = {
  messages: {
    socket: `${API_BASE_URL}/api/messages/socket`,
    conversation: `${API_BASE_URL}/api/messages/conversations`
  }
};

// Configuración de puerto y URL del socket
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

// Crear servidor HTTP y Socket.io
const server = createServer();
const io = new Server(server, {
  cors: {
    origin: '*', // Permitir cualquier origen para desarrollo
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

// Mantener registro de usuarios conectados
const onlineUsers = new Map();
// Mapeo de userId a socketId para gestionar conexiones duplicadas
const userSocketMap = new Map();
// Mantener registro de usuarios en conversaciones activas
const activeConversations = new Map();

const PING_INTERVAL = 25000;
const PONG_TIMEOUT = 10000;

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  let currentUserId = null;
  let pingTimeout;
  
  console.log(chalk.green(`[${new Date().toISOString()}] Conexión establecida: ${socket.id}`));
  
  const heartbeat = () => {
    clearTimeout(pingTimeout);
    pingTimeout = setTimeout(() => {
      console.log(chalk.red(`[${new Date().toISOString()}] No respuesta de ping para ${socket.id} - Desconectando`));
      socket.disconnect();
    }, PONG_TIMEOUT);
  };

  socket.on('pong', heartbeat);
  
  const pingInterval = setInterval(() => {
    if (socket.connected) {
      socket.emit('ping');
      console.log(chalk.yellow(`[${new Date().toISOString()}] Ping enviado a: ${socket.id}`));
      heartbeat();
    }
  }, PING_INTERVAL);

  // Evento: Usuario se identifica
  socket.on('identify', ({ userId, username }) => {
    const existingEntry = Array.from(onlineUsers.values()).find(u => u.userId === userId);
    
    if (existingEntry) {
      io.to(existingEntry.socketId).emit('forceDisconnect', 'Nueva conexión detectada');
      onlineUsers.delete(existingEntry.socketId);
    }

    onlineUsers.set(socket.id, { socketId: socket.id, userId, username });
    userSocketMap.set(userId, socket.id);
    currentUserId = userId;
    
    // Emitir lista actualizada de usuarios conectados
    const userList = Array.from(onlineUsers.values());
    io.emit('users_online', userList);
    
    console.log(`Usuario identificado: ${username} (${userId})`);
    console.log('Lista actual de usuarios conectados:');
    Array.from(onlineUsers.entries()).forEach(([socketId, user]) => {
      console.log(`- Socket: ${socketId}, Usuario: ${user.userId}, Nombre: ${user.username}`);
    });
  });

  // Evento: Usuario se une a una conversación
  socket.on('join_conversation', ({ userId, conversationId }) => {
    // Unir al usuario a la sala de la conversación
    socket.join(`conversation-${conversationId}`);
    
    // Registrar en la lista de conversaciones activas
    if (!activeConversations.has(conversationId)) {
      activeConversations.set(conversationId, new Set());
    }
    activeConversations.get(conversationId).add(userId);
    
    console.log(`Usuario ${userId} se unió a la conversación ${conversationId}`);
    console.log(`Participantes activos: ${Array.from(activeConversations.get(conversationId)).join(', ')}`);
  });
  
  // Evento: Usuario abandona una conversación
  socket.on('leave_conversation', ({ userId, conversationId }) => {
    socket.leave(`conversation-${conversationId}`);
    
    // Actualizar la lista de conversaciones activas
    if (activeConversations.has(conversationId)) {
      activeConversations.get(conversationId).delete(userId);
      
      if (activeConversations.get(conversationId).size === 0) {
        activeConversations.delete(conversationId);
      }
    }
    
    console.log(`Usuario ${userId} abandonó la conversación ${conversationId}`);
  });

  // Evento: Enviar mensaje
  socket.on('send_message', async (message) => {
    console.log(`MENSAJE RECIBIDO DE SOCKET ${socket.id}:`);
    console.log(JSON.stringify(message, null, 2));
    
    // Normalizar el mensaje para asegurar un formato consistente
    const enhancedMessage = {
      ...message,
      timestamp: new Date(),
      status: 'sent',
      id: message.id || message.tempId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    // Si es mensaje de conversación, enviarlo a todos los participantes
    if (message.conversationId) {
      const roomName = `conversation-${message.conversationId}`;
      
      // IMPORTANTE: También enviar el mensaje de vuelta al remitente para que lo vea en su chat
      socket.emit('new_message', {
        ...enhancedMessage,
        createdAt: enhancedMessage.timestamp || new Date(),
        status: 'sent'
      });
      
      // Enviar a todos los demás participantes de la conversación
      socket.to(roomName).emit('new_message', {
        ...enhancedMessage,
        createdAt: enhancedMessage.timestamp || new Date(),
        status: 'delivered'
      });
      
      console.log(`Mensaje enviado a la conversación ${message.conversationId}`);
      
      // IMPORTANTE: Guardar el mensaje en la base de datos
      try {
        // Hacer una petición a la API para guardar el mensaje
        const response = await fetch(API_ROUTES.messages.socket, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Socket-Internal-Auth-00123' // Clave especial para autenticar peticiones desde el servidor socket
          },
          body: JSON.stringify({
            content: message.content,
            mediaUrl: message.mediaUrl || null,
            messageType: message.messageType || 'text',
            receiverId: message.receiverId,
            senderId: message.senderId || (message.sender && message.sender.id),
            conversationId: message.conversationId,
            tempId: message.tempId || message.id
          }),
        });
        
        if (!response.ok) {
          console.error('Error al guardar mensaje en DB vía API:', await response.text());
          
          // Notificar error al remitente
          socket.emit('message_status', {
            messageId: message.id || message.tempId,
            status: 'error'
          });
        } else {
          console.log('Mensaje guardado correctamente en base de datos');
          const savedMessage = await response.json();
          
          // Notificar actualización con el ID real de la base de datos a todos los participantes
          if (savedMessage && savedMessage.id) {
            io.to(roomName).emit('message_updated', {
              tempId: message.tempId || message.id,
              realId: savedMessage.id,
              status: 'saved'
            });
          }
        }
      } catch (error) {
        console.error('Error al guardar mensaje en base de datos:', error);
        // Notificar error al remitente
        socket.emit('message_status', {
          messageId: message.id || message.tempId,
          status: 'error'
        });
      }
    } 
    // Para compatibilidad con el sistema de mensajes directos anterior
    else if (message.receiverId) {
      // Encontrar el socket del destinatario por userId usando el mapa más eficiente
      const receiverSocketId = userSocketMap.get(message.receiverId);
      
      console.log(`Buscando socket para usuario con ID ${message.receiverId}...`);
      console.log(`Socket encontrado: ${receiverSocketId ? receiverSocketId : 'No encontrado'}`);
      
      // IMPORTANTE: Asegurar que el mensaje tenga una estructura consistente
      const finalMessage = {
        ...enhancedMessage,
        createdAt: enhancedMessage.timestamp || new Date(),
        status: 'sent'
      };
      
      // Enviar mensaje a remitente para que vea su propio mensaje
      socket.emit('new_message', {
        ...finalMessage,
        status: 'sent'
      });
      
      // Enviar mensaje al destinatario si está conectado
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('new_message', {
          ...finalMessage,
          status: 'delivered'
        });
      }
      
      // IMPORTANTE: Guardar el mensaje en la base de datos independientemente
      // de si el destinatario está conectado o no
      try {
        const response = await fetch(API_ROUTES.messages.socket, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Socket-Internal-Auth-00123'
          },
          body: JSON.stringify({
            content: message.content,
            mediaUrl: message.mediaUrl || null,
            messageType: message.messageType || 'text',
            receiverId: message.receiverId,
            senderId: message.senderId || (message.sender && message.sender.id),
            conversationId: message.conversationId,
            tempId: message.tempId || message.id
          }),
        });
        
        if (!response.ok) {
          console.error('Error al guardar mensaje directo en DB:', await response.text());
          socket.emit('message_status', {
            messageId: message.id || message.tempId,
            status: 'error'
          });
        } else {
          console.log('Mensaje directo guardado en base de datos');
          const savedMessage = await response.json();
          
          if (savedMessage && savedMessage.id) {
            socket.emit('message_updated', {
              tempId: message.tempId || message.id,
              realId: savedMessage.id,
              status: 'saved'
            });
            
            if (receiverSocketId) {
              io.to(receiverSocketId).emit('message_updated', {
                tempId: message.tempId || message.id,
                realId: savedMessage.id,
                status: 'saved'
              });
            }
          }
        }
      } catch (error) {
        console.error('Error al guardar mensaje directo:', error);
        socket.emit('message_status', {
          messageId: message.id || message.tempId,
          status: 'error'
        });
      }
    }
  });

  // Evento: Manejar typing para conversaciones
  socket.on('typing', ({ userId, receiverId, conversationId, isTyping }) => {
    if (conversationId) {
      const roomName = `conversation-${conversationId}`;
      socket.to(roomName).emit('typing_status', { userId, conversationId, isTyping });
    } else if (receiverId) {
      // Encontrar el socket del destinatario usando el mapa más eficiente
      const receiverSocketId = userSocketMap.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing_status', { userId, isTyping });
      }
    }
  });
  
  // Evento: Marcar mensaje como leído
  socket.on('read_message', async ({ messageId, conversationId, userId }) => {
    // Validar parámetros requeridos
    if (!messageId || !userId) {
      console.error('Error en read_message: Faltan parámetros obligatorios');
      return;
    }
    
    try {
      // Emitir evento de lectura a todos los participantes si es una conversación
      if (conversationId) {
        const roomName = `conversation-${conversationId}`;
        io.to(roomName).emit('message_read', { messageId, conversationId, readBy: userId });
      } else {
        // Buscar el remitente original del mensaje para notificarle
        // Aquí necesitaríamos consultar la BD para saber quién envió el mensaje
        console.log(`Mensaje ${messageId} marcado como leído por ${userId}`);
      }
      
      // Actualizar en base de datos
      // Este código debería ser expandido para hacer una llamada a la API
      console.log(`Marcando mensaje ${messageId} como leído por ${userId} en BD`);
    } catch (error) {
      console.error('Error al marcar mensaje como leído:', error);
    }
  });
  
  // Evento: Desconexión
  socket.on('disconnect', () => {
    clearInterval(pingInterval);
    clearTimeout(pingTimeout);
    console.log(chalk.blue(`[${new Date().toISOString()}] Desconexión: ${socket.id}`));
    
    if (currentUserId) {
      onlineUsers.delete(socket.id);
      userSocketMap.delete(currentUserId);
      console.log(`Usuario ${currentUserId} desconectado correctamente`);
      
      // Emitir lista actualizada
      const userList = Array.from(onlineUsers.values());
      io.emit('users_online', userList);
    } else {
      console.log(`Socket desconectado: ${socket.id} (Usuario desconocido)`);
    }
  });
});

// Iniciar servidor
server.listen(SOCKET_PORT, () => {
  console.log(`Servidor Socket.io escuchando en puerto ${SOCKET_PORT}`);
});
