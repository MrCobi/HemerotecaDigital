// Servidor Socket.io para mensajería en tiempo real
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');

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
const server = http.createServer();
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
// Mantener registro de usuarios en conversaciones activas
const activeConversations = new Map();

// Manejar conexiones de Socket.io
io.on('connection', (socket) => {
  console.log(`Usuario conectado: ${socket.id}`);
  
  // Evento: Usuario se identifica
  socket.on('identify', ({ userId, username }) => {
    // Agregar usuario a la lista de usuarios conectados
    onlineUsers.set(socket.id, { userId, username, socketId: socket.id });
    
    // IMPORTANTE: También mapear por userId para búsqueda rápida
    onlineUsers.set(`user-${userId}`, { userId, username, socketId: socket.id });
    
    // Emitir lista actualizada de usuarios conectados
    io.emit('users_online', Array.from(onlineUsers.values())
      .filter(user => user.socketId && !user.socketId.startsWith('user-'))); // Filtrar entradas duplicadas
    
    console.log(`Usuario identificado: ${username} (${userId})`);
    console.log('Lista actual de usuarios conectados:');
    Array.from(onlineUsers.entries())
      .filter(([key, _]) => !key.startsWith('user-'))
      .forEach(([socketId, user]) => {
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
      // Informar sobre el emisor y receptor
      console.log(`Emisor: ${message.senderId}, Receptor: ${message.receiverId}`);
      
      // Mostrar lista de todos los usuarios conectados para diagnóstico
      console.log('Lista de usuarios conectados:');
      Array.from(onlineUsers.entries())
        .filter(([key, _]) => !key.startsWith('user-'))
        .forEach(([socketId, user]) => {
          console.log(`- Socket: ${socketId}, Usuario: ${user.userId}, Nombre: ${user.username}`);
        });
      
      // Encontrar el socket del destinatario por userId - MEJORADO
      const userKey = `user-${message.receiverId}`;
      const receiverInfo = onlineUsers.get(userKey);
      const receiverSocket = receiverInfo ? receiverInfo.socketId : null;
      
      console.log(`Buscando socket para usuario con ID ${message.receiverId}...`);
      console.log(`Clave de búsqueda: ${userKey}`);
      console.log(`Socket encontrado: ${receiverSocket ? receiverSocket : 'No encontrado'}`);
      
      // IMPORTANTE: Asegurar que el mensaje tenga una estructura consistente
      const finalMessage = {
        ...enhancedMessage,
        createdAt: enhancedMessage.timestamp || new Date(),
        status: 'sent'
      };
      
      // IMPORTANTE: También enviar el mensaje de vuelta al remitente para que lo vea en su chat
      socket.emit('new_message', finalMessage);
      console.log(`Mensaje enviado de vuelta al remitente (${socket.id})`);
      
      // Enviar confirmación al remitente
      socket.emit('message_status', {
        messageId: message.id || message.tempId || enhancedMessage.id,
        status: 'sent'
      });
      
      // Enviar al destinatario si está conectado
      if (receiverSocket) {
        // CORREGIDO: Usar io.to en lugar de io.emit para enviar específicamente a ese socket
        io.to(receiverSocket).emit('new_message', finalMessage);
        console.log(`Mensaje enviado al receptor ${message.receiverId} via socket ${receiverSocket}`);
        
        // Actualizar estado de entrega
        socket.emit('message_status', {
          messageId: message.id || message.tempId || enhancedMessage.id,
          status: 'delivered'
        });
        console.log(`Estado del mensaje enviado al remitente: delivered`);
      } else {
        console.log(`Receptor ${message.receiverId} no está conectado. El mensaje solo se guardará en DB.`);
      }
      
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
          
          // Notificar actualización con el ID real de la base de datos
          if (savedMessage && savedMessage.id) {
            // Enviar actualización al remitente
            socket.emit('message_updated', {
              tempId: message.tempId || message.id,
              realId: savedMessage.id,
              status: 'saved'
            });
            
            // Si el destinatario está conectado, también enviarle la actualización
            if (receiverSocket) {
              io.to(receiverSocket).emit('message_updated', {
                tempId: message.tempId || message.id,
                realId: savedMessage.id,
                status: 'saved'
              });
            }
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
    } else {
      // Si no es mensaje directo, emitir a todos (chat grupal)
      io.emit('new_message', enhancedMessage);
    }
  });

  // Evento: Manejar typing para conversaciones
  socket.on('typing', ({ userId, receiverId, conversationId, isTyping }) => {
    if (conversationId) {
      // Notificar a todos en la conversación excepto al remitente
      socket.to(`conversation-${conversationId}`).emit('typing_status', { 
        userId, 
        conversationId,
        isTyping 
      });
    } 
    // Para compatibilidad con sistema anterior
    else if (receiverId) {
      // Encontrar el socket del destinatario
      const userKey = `user-${receiverId}`;
      const receiverInfo = onlineUsers.get(userKey);
      const receiverSocket = receiverInfo ? receiverInfo.socketId : null;
      
      if (receiverSocket) {
        // Notificar al destinatario que el remitente está escribiendo
        io.to(receiverSocket).emit('typing_status', { userId, isTyping });
      }
    }
  });
  
  // Evento: Marcar mensaje como leído
  socket.on('mark_read', ({ messageId, conversationId, userId }) => {
    if (conversationId) {
      // Notificar a todos los participantes en la conversación
      io.to(`conversation-${conversationId}`).emit('message_read', { 
        messageId, 
        conversationId,
        readBy: userId 
      });
      
      // También intentar actualizar en la base de datos
      try {
        fetch(`${API_ROUTES.messages.socket}/read`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Socket-Internal-Auth-00123'
          },
          body: JSON.stringify({ messageId, userId }),
        }).catch(error => console.error('Error al marcar mensaje como leído en DB:', error));
      } catch (error) {
        console.error('Error al marcar mensaje como leído:', error);
      }
    }
  });
  
  // Evento: Enviar mensaje de voz
  socket.on('send_voice_message', async (message) => {
    console.log(`MENSAJE DE VOZ RECIBIDO DE SOCKET ${socket.id}:`);
    console.log(JSON.stringify({
      ...message,
      mediaUrl: message.mediaUrl ? message.mediaUrl.substring(0, 50) + '...' : null
    }, null, 2));
    
    // El resto del procesamiento es igual que para send_message, pero aseguramos el tipo de mensaje
    const enhancedMessage = {
      ...message,
      messageType: 'voice',
      timestamp: new Date(),
      status: 'sent',
      id: message.id || message.tempId || `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    };
    
    // Procesamos como un mensaje normal pero asegurando el tipo 'voice'
    if (message.conversationId) {
      const roomName = `conversation-${message.conversationId}`;
      
      // Enviar al remitente
      socket.emit('new_message', {
        ...enhancedMessage,
        createdAt: enhancedMessage.timestamp || new Date(),
        status: 'sent'
      });
      
      // Enviar a los demás participantes
      socket.to(roomName).emit('new_message', {
        ...enhancedMessage,
        createdAt: enhancedMessage.timestamp || new Date(),
        status: 'delivered'
      });
      
      // Guardar en base de datos (similar al caso general)
      try {
        const response = await fetch(API_ROUTES.messages.socket, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Socket-Internal-Auth-00123'
          },
          body: JSON.stringify({
            content: message.content || '', // Puede estar vacío para mensajes de voz
            mediaUrl: message.mediaUrl,
            messageType: 'voice',
            senderId: message.senderId,
            conversationId: message.conversationId,
            tempId: message.tempId || message.id
          }),
        });
        
        if (!response.ok) {
          console.error('Error al guardar mensaje de voz en DB:', await response.text());
          socket.emit('message_status', {
            messageId: message.id || message.tempId,
            status: 'error'
          });
        } else {
          console.log('Mensaje de voz guardado correctamente');
          const savedMessage = await response.json();
          
          // Actualizar IDs
          if (savedMessage && savedMessage.id) {
            io.to(roomName).emit('message_updated', {
              tempId: message.tempId || message.id,
              realId: savedMessage.id,
              status: 'saved'
            });
          }
        }
      } catch (error) {
        console.error('Error al guardar mensaje de voz:', error);
        socket.emit('message_status', {
          messageId: message.id || message.tempId,
          status: 'error'
        });
      }
    }
  });

  // Evento: Desconexión
  socket.on('disconnect', () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      console.log(`Usuario desconectado: ${user.username || 'Desconocido'} (${user.userId || 'Sin ID'})`);
      
      // Limpiar mapeo del usuario
      onlineUsers.delete(socket.id);
      if (user.userId) {
        onlineUsers.delete(`user-${user.userId}`);
      }
      
      // Emitir lista actualizada
      io.emit('users_online', Array.from(onlineUsers.values())
        .filter(user => user.socketId && !user.socketId.startsWith('user-')));
    } else {
      console.log(`Socket desconectado: ${socket.id} (Usuario desconocido)`);
    }
  });
});

// Iniciar servidor
server.listen(SOCKET_PORT, () => {
  console.log(`Servidor Socket.io escuchando en puerto ${SOCKET_PORT}`);
});
