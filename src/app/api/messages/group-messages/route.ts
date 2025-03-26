// src/app/api/messages/group-messages/route.ts
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../lib/auth-utils";
import fetch from 'node-fetch';

interface User {
  id: string;
  username?: string | null;
  image?: string | null;
  email?: string | null;
}

interface SocketMessage {
  id: string;
  content: string | null;
  senderId: string;
  senderName?: string | null;
  senderImage?: string | null;
  conversationId: string;
  createdAt: Date;
  messageType?: string;
  mediaUrl?: string | null;
}

// Definimos el tipo para DirectMessage basado en el modelo Prisma
interface DirectMessage {
  id: string;
  content?: string | null;
  mediaUrl?: string | null;
  messageType?: string;
  senderId: string;
  receiverId?: string | null;
  conversationId: string;
  replyToId?: string | null;
  read: boolean;
  createdAt: Date;
  tempId?: string | null;
  sender?: {
    id: string;
    username?: string | null;
    image?: string | null;
  };
}

// Función para notificar al servidor de sockets sobre nuevos mensajes de grupo
async function notifySocketServer(message: SocketMessage) {
  try {
    const socketUrl = 'http://localhost:3001/webhook/new-message';
    const response = await fetch(socketUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Socket-Internal-Auth-00123'
      },
      body: JSON.stringify({
        ...message,
        isGroupMessage: true
      })
    });
    
    if (!response.ok) {
      console.error(`Error notifying socket server: ${response.status} ${response.statusText}`);
    } else {
      console.log('Socket server notified successfully about new group message');
    }
  } catch (error) {
    console.error('Failed to notify socket server:', error);
  }
}

// API endpoint para enviar mensajes a grupos
export const POST = withAuth(async (request: Request, auth: AuthParams) => {
  const { userId } = auth;
  try {
    // Validación del cuerpo de la solicitud
    const { content, conversationId, messageType = 'text', mediaUrl, tempId } = await request.json();
    
    // Validar que se proporciona un ID de conversación
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'Se debe proporcionar un ID de conversación de grupo' }), { 
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

    // Asegurarse de que el ID de conversación tenga el formato correcto
    let groupId = conversationId;
    if (!groupId.startsWith('group_')) {
      groupId = `group_${groupId}`;
      console.log(`Corrigiendo ID de grupo: ${conversationId} -> ${groupId}`);
    }

    // Verificar si el usuario es participante del grupo
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: userId,
        conversationId: groupId
      }
    });

    if (!isParticipant) {
      return new Response(JSON.stringify({ error: 'No eres participante de este grupo' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verificar si el grupo existe
    const groupExists = await prisma.conversation.findUnique({
      where: {
        id: groupId
      }
    });

    if (!groupExists) {
      return new Response(JSON.stringify({ error: 'El grupo no existe' }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Crear el mensaje en la base de datos
    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: userId,
        conversationId: groupId,
        messageType,
        mediaUrl,
        read: false
      }
    });

    // Actualizar la fecha de última actualización de la conversación
    await prisma.conversation.update({
      where: {
        id: groupId
      },
      data: {
        updatedAt: new Date()
      }
    });

    // Preparar el mensaje para la respuesta
    const responseMessage = {
      id: message.id,
      content: message.content,
      senderId: message.senderId,
      conversationId: message.conversationId,
      createdAt: message.createdAt,
      messageType: message.messageType,
      mediaUrl: message.mediaUrl,
      read: message.read,
      tempId: tempId
    };

    // Notificar a los clientes conectados mediante eventos SSE
    // Nota: Ya que messageEvents no tiene un método notifyAll y sendMessage está marcado como deprecated,
    // confiamos principalmente en la notificación por socket para mensajes en tiempo real
    console.log('Mensaje de grupo creado, notificando a través de sockets');

    // Notificar al servidor de sockets
    await notifySocketServer(responseMessage);

    // Devolver el mensaje creado
    return new Response(JSON.stringify(responseMessage), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error al enviar mensaje de grupo:", error);
    return new Response(JSON.stringify({ 
      error: 'Error al enviar el mensaje de grupo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

// API endpoint para obtener mensajes de un grupo
export const GET = withAuth(async (request: Request, auth: AuthParams) => {
  const { userId } = auth;
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    if (!conversationId) {
      return new Response(JSON.stringify({ error: 'Se debe proporcionar un ID de conversación de grupo' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Asegurarse de que el ID de conversación tenga el formato correcto
    let groupId = conversationId;
    if (!groupId.startsWith('group_')) {
      groupId = `group_${groupId}`;
    }

    // Verificar si el usuario es participante del grupo
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: userId,
        conversationId: groupId
      }
    });

    if (!isParticipant) {
      return new Response(JSON.stringify({ error: 'No eres participante de este grupo' }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calcular paginación
    const skip = (page - 1) * limit;

    // Obtener mensajes del grupo
    const messages = await prisma.directMessage.findMany({
      where: {
        conversationId: groupId,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: skip,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            image: true
          }
        }
      }
    });

    // Marcar mensajes como leídos si son del otro usuario
    const unreadMessages = messages.filter((msg: DirectMessage) => 
      msg.senderId !== userId && !msg.read
    );

    if (unreadMessages.length > 0) {
      await prisma.$transaction(
        unreadMessages.map((msg: DirectMessage) => 
          prisma.directMessage.update({
            where: { id: msg.id },
            data: { read: true }
          })
        )
      );
    }

    // Contar total de mensajes para la paginación
    const totalMessages = await prisma.directMessage.count({
      where: {
        conversationId: groupId,
      },
    });

    return new Response(JSON.stringify({
      messages: messages.map((msg: DirectMessage) => ({
        id: msg.id,
        content: msg.content,
        senderId: msg.senderId,
        conversationId: msg.conversationId,
        createdAt: msg.createdAt,
        read: true, // Marcamos como leído ya que acabamos de actualizar
        messageType: msg.messageType,
        mediaUrl: msg.mediaUrl,
        sender: msg.sender
      })),
      pagination: {
        page,
        limit,
        totalMessages,
        totalPages: Math.ceil(totalMessages / limit),
        hasMore: skip + messages.length < totalMessages
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error("Error al obtener mensajes de grupo:", error);
    return new Response(JSON.stringify({ 
      error: 'Error al obtener los mensajes de grupo',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});
