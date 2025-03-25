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
    // Validación del cuerpo de la solicitud
    const { content, receiverId, conversationId: existingConversationId, messageType = 'text', mediaUrl, priority, tempId } = await request.json();
    
    // Validar que se proporciona un destinatario
    if (!receiverId && !existingConversationId) {
      return new Response(JSON.stringify({ error: 'Se debe proporcionar un ID de receptor o conversación' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validar que hay contenido, excepto para mensajes con multimedia
    if ((!content || content.trim() === '') && messageType === 'text') {
      return new Response(JSON.stringify({ error: 'El contenido del mensaje no puede estar vacío' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validar URL de multimedia para mensajes tipo 'voice', 'image', etc.
    if (['voice', 'image', 'video', 'file'].includes(messageType) && !mediaUrl) {
      return new Response(JSON.stringify({ error: `URL de medios requerida para mensajes tipo ${messageType}` }), { 
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
      messageType,
      mediaUrl,
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
            tempId: tempId // Solo comprobar si existe un mensaje con el mismo tempId
          }
        });

        if (existingMessage) {
          console.log(`Mensaje duplicado detectado con tempId: ${tempId}. ID existente: ${existingMessage.id}`);
          return existingMessage;
        }
      } else {
        // Si no hay tempId, verificar si existe un mensaje exactamente igual en un corto período
        // (esto solo se aplicaría en caso de posibles duplicados por errores de red)
        const existingMessage = await prisma.directMessage.findFirst({
          where: {
            AND: [
              { senderId: userId },
              { receiverId: receiverId },
              { content: content },
              { createdAt: { gt: new Date(Date.now() - 10000) } } // Verificar solo en los últimos 10 segundos
            ]
          },
          orderBy: {
            createdAt: 'desc'
          }
        });

        if (existingMessage) {
          console.log(`Posible duplicado por red detectado. ID existente: ${existingMessage.id}`);
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
            messageType,
            mediaUrl,
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
            messageType: true,
            mediaUrl: true,
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

// Implementación correcta de GET usando withAuth como wrapper
export const GET = withAuth(async (req: Request, { userId }: { userId: string }) => {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    let conversationParam = url.searchParams.get('with');
    
    // Calculamos el número de mensajes a omitir (skip)
    const skip = (page - 1) * limit;
    
    console.log(`GET /api/messages - userId: ${userId}, param with: ${conversationParam}, page: ${page}, limit: ${limit}`);
    
    // Validar que tenemos un parámetro 'with'
    if (!conversationParam || conversationParam.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'Se requiere un parámetro de conversación válido',
          messages: []
        }),
        { status: 400 }
      );
    }

    // Procesamos el formato del parámetro 'with' para extraer el ID de conversación
    let isDirectConversationId = false;
    let conversationId: string;
    
    console.log(`Parámetro 'with' recibido: "${conversationParam}"`);
    
    // Identificar el tipo de conversación basado en el prefijo
    if (conversationParam.startsWith('conv_')) {
      conversationId = conversationParam; // Mantener el ID completo con prefijo para chats 1:1
      isDirectConversationId = true;
      console.log(`Identificado como ID de conversación directa: ${conversationId}`);
    } else if (conversationParam.startsWith('group_')) {
      conversationId = conversationParam; // Mantener el ID completo con prefijo para grupos
      isDirectConversationId = true;
      console.log(`Identificado como ID de conversación de grupo: ${conversationId}`);
    } else {
      // Si no tiene prefijo, asumimos que es el ID de otro usuario
      conversationId = conversationParam;
      console.log(`Identificado como posible ID de usuario: ${conversationId}`);
    }
    
    console.log(`Buscando si el usuario ${userId} es participante de la conversación ${conversationId}`);
    
    // Verificar si el usuario es participante de esta conversación
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: userId,
        conversationId: conversationId
      }
    });
    
    console.log(`Verificación de participante: usuario ${userId}, conversación ${conversationId}, resultado: ${isParticipant ? 'sí es participante' : 'no es participante'}`);
    
    if (!isParticipant) {
      console.log(`Usuario ${userId} no es participante de la conversación ${conversationId}`);
      
      // Si es una solicitud directa de conversación por ID y el usuario no es participante
      if (isDirectConversationId) {
        // Verificar si la conversación existe
        console.log(`DEPURACIÓN: Buscando conversación con ID exacto: "${conversationId}"`);
        
        // Detectar si es un ID de grupo o de conversación normal
        const isGroupConversation = conversationId.startsWith('group_');
        
        // Si es un intento de acceder a "conv_group_X", corregir el ID
        if (conversationId.startsWith('conv_group_')) {
          const correctedId = conversationId.replace('conv_group_', 'group_');
          console.log(`Corrigiendo ID de conversación mal formado. Original: ${conversationId}, Corregido: ${correctedId}`);
          conversationId = correctedId;
        }
        
        // Primero hacemos una búsqueda más permisiva para debuggear
        const similarConversations = await prisma.conversation.findMany({
          where: {
            id: {
              contains: isGroupConversation 
                ? conversationId.replace('group_', '') 
                : conversationId.replace('conv_', '')
            }
          },
          select: {
            id: true
          }
        });
        
        console.log(`Conversaciones con ID similar:`, similarConversations);
        
        const conversationExists = await prisma.conversation.findUnique({
          where: {
            id: conversationId
          }
        });
        
        console.log(`Resultado de búsqueda de conversación exacta "${conversationId}": ${conversationExists ? 'Encontrada' : 'No encontrada'}`);
        
        if (!conversationExists) {
          console.log(`La conversación ${conversationId} no existe en la base de datos`);
          return new Response(
            JSON.stringify({ 
              error: 'La conversación no existe',
              messages: []
            }),
            { status: 404 }
          );
        }
        
        // La conversación existe pero el usuario no es participante,
        // lo añadimos automáticamente a la conversación
        console.log(`Añadiendo al usuario ${userId} como participante de la conversación existente ${conversationId}`);
        
        try {
          // Añadir al usuario actual como participante
          await prisma.conversationParticipant.create({
            data: {
              userId: userId,
              conversationId: conversationId,
              isAdmin: false, // No es admin por defecto
              joinedAt: new Date()
            }
          });
          
          console.log(`Usuario ${userId} añadido correctamente como participante`);
          
          // Ahora podemos obtener los mensajes normalmente
          const messages = await fetchMessagesByConversationId(conversationId, skip, limit);
          
          return new Response(
            JSON.stringify({ messages: messages || [] }),
            { status: 200 }
          );
        } catch (error) {
          console.error(`Error al añadir participante:`, error);
          return new Response(
            JSON.stringify({ 
              error: 'Error al añadir al usuario como participante',
              messages: []
            }),
            { status: 500 }
          );
        }
      }
      
      // Si no es una petición directa por ID, quizás el conversationId es realmente un userId
      // Buscamos la conversación entre los dos usuarios
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
                  userId: conversationId
                }
              }
            }
          ]
        }
      });
      
      if (existingConversation) {
        console.log(`Encontrada conversación existente: ${existingConversation.id}`);
        // Ahora usamos el conversationId real
        const messages = await fetchMessagesByConversationId(existingConversation.id, skip, limit);
        return new Response(
          JSON.stringify({ messages }),
          { status: 200 }
        );
      } else {
        // No hay conversación entre estos usuarios aún
        console.log(`No hay conversación entre ${userId} y ${conversationId}`);
        return new Response(
          JSON.stringify({ messages: [] }),
          { status: 200 }
        );
      }
    }
    
    // Si es participante, usa el conversationId directamente
    const messages = await fetchMessagesByConversationId(conversationId, skip, limit);
    
    // Si fetchMessagesByConversationId devuelve null, significa que la conversación no existe
    if (messages === null) {
      return new Response(
        JSON.stringify({ 
          error: 'La conversación no existe',
          messages: []
        }),
        { status: 404 }
      );
    }
    
    return new Response(
      JSON.stringify({ messages }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error al obtener mensajes:', error);
    return new Response(
      JSON.stringify({ error: 'Error al obtener mensajes' }),
      { status: 500 }
    );
  }
});

