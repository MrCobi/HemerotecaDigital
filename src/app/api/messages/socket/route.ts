// src/app/api/messages/socket/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Clave de autorización para peticiones desde el servidor de socket
const SOCKET_API_KEY = 'Socket-Internal-Auth-00123';

export async function POST(request: Request): Promise<NextResponse>  {
  // Verificación de autorización para el servidor de socket
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== SOCKET_API_KEY) {
    console.error('Acceso no autorizado a la API de socket');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { senderId, receiverId, content, tempId } = await request.json();
    
    // Validaciones básicas
    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Contenido del mensaje no puede estar vacío' }, { status: 400 });
    }
    
    if (!senderId || !receiverId) {
      return NextResponse.json({ error: 'IDs de emisor y receptor son requeridos' }, { status: 400 });
    }
    
    console.log(`API Socket: Guardando mensaje de ${senderId} para ${receiverId}`);
    
    // Verificar si ya existe un mensaje con este tempId para evitar duplicados
    if (tempId) {
      const existingMessage = await prisma.directMessage.findFirst({
        where: {
          OR: [
            { tempId: tempId },
            { 
              AND: [
                { senderId: senderId },
                { receiverId: receiverId },
                { content: content },
                { createdAt: { gt: new Date(Date.now() - 300000) } } // Extendido a 5 minutos para mayor seguridad
              ]
            }
          ]
        }
      });

      if (existingMessage) {
        console.log(`Socket API: Mensaje duplicado detectado con tempId: ${tempId}. ID existente: ${existingMessage.id}`);
        return NextResponse.json(existingMessage, { status: 200 });
      }
    } else {
      // Si no hay tempId, verificar igualmente si existe un mensaje similar reciente
      const existingMessage = await prisma.directMessage.findFirst({
        where: {
          AND: [
            { senderId: senderId },
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
        console.log(`Socket API: Mensaje similar reciente encontrado sin tempId. ID existente: ${existingMessage.id}`);
        return NextResponse.json(existingMessage, { status: 200 });
      }
    }
    
    // Buscar o crear una conversación para estos usuarios
    let conversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: {
              in: [senderId, receiverId],
            },
          },
        },
      },
    });

    // Si no existe la conversación, crearla
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          isGroup: false,
          participants: {
            createMany: {
              data: [
                { userId: senderId },
                { userId: receiverId },
              ],
            },
          },
        },
      });
    }
    
    // Guardar el mensaje en la base de datos
    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId,
        receiverId,
        tempId,
        conversationId: conversation.id,
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
    
    // Convertir a formato para la respuesta
    const formattedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      sender: {
        id: senderId
      },
      receiver: {
        id: receiverId
      }
    };
    
    console.log(`Mensaje guardado en DB con ID: ${message.id}`);
    
    return NextResponse.json(formattedMessage, { status: 201 });
  } catch (error) {
    console.error('Error al procesar mensaje desde socket:', error);
    return NextResponse.json({ error: 'Error interno al procesar mensaje' }, { status: 500 });
  }
}
