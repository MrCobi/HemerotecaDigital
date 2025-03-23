// src/app/api/messages/route.ts
import prisma from "@/lib/db";
import { messageEvents } from "./sse-messages/message-event-manager";
import { withAuth } from "../../../lib/auth-utils";
import fetch from 'node-fetch';

// Define User type that matches the structure needed
interface User {
  id: string;
  username?: string | null;
  image?: string | null;
  email?: string | null;
  // Add other fields as needed
}

// Function to notify socket server about new messages
async function notifySocketServer(message: any) {
  try {
    const socketUrl = 'http://localhost:3001/webhook/new-message';
    const response = await fetch(socketUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Socket-Internal-Auth-00123'
      },
      body: JSON.stringify(message)
    });
    
    if (!response.ok) {
      console.error(`Error notifying socket server: ${response.status} ${response.statusText}`);
    } else {
      console.log('Socket server notified successfully about new message');
    }
  } catch (error) {
    console.error('Failed to notify socket server:', error);
  }
}

export const POST = withAuth(async (request: Request, { userId, user }: { userId: string, user: User }) => {
  try {
    const { receiverId, content, priority, tempId } = await request.json();
    
    // Validar contenido del mensaje
    if (!content || content.trim() === '') {
      return new Response(JSON.stringify({ error: 'Contenido del mensaje no puede estar vacío' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validar ID del receptor
    if (!receiverId) {
      return new Response(JSON.stringify({ error: 'ID del receptor es requerido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si los usuarios se siguen mutuamente
    const checkFollows = async (): Promise<boolean> => {
      try {
        // Verificar que el remitente sigue al receptor
        const senderFollowsReceiver = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: receiverId,
            },
          }
        });

        // Verificar que el receptor sigue al remitente
        const receiverFollowsSender = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: receiverId,
              followingId: userId,
            },
          }
        });

        const checksPassed = !!(senderFollowsReceiver && receiverFollowsSender);
        if (!checksPassed) {
          console.log(`Verificación de seguidores fallida: senderFollows=${!!senderFollowsReceiver}, receiverFollows=${!!receiverFollowsSender}`);
        }
        return checksPassed;
      } catch (error) {
        console.error("Error verificando follows mutuos:", error);
        return false;
      }
    };

    // Obtener o crear conversación entre usuarios
    const getOrCreateConversation = async (follow: boolean): Promise<string> => {
      console.log(`Buscando conversación entre ${userId} y ${receiverId}`);
      return await getOrCreateConversationBetweenUsers(userId, receiverId, follow);
    };

    // Verificar si ya existe una conversación entre ambos usuarios
    const getOrCreateConversationBetweenUsers = async (user1Id: string, user2Id: string, follow: boolean): Promise<string> => {
      // Buscar una conversación existente entre los dos usuarios
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          AND: [
            { isGroup: false },
            {
              participants: {
                some: {
                  userId: user1Id
                }
              }
            },
            {
              participants: {
                some: {
                  userId: user2Id
                }
              }
            }
          ]
        }
      });
      
      if (existingConversation) {
        return existingConversation.id;
      } else {
        // Si no existe, crear una nueva conversación
        const newConversation = await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: {
              create: [
                { userId: user1Id },
                { userId: user2Id }
              ]
            }
          }
        });
        return newConversation.id;
      }
    };

    const mutualFollow = await checkFollows();
    if (!mutualFollow) {
      console.warn(`Advertencia: Los usuarios ${userId} y ${receiverId} no se siguen mutuamente, pero se permitirá el mensaje`);
      // Ya no devolvemos el error 403, permitimos el envío de mensajes temporalmente
    }
    
    // Generar ID temporal único si no se proporciona
    const messageId = tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Ultra-fast path: Enviar mensaje a ambos clientes inmediatamente, antes de guardar en DB
    console.log(`ULTRA-FAST PATH: Broadcasting temporary message to sender ${userId} and receiver ${receiverId}`);
    
    // Mensaje temporal con estructura completa para mostrar en UI inmediatamente
    const tempMessage = {
      id: messageId,
      content,
      senderId: userId,
      receiverId,
      read: false,
      createdAt: new Date().toISOString(),
      isTemp: true,
      priority: priority || 'normal',
      tempId: messageId, // Incluir el ID temporal para reconciliación posterior
      sender: {
        id: userId,
        username: user.username || null,
        image: user.image || null
      },
      receiver: {
        id: receiverId
        // El receptor se completará en el cliente si es necesario
      }
    };
    
    // SOLO USAR SSE SI ESTA ACTIVADO, DE LO CONTRARIO USAMOS SOCKET.IO 
    let senderConnected = false;
    let receiverConnected = false;
    
    try {
      // Verificar si los clientes están conectados y emitir mensaje temporal
      senderConnected = messageEvents.isUserConnected(userId);
      receiverConnected = messageEvents.isUserConnected(receiverId);
      
      // Registrar el estado de conexión para diagnóstico
      console.log(`Sender ${userId} connected via SSE: ${senderConnected}`);
      console.log(`Receiver ${receiverId} connected via SSE: ${receiverConnected}`);
      
      // Emitir mensaje temporal inmediatamente si están conectados por SSE
      if (senderConnected) messageEvents.sendMessage(userId, tempMessage);
      if (receiverConnected) messageEvents.sendMessage(receiverId, tempMessage);
    } catch (sseError) {
      console.warn('SSE not available or error occurred, relying on Socket.io:', sseError);
    }
    
    // Crear promesa para el proceso de base de datos
    const dbPromise = async () => {
      // Verificar si ya existe un mensaje con este tempId para evitar duplicados
      if (tempId) {
        const existingMessage = await prisma.directMessage.findFirst({
          where: {
            OR: [
              { tempId: tempId },
              { 
                AND: [
                  { senderId: userId },
                  { receiverId: receiverId },
                  { content: content },
                  { createdAt: { gt: new Date(Date.now() - 300000) } } // Extendido a 5 minutos para mayor seguridad
                ]
              }
            ]
          }
        });

        if (existingMessage) {
          console.log(`Mensaje duplicado detectado con tempId: ${tempId}. ID existente: ${existingMessage.id}`);
          return existingMessage;
        }
      } else {
        // Si no hay tempId, verificar igualmente si existe un mensaje similar reciente
        const existingMessage = await prisma.directMessage.findFirst({
          where: {
            AND: [
              { senderId: userId },
              { receiverId: receiverId },
              { content: content },
              { createdAt: { gt: new Date(Date.now() - 300000) } } // Últimos 5 minutos
            ]
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (existingMessage) {
          console.log(`Mensaje similar reciente encontrado sin tempId. ID existente: ${existingMessage.id}`);
          return existingMessage;
        }
      }

      // Si no es duplicado, crear el mensaje
      try {
        // Primero, verificar si existe una conversación entre los usuarios
        let conversationId = null;
        
        // Buscar una conversación existente entre los dos usuarios
        const existingConversation = await prisma.conversation.findFirst({
          where: {
            AND: [
              { isGroup: false },
              {
                participants: {
                  some: {
                    userId: userId
                  }
                }
              },
              {
                participants: {
                  some: {
                    userId: receiverId
                  }
                }
              }
            ]
          }
        });
        
        if (existingConversation) {
          conversationId = existingConversation.id;
        } else {
          // Si no existe, crear una nueva conversación
          const newConversation = await prisma.conversation.create({
            data: {
              isGroup: false,
              participants: {
                create: [
                  { userId: userId },
                  { userId: receiverId }
                ]
              }
            }
          });
          conversationId = newConversation.id;
        }
        
        // Ahora crear el mensaje asociado a la conversación
        return prisma.directMessage.create({
          data: {
            content,
            senderId: userId,
            receiverId,
            tempId,
            conversationId: conversationId
          },
          select: {
            id: true,
            content: true,
            createdAt: true, 
            read: true,
            senderId: true,
            receiverId: true,
            tempId: true,
            conversationId: true
          }
        });
      } catch (error) {
        // Si ocurre un error al crear, puede ser debido a una condición de carrera
        // Intentar buscar nuevamente el mensaje
        console.error("Error al crear mensaje, verificando si ya existe:", error);
        const whereConditions: any[] = [
          { 
            AND: [
              { senderId: userId },
              { receiverId: receiverId },
              { content: content },
              { createdAt: { gt: new Date(Date.now() - 60000) } }
            ]
          }
        ];
        
        // Añadir condición de tempId solo si existe
        if (tempId) {
          whereConditions.push({ tempId });
        }
        
        const possibleDuplicate = await prisma.directMessage.findFirst({
          where: {
            OR: whereConditions
          }
        });
        
        if (possibleDuplicate) {
          console.log("Mensaje encontrado después de error de creación:", possibleDuplicate.id);
          return possibleDuplicate;
        }
        
        throw error; // Si no se encuentra, relanzar el error
      }
    };
    
    // Para mensajes de alta prioridad, no esperamos a la base de datos
    if (priority === 'high') {
      // Iniciar escritura en DB pero no esperar
      dbPromise().then(message => {
        // Cuando finalice, enviar mensaje con ID real para reconciliación
        const finalMessage = {
          ...message,
          createdAt: message.createdAt.toISOString(),
          tempId: messageId, // Para reconciliación con el mensaje temporal
          priority: 'high',
          sender: {
            id: userId,
            username: user.username || null,
            image: user.image || null
          },
          receiver: {
            id: receiverId
          }
        };
        
        // Registrar éxito para diagnóstico
        console.log(`DB save success for high priority message. Real ID: ${message.id}, replacing temp: ${messageId}`);
        
        // Emitir el mensaje final con ID real (para actualizar referencias)
        try {
          if (senderConnected) messageEvents.sendMessage(userId, finalMessage);
          if (receiverConnected) messageEvents.sendMessage(receiverId, finalMessage);
        } catch (sseError) {
          console.warn('SSE notification failed for final message, relying on Socket.io:', sseError);
        }
        
        // Notificar al servidor de socket
        notifySocketServer(finalMessage);
      }).catch(error => {
        console.error('Error al guardar mensaje en base de datos:', error);
        // Notificar al cliente del error
        const errorMessage = {
          id: messageId,
          tempId: messageId,
          error: true,
          errorType: 'db_save_failed',
          message: 'Error al guardar mensaje'
        };
        try {
          if (senderConnected) messageEvents.sendMessage(userId, errorMessage);
        } catch (sseError) {
          console.warn('SSE error notification failed, relying on Socket.io for error delivery:', sseError);
        }
      });
      
      // Responder inmediatamente con un mensaje temporal
      return new Response(JSON.stringify({
        ...tempMessage,
        status: 'pending', // Indicar que está pendiente de confirmación en DB
      }), { 
        status: 202, // Accepted
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    // Para mensajes de prioridad normal, esperar a la confirmación de la DB
    try {
      const message = await dbPromise();
      
      // Mensaje definitivo con el ID real de la base de datos
      const finalMessage = {
        ...message,
        createdAt: message.createdAt.toISOString(),
        tempId: messageId, // Incluir el ID temporal para que el cliente pueda reemplazar el mensaje temporal
        sender: {
          id: userId,
          username: user.username || null,
          image: user.image || null
        },
        receiver: {
          id: receiverId
        }
      };
      
      // Emitir el mensaje final con ID real de DB (para sustituir al temporal en la UI)
      console.log(`Broadcasting final message with ID ${message.id} (replaces temp ${messageId})`);
      try {
        if (senderConnected) messageEvents.sendMessage(userId, finalMessage);
        if (receiverConnected) messageEvents.sendMessage(receiverId, finalMessage);
      } catch (sseError) {
        console.warn('SSE notification failed for final message, relying on Socket.io for delivery:', sseError);
      }
      
      // Notificar al servidor de socket
      notifySocketServer(finalMessage);
      
      // Responder con el mensaje completo
      return new Response(JSON.stringify(finalMessage), { 
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (dbError) {
      console.error("Error saving message to database:", dbError);
      
      // Notificar al cliente del error
      const errorMessage = {
        id: messageId,
        tempId: messageId,
        error: true,
        errorType: 'db_save_failed',
        message: 'Error al guardar mensaje en la base de datos'
      };
      
      try {
        if (senderConnected) messageEvents.sendMessage(userId, errorMessage);
      } catch (sseError) {
        console.warn('SSE error notification failed:', sseError);
      }
      
      return new Response(JSON.stringify({
        error: 'Error al guardar mensaje en la base de datos',
        errorType: 'db_save_failed',
        tempId: messageId
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Unexpected error in message sending:", error);
    return new Response(JSON.stringify({
      error: 'Error inesperado al enviar mensaje',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

export const GET = withAuth(async (request: Request, { userId }: { userId: string }) => {
  const url = new URL(request.url);
  const conversationWith = url.searchParams.get('with');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const before = url.searchParams.get('before');
  
  // Si no hay parámetro "with", devolvemos todas las conversaciones del usuario
  if (!conversationWith) {
    try {
      // Obtener las últimas conversaciones del usuario
      const conversations = await prisma.directMessage.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        orderBy: { createdAt: 'desc' },
        distinct: ['senderId', 'receiverId'],
        take: limit,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true
            }
          },
          receiver: {
            select: {
              id: true,
              name: true,
              image: true,
              username: true
            }
          }
        }
      });

      // Agrupar mensajes por conversación
      const conversationMap = new Map();
      
      for (const message of conversations) {
        const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
        
        if (!conversationMap.has(otherUserId)) {
          conversationMap.set(otherUserId, {
            userId: otherUserId,
            lastMessage: {
              ...message,
              createdAt: message.createdAt.toISOString()
            },
            userInfo: message.senderId === userId ? message.receiver : message.sender
          });
        }
      }
      
      return new Response(JSON.stringify(Array.from(conversationMap.values())), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error("Error obteniendo conversaciones:", error);
      return new Response(JSON.stringify({ 
        error: 'Error al obtener conversaciones',
        details: error instanceof Error ? error.message : String(error)
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
  
  try {
    // Construir condiciones de búsqueda
    const whereCondition: {
      OR: [
        { senderId: string; receiverId: string; },
        { senderId: string; receiverId: string; }
      ];
      createdAt?: { lt: Date };
    } = {
      OR: [
        { senderId: userId, receiverId: conversationWith },
        { senderId: conversationWith, receiverId: userId }
      ]
    };
    
    // Añadir condición de paginación si se proporciona 'before'
    if (before) {
      whereCondition.createdAt = { lt: new Date(before) };
    }
    
    // Buscar mensajes
    const messages = await prisma.directMessage.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true
          }
        }
      }
    });
    
    // Marcar como leídos los mensajes recibidos
    if (messages.some((msg: { senderId: string; read: boolean }) => msg.senderId === conversationWith && !msg.read)) {
      await prisma.directMessage.updateMany({
        where: {
          senderId: conversationWith,
          receiverId: userId,
          read: false
        },
        data: { read: true }
      });
    }
    
    // Serializar las fechas para JSON
    const serializedMessages = messages.map((msg: any) => ({
      ...msg,
      createdAt: msg.createdAt.toISOString()
    }));
    
    return new Response(JSON.stringify(serializedMessages), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return new Response(JSON.stringify({
      error: 'Error al obtener mensajes',
      details: error instanceof Error ? error.message : String(error)
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});