// Función auxiliar para obtener mensajes por conversationId
async function fetchMessagesByConversationId(conversationId: string, skip: number, limit: number) {
  console.log(`DEPURACIÓN: Buscando conversación con ID exacto: "${conversationId}"`);
  
  // Primero, verificar que la conversación existe realizando una consulta bruta a la base de datos
  try {
    // Normalizar el ID para la búsqueda quitando prefijos si existen
    let normalizedId = conversationId;
    
    // Detectar y manejar prefijos específicos
    if (conversationId.startsWith('conv_')) {
      normalizedId = conversationId.replace('conv_', '');
      console.log(`Normalizado ID de conversación directa: ${normalizedId}`);
    } else if (conversationId.startsWith('group_')) {
      normalizedId = conversationId; // Los IDs de grupo ya incluyen el prefijo en la BD
      console.log(`Usando ID de grupo tal cual: ${normalizedId}`);
    }
    
    // Para depuración, buscar por coincidencia parcial también
    const conversationsWithSimilarId = await prisma.$queryRaw`
      SELECT id FROM conversations 
      WHERE id LIKE ${`%${normalizedId.replace('group_', '')}%`}
      LIMIT 5
    `;
    
    console.log(`Conversaciones con ID similar:`, conversationsWithSimilarId);
    
    // Intentar encontrar la conversación con el ID exacto primero
    let conversationExists = await prisma.conversation.findUnique({
      where: {
        id: conversationId
      }
    });
    
    // Si no se encuentra con el ID exacto, probar con el ID normalizado
    if (!conversationExists && normalizedId !== conversationId) {
      conversationExists = await prisma.conversation.findUnique({
        where: {
          id: normalizedId
        }
      });
      
      if (conversationExists) {
        console.log(`Encontrada conversación con ID normalizado: ${normalizedId}`);
        // Usar el ID normalizado para el resto de la función
        conversationId = normalizedId;
      }
    }
    
    console.log(`Resultado final de búsqueda: ${conversationExists ? 'Encontrada' : 'No encontrada'}`);
    
    if (!conversationExists) {
      return null; // Conversación no encontrada
    }
    
    // Ahora podemos obtener los mensajes normalmente
    return await getMessagesForConversation(conversationId, skip, limit);
  } catch (error) {
    console.error(`Error grave al buscar la conversación:`, error);
    throw error; // Propagar el error para que se maneje en el endpoint
  }
}

// Función auxiliar para obtener mensajes una vez que sabemos que la conversación existe
async function getMessagesForConversation(conversationId: string, skip: number, limit: number) {
  try {
    console.log(`Obteniendo mensajes para conversación "${conversationId}" (skip=${skip}, limit=${limit})`);
    
    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId: conversationId
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true
          }
        },
        receiver: {
          select: {
            id: true,
            username: true,
            image: true,
            name: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });
    
    console.log(`Se encontraron ${messages.length} mensajes para la conversación ${conversationId}`);
    
    // Si no hay mensajes, devolver un array vacío en lugar de null
    if (messages.length === 0) {
      console.log(`La conversación ${conversationId} existe pero no tiene mensajes`);
      return [];
    }
    
    // Las fechas en formato ISO para que se serialicen correctamente
    const serializedMessages = messages.map((msg: any) => ({
      ...msg,
      createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt
    }));
    
    // Devolver en orden cronológico (más antiguos primero)
    return serializedMessages.reverse();
  } catch (error) {
    console.error(`Error al obtener mensajes:`, error);
    throw error;
  }
}