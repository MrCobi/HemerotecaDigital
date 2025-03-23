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
  const timestamp = new Date().toISOString();
  console.log(`Servidor Socket.io escuchando en puerto ${SOCKET_PORT}`);
});
