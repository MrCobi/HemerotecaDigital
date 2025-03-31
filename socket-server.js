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
const API_BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
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

// Función para normalizar un ID de conversación
function normalizeConversationId(id) {
  if (!id) return '';
  return id.replace(/^(conv_|group_)/, '');
}

// Función para construir el nombre de sala a partir de un ID de conversación
function getConversationRoomName(conversationId) {
  const normalizedId = normalizeConversationId(conversationId);
  return `conversation-${normalizedId}`;
}

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  console.log(`[${new Date().toISOString()}] Conexión establecida: ${socket.id}`);
  
  let currentUserId = null;
  let currentUsername = null;
  
  // Ping para mantener las conexiones activas y verificar presencia
  setInterval(() => {
    if (currentUserId) {
      socket.emit('ping');
    }
  }, 30000);
  
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
      
      // Limpiar todas las conversaciones activas de este usuario
      if (socket._activeConversations) {
        socket._activeConversations.forEach(convId => {
          if (activeConversations.has(convId)) {
            activeConversations.get(convId).delete(userId);
            
            // Si la sala queda vacía, eliminarla
            if (activeConversations.get(convId).size === 0) {
              activeConversations.delete(convId);
            }
          }
        });
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

  // Identificar al usuario al conectarse
  socket.on('identify', async ({ userId, username }) => {
    try {
      // Validar los datos del usuario
      if (!userId) {
        console.error('Se intentó identificar sin proporcionar userId');
        socket.emit('error', { message: 'Se requiere userId para identificarse' });
        return;
      }
      
      currentUserId = userId;
      currentUsername = username || 'Usuario sin nombre';
      
      // Registrar el socket para este usuario
      userSocketMap.set(userId, socket.id);
      
      console.log(`Usuario identificado: ${username} (${userId})`);
      
      // Mostrar lista de usuarios conectados
      console.log('Lista actual de usuarios conectados:');
      for (const [uid, sid] of userSocketMap.entries()) {
        console.log(`- Socket: ${sid}, Usuario: ${uid}`);
      }
      
      // Unirse a la sala personal del usuario
      const personalRoom = `user_${userId}`;
      socket.join(personalRoom);
      
      // Unirse a conversaciones pendientes si existen
      if (socket._pendingConversations && socket._pendingConversations.length > 0) {
        console.log(`Uniendo a ${socket._pendingConversations.length} conversaciones pendientes`);
        
        for (const conversationId of socket._pendingConversations) {
          const roomName = getConversationRoomName(conversationId);
          socket.join(roomName);
          
          // Registrar participación
          const normalizedId = normalizeConversationId(conversationId);
          if (!activeConversations.has(normalizedId)) {
            activeConversations.set(normalizedId, new Set());
          }
          activeConversations.get(normalizedId).add(userId);
          
          console.log(`Usuario ${userId} se unió a conversación pendiente ${normalizedId} (sala: ${roomName})`);
        }
        
        // Limpiar conversaciones pendientes
        socket._pendingConversations = [];
      }
      
      // Notificar que el usuario está en línea
      socket.broadcast.emit('user_status', {
        userId,
        status: 'online',
        timestamp: new Date().toISOString()
      });
      
      // Enviar estado al usuario conectado
      socket.emit('connected', { userId });
      
    } catch (error) {
      console.error('Error al identificar usuario:', error);
      socket.emit('error', { message: 'Error al procesar la identificación' });
    }
  });

  // Unirse a una sala de conversación
  socket.on('join_conversation', async ({ conversationId }) => {
    // Obtener el userId del socket actual
    const userId = currentUserId || Object.keys(userSocketMap).find(uid => userSocketMap[uid] === socket.id);
    
    if (!conversationId) {
      console.error('Se intentó unir a una conversación sin ID');
      return;
    }
    
    if (!userId) {
      console.log(`Socket ${socket.id} intentó unirse a conversación ${conversationId} sin estar identificado`);
      // Almacenar para unirse cuando el usuario se identifique
      if (!socket._pendingConversations) {
        socket._pendingConversations = [];
      }
      socket._pendingConversations.push(conversationId);
      return;
    }
    
    // Normalizar el ID de conversación y crear nombre de sala
    const normalizedId = normalizeConversationId(conversationId);
    const roomName = getConversationRoomName(conversationId);
    
    // Verificar si ya está en la sala para evitar uniones duplicadas
    const rooms = Array.from(socket.rooms || []);
    if (rooms.includes(roomName)) {
      console.log(`Usuario ${userId} ya está en la sala ${roomName}`);
      return;
    }
    
    // Unirse a la sala socket.io
    socket.join(roomName);
    
    // Registrar la participación en la conversación
    if (!activeConversations.has(normalizedId)) {
      activeConversations.set(normalizedId, new Set());
    }
    activeConversations.get(normalizedId).add(userId);
    
    console.log(`Usuario ${userId} se unió a la conversación ${normalizedId} (sala: ${roomName})`);
    console.log(`Participantes actuales: ${Array.from(activeConversations.get(normalizedId)).join(', ')}`);
    
    // Almacenar las conversaciones activas de este socket para limpiarlas al desconectar
    if (!socket._activeConversations) {
      socket._activeConversations = new Set();
    }
    socket._activeConversations.add(normalizedId);
  });
  
  // Evento: Enviar mensaje
  socket.on('send_message', async (message) => {
    try {
      console.log('Recibido mensaje para enviar:', message);
      
      // Verificar si es un reintento (mensaje con tempId ya existente)
      let savedMessage;
      
      if (message.tempId) {
        // Buscar si el mensaje con este tempId ya existe
        const existingMessage = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { tempId: message.tempId },
              // También buscar por el id si está disponible
              ...(message.id ? [{ id: message.id }] : [])
            ]
          },
          include: { sender: true }
        });
        
        if (existingMessage) {
          console.log(`Se encontró mensaje existente con tempId: ${message.tempId}`);
          savedMessage = existingMessage;
        }
      }
      
      // Si no existe o no tiene tempId, crear nuevo mensaje
      if (!savedMessage) {
        savedMessage = await prisma.directMessage.create({
          data: {
            content: message.content,
            senderId: message.senderId,
            receiverId: message.receiverId,
            conversationId: message.conversationId,
            messageType: message.messageType || 'text',
            mediaUrl: message.mediaUrl || null,
            tempId: message.tempId || null
          },
          include: { sender: true }
        });
        console.log('Mensaje guardado en la BD:', savedMessage);
      }
      
      // Emitir confirmación al remitente
      socket.emit('message_ack', {
        messageId: savedMessage.id,
        tempId: message.tempId,
        status: 'sent'
      });
      
      // También enviar el mensaje completo al remitente para mantener consistencia
      socket.emit('new_message', savedMessage);
      console.log(`Mensaje emitido al remitente (${savedMessage.senderId})`);

      // Emitir a todos los miembros de la sala de conversación
      if (savedMessage.conversationId) {
        // Normalizar el ID y usar la función para obtener el nombre de sala
        const roomName = getConversationRoomName(savedMessage.conversationId);
        console.log(`Emitiendo mensaje a la sala ${roomName} (excluyendo remitente)`);
        
        // Emitir a la sala, excluyendo al remitente que ya recibió el mensaje
        socket.to(roomName).emit('new_message', savedMessage);
      } 
      // Si no hay conversationId pero existe un receptor directo
      else if (savedMessage.receiverId) {
        const receiverSocketId = userSocketMap.get(savedMessage.receiverId);
        if (receiverSocketId) {
          console.log(`Enviando mensaje directo a receptor ${savedMessage.receiverId} en socket ${receiverSocketId}`);
          io.to(receiverSocketId).emit('new_message', savedMessage);
        } else {
          console.log(`Receptor ${savedMessage.receiverId} no está conectado`);
        }
      }
      
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      if (message && message.tempId) {
        socket.emit('message_ack', { 
          tempId: message.tempId, 
          status: 'failed',
          error: error.message
        });
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
      // Actualizar mensaje como leído en la base de datos
      await prisma.directMessage.update({
        where: { id: messageId },
        data: { read: true }
      });
      
      // Emitir evento de lectura a todos los participantes si es una conversación
      if (conversationId) {
        const roomName = getConversationRoomName(conversationId);
        io.to(roomName).emit('message_read', { messageId, conversationId, readBy: userId });
      } else {
        // Buscar el remitente original del mensaje
        const message = await prisma.directMessage.findUnique({
          where: { id: messageId }
        });
        
        if (message && message.senderId) {
          const senderSocket = userSocketMap.get(message.senderId);
          if (senderSocket) {
            io.to(senderSocket).emit('message_read', { 
              messageId, 
              readBy: userId 
            });
          }
        }
      }
      
      console.log(`Mensaje ${messageId} marcado como leído por ${userId}`);
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
