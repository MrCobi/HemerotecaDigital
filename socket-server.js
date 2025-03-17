// Servidor Socket.io para mensajería en tiempo real
const http = require('http');
const { Server } = require('socket.io');
const fetch = require('node-fetch');

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
    
    // Si es mensaje directo, enviarlo solo al destinatario y remitente
    if (message.receiverId) {
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
        const response = await fetch('http://localhost:3000/api/messages/socket', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Socket-Internal-Auth-00123' // Clave especial para autenticar peticiones desde el servidor socket
          },
          body: JSON.stringify({
            content: message.content,
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

  // Evento: Manejar typing
  socket.on('typing', ({ userId, receiverId, isTyping }) => {
    // Encontrar el socket del destinatario
    const receiverSocket = Array.from(onlineUsers.entries())
      .find(([_, user]) => user.userId === receiverId)?.[0];
    
    if (receiverSocket) {
      // Notificar al destinatario que el remitente está escribiendo
      io.to(receiverSocket).emit('typing_status', { userId, isTyping });
    }
  });
  
  // Evento: Marcar mensaje como leído
  socket.on('mark_read', ({ messageId, conversationId }) => {
    // Obtener IDs de los participantes de la conversación
    const [user1Id, user2Id] = conversationId.split('-');
    
    // Determinar el ID del otro usuario
    const currentUser = Array.from(onlineUsers.values())
      .find(user => user.socketId === socket.id);
    
    if (!currentUser) return;
    
    const otherUserId = currentUser.userId === user1Id ? user2Id : user1Id;
    
    // Encontrar el socket del otro usuario
    const otherUserSocket = Array.from(onlineUsers.entries())
      .find(([_, user]) => user.userId === otherUserId)?.[0];
    
    // Notificar que el mensaje ha sido leído
    if (otherUserSocket) {
      io.to(otherUserSocket).emit('message_read', { messageId, conversationId });
    }
    
    // También notificar al remitente para actualizar UI
    socket.emit('message_read_confirmed', { messageId, conversationId });
  });

  // Evento: Desconexión de usuario
  socket.on('disconnect', () => {
    console.log(`Usuario desconectado: ${socket.id}`);
    
    // Obtener información del usuario antes de eliminarlo
    const user = onlineUsers.get(socket.id);
    
    if (user) {
      console.log(`Usuario identificado desconectado: ${user.username} (${user.userId})`);
      
      // Eliminar también la entrada por userId
      onlineUsers.delete(`user-${user.userId}`);
    }
    
    // Eliminar el socket de la lista de usuarios conectados
    onlineUsers.delete(socket.id);
    
    // Emitir lista actualizada de usuarios conectados
    io.emit('users_online', Array.from(onlineUsers.values())
      .filter(user => user.socketId && !user.socketId.startsWith('user-')));
  });
});

// Iniciar servidor
server.listen(SOCKET_PORT, () => {
  console.log(`Servidor Socket.io escuchando en puerto ${SOCKET_PORT}`);
});
