// Servidor Socket.io para mensajería en tiempo real
import { createServer } from 'http';
import { Server } from 'socket.io';
import chalk from 'chalk';
import fetch from 'node-fetch';
import path from 'path';
import fs from 'fs';
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Express server para webhooks y API interna
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configuración de puerto y URL del socket
const SOCKET_PORT = process.env.SOCKET_PORT || 3001;

// Definir las rutas API para uso del servidor socket
const API_BASE_URL = 'http://localhost:3000';
const API_ROUTES = {
  messages: {
    socket: `${API_BASE_URL}/api/messages/socket`,
    conversation: `${API_BASE_URL}/api/messages/conversations`
  }
};

// Crear servidor HTTP y Socket.io
const server = createServer(app); // Use Express app with the HTTP server
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

// Webhook endpoint para recibir notificaciones de nuevos mensajes desde la API
app.post('/webhook/new-message', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader !== 'Socket-Internal-Auth-00123') {
    console.error('Acceso no autorizado al webhook');
    return res.status(401).json({ error: 'No autorizado' });
  }

  try {
    const message = req.body;
    console.log('Webhook recibió nuevo mensaje:', message);

    // Emitir mensaje al remitente
    const senderSocket = userSocketMap.get(message.senderId);
    if (senderSocket) {
      console.log(`Enviando mensaje a remitente ${message.senderId} en socket ${senderSocket}`);
      io.to(senderSocket).emit('new_message', message);
    }

    // Emitir mensaje al receptor
    if (message.receiverId) {
      const receiverSocket = userSocketMap.get(message.receiverId);
      if (receiverSocket) {
        console.log(`Enviando mensaje a receptor ${message.receiverId} en socket ${receiverSocket}`);
        io.to(receiverSocket).emit('new_message', message);
      }
    }

    // Emitir a la sala de conversación si existe
    if (message.conversationId) {
      const roomName = `conversation-${message.conversationId}`;
      console.log(`Emitiendo mensaje a la sala ${roomName}`);
      io.to(roomName).emit('new_message', message);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

const pingClients = () => {
  const currentTimestamp = Date.now();
  console.log(`Ping enviando a todos los clientes conectados...`);
  
  Object.keys(userSocketMap).forEach(userId => {
    const socketId = userSocketMap[userId];
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      // Solo enviar ping si el socket existe y está conectado
      if (socket.connected) {
        // Enviar ping y esperar respuesta
        socket.emit('ping', { timestamp: currentTimestamp });
        socket._lastPingTime = currentTimestamp;
        
        // Programar verificación de respuesta
        setTimeout(() => {
          // Si el socket todavía existe y no ha respondido al ping
          if (socket && socket.connected && socket._lastPingTime === currentTimestamp) {
            console.log(`No respuesta de ping para ${socketId} - Desconectando`);
            socket.disconnect(true);
          }
        }, 10000); // Esperar respuesta por 10 segundos en lugar de 5
      }
    }
  });
};

// Iniciar ping cada 60 segundos en lugar de 30
const pingInterval = setInterval(pingClients, 60000);

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  let currentUserId = null;
  
  console.log(chalk.green(`[${new Date().toISOString()}] Conexión establecida: ${socket.id}`));
  
  // Socket.io event handlers
  socket.on('disconnect', (reason) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Desconexión: ${socket.id}`);
    
    // Encontrar el userId asociado con este socket
    const userId = Object.keys(userSocketMap).find(uid => userSocketMap[uid] === socket.id);
    
    // Eliminar el socket de las listas y mapas
    if (userId) {
      console.log(`Usuario ${userId} desconectado correctamente`);
      
      // Eliminar de los mapas
      delete userSocketMap[userId];
      
      // Eliminar de los usuarios online
      const userIndex = Array.from(onlineUsers.values()).findIndex(u => u.userId === userId);
      if (userIndex !== -1) {
        onlineUsers.delete(socket.id);
      }
      
      // Emitir evento de usuarios conectados actualizado
      const userList = Array.from(onlineUsers.values());
      io.emit('users_online', userList);
    }
  });
  
  // Evento: Respuesta a ping
  socket.on('pong', ({ timestamp }) => {
    // Actualizar último tiempo de ping
    socket._lastPingTime = null;
    const latency = Date.now() - timestamp;
    console.log(`Pong recibido de ${socket.id}. Latencia: ${latency}ms`);
  });
  
  // Marcar como activo cuando recibimos un heartbeat
  socket.on('heartbeat', ({ timestamp }) => {
    // Responder con confirmación
    socket.emit('heartbeat_ack');
    // Actualizar último tiempo de actividad
    socket._lastActivityTime = Date.now();
  });

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
    
    // Unirse a conversaciones pendientes ahora que el usuario está identificado
    if (socket._pendingConversations && socket._pendingConversations.length > 0) {
      console.log(`Uniendo usuario ${userId} a ${socket._pendingConversations.length} conversaciones pendientes`);
      socket._pendingConversations.forEach(convId => {
        const roomName = `conversation-${convId}`;
        // Ya estamos unidos, solo actualizamos el registro
        console.log(`Usuario ${userId} ahora identificado en conversación ${convId}`);
      });
      // Limpiar lista de pendientes
      socket._pendingConversations = [];
    }
  });

  // Unirse a una sala de conversación
  socket.on('join_conversation', ({ conversationId }) => {
    // Obtener el userId del socket actual
    const userId = currentUserId || Object.keys(userSocketMap).find(uid => userSocketMap[uid] === socket.id);
    
    if (!conversationId) {
      console.error('Error: conversationId no especificado al unirse a la conversación');
      return;
    }
    
    const roomName = `conversation-${conversationId}`;
    
    // Unirse a la sala
    socket.join(roomName);
    
    // Registrar en log
    if (userId) {
      console.log(`Usuario ${userId} se unió a la conversación ${conversationId}`);
    } else {
      // Almacenar la conversación pendiente para unirse cuando el usuario se identifique
      socket._pendingConversations = socket._pendingConversations || [];
      if (!socket._pendingConversations.includes(conversationId)) {
        socket._pendingConversations.push(conversationId);
      }
      console.log(`Socket ${socket.id} se unió a la conversación ${conversationId} (usuario no identificado)`);
    }
    
    // Obtener lista de participantes activos en la sala
    const room = io.sockets.adapter.rooms.get(roomName);
    const participantCount = room ? room.size : 0;
    
    console.log(`Participantes activos en ${roomName}: ${participantCount}`);
  });

  // Salir de una sala de conversación
  socket.on('leave_conversation', ({ conversationId }) => {
    if (!conversationId) return;
    
    const roomName = `conversation-${conversationId}`;
    socket.leave(roomName);
    
    // Obtener el userId del socket actual
    const userId = Object.keys(userSocketMap).find(uid => userSocketMap[uid] === socket.id);
    
    if (userId) {
      console.log(`Usuario ${userId} salió de la conversación ${conversationId}`);
    } else {
      console.log(`Socket ${socket.id} salió de la conversación ${conversationId}`);
    }
  });

  // Evento: Enviar mensaje
  socket.on('send_message', async (message) => {
    try {
      console.log('Recibido mensaje para enviar:', message);
      const savedMessage = await prisma.directMessage.create({
        data: {
          content: message.content,
          senderId: message.senderId,
          receiverId: message.receiverId,
          conversationId: message.conversationId,
          messageType: message.messageType || 'text',
          mediaUrl: message.mediaUrl || null
        },
        include: { sender: true }
      });

      console.log('Mensaje guardado en la BD:', savedMessage);
      
      // Emitir al remitente
      socket.emit('new_message', savedMessage);
      console.log(`Mensaje emitido al remitente (${savedMessage.senderId})`);

      // Para el resto de usuarios, usar un enfoque de sala que evita duplicados
      if (savedMessage.conversationId) {
        const roomName = `conversation-${savedMessage.conversationId}`;
        console.log(`Emitiendo mensaje a la sala ${roomName} (excluyendo remitente)`);
        // Emit to conversation room, excluding the sender
        socket.to(roomName).emit('new_message', savedMessage);
      } 
      // Si no hay conversationId pero existe un receptor directo
      else if (savedMessage.receiverId) {
        const receiverSocket = userSocketMap.get(savedMessage.receiverId);
        if (receiverSocket) {
          console.log(`Enviando mensaje a receptor ${savedMessage.receiverId} en socket ${receiverSocket}`);
          io.to(receiverSocket).emit('new_message', savedMessage);
        } else {
          console.log(`Receptor ${savedMessage.receiverId} no está conectado`);
        }
      }
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
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
});

// Iniciar servidor
server.listen(SOCKET_PORT, () => {
  const timestamp = new Date().toISOString();
  console.log(`Servidor Socket.io escuchando en puerto ${SOCKET_PORT}`);
});
