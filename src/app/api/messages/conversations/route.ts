// src/app/api/messages/conversations/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

interface ConversationPair {
  user1: string;
  user2: string;
  lastMessageDate: Date;
}

interface ConversationResponse {
  id: string;
  receiver: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  lastMessage?: {
    content: string | null;
    createdAt: Date;
    read: boolean;
    senderId: string;
    messageType: string;
  };
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Usuario no autenticado" },
        { status: 401 }
      );
    }

    console.log(`Obteniendo conversaciones para usuario: ${session.user.id}`);

    // 1. Obtener TODAS las conversaciones en las que el usuario es participante
    const userConversations = await prisma.$queryRaw`
      SELECT 
        c.id as conversationId,
        c.created_at as createdAt, 
        c.updated_at as updatedAt
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      WHERE cp.user_id = ${session.user.id}
    `;

    console.log(`Encontradas ${Array.isArray(userConversations) ? userConversations.length : 0} conversaciones`);

    if (!Array.isArray(userConversations) || userConversations.length === 0) {
      // No hay conversaciones
      return NextResponse.json([]);
    }

    // 2. Para cada conversación, obtener al otro participante
    const conversationsWithParticipants = await Promise.all(
      (userConversations as any[]).map(async (conv) => {
        try {
          // Obtener al otro participante
          const otherParticipant = await prisma.$queryRaw`
            SELECT 
              u.id, 
              u.username, 
              u.name, 
              u.image
            FROM conversation_participants cp
            JOIN users u ON cp.user_id = u.id
            WHERE cp.conversation_id = ${conv.conversationId}
            AND cp.user_id != ${session.user.id}
            LIMIT 1
          `;

          // Si no hay otro participante (posible en conversaciones grupales o corruptas)
          if (!Array.isArray(otherParticipant) || otherParticipant.length === 0) {
            console.log(`No se encontró otro participante para conversación: ${conv.conversationId}`);
            return null;
          }

          // Asegurar que otherParticipant tiene el formato correcto
          const otherUser = {
            id: otherParticipant[0].id as string,
            username: otherParticipant[0].username as string | null,
            name: otherParticipant[0].name as string | null,
            image: otherParticipant[0].image as string | null
          };

          // Obtener el último mensaje usando conversationId (ajuste clave)
          const lastMessage = await prisma.directMessage.findFirst({
            where: {
              conversationId: conv.conversationId
            },
            orderBy: { createdAt: 'desc' }
          });

          // Obtener número de mensajes no leídos
          const unreadCount = await prisma.directMessage.count({
            where: {
              conversationId: conv.conversationId,
              senderId: { not: session.user.id },
              read: false
            }
          });

          return {
            id: conv.conversationId,
            receiver: {
              id: otherUser.id,
              username: otherUser.username,
              name: otherUser.name,
              image: otherUser.image
            },
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
              read: lastMessage.read,
              senderId: lastMessage.senderId,
              messageType: lastMessage.messageType
            } : undefined,
            unreadCount,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt || conv.createdAt
          };
        } catch (error) {
          console.error(`Error procesando conversación ${conv.conversationId}:`, error);
          return null;
        }
      })
    );

    // Filtrar nulos y ordenar por fecha de actualización (más reciente primero)
    const filteredConversations = conversationsWithParticipants.filter((conv): conv is NonNullable<typeof conv> => conv !== null);
    
    console.log(`Procesadas ${filteredConversations.length} conversaciones válidas`);
    
    const sortedConversations = filteredConversations.sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    return NextResponse.json(sortedConversations);

  } catch (error) {
    console.error("Error al obtener conversaciones:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

// Versión final corregida usando transacciones adecuadas
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { receiverId } = data;

    if (!receiverId) {
      return NextResponse.json(
        { error: "Se requiere un ID de destinatario" },
        { status: 400 }
      );
    }

    // Verificar que el destinatario exista
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Destinatario no encontrado" },
        { status: 404 }
      );
    }

    // Buscar conversación existente entre los usuarios
    const existingConversations = await prisma.$queryRaw`
      SELECT c.id, c.created_at
      FROM conversations c
      JOIN conversation_participants p1 ON c.id = p1.conversation_id
      JOIN conversation_participants p2 ON c.id = p2.conversation_id
      WHERE p1.user_id = ${session.user.id}
      AND p2.user_id = ${receiverId}
      AND c.is_group = false
      LIMIT 1
    `;

    if (Array.isArray(existingConversations) && existingConversations.length > 0) {
      const conv = existingConversations[0] as any;
      console.log(`Conversación existente encontrada: ${conv.id}`);
      
      return NextResponse.json({
        id: conv.id,
        receiver: {
          id: receiver.id,
          username: receiver.username,
          name: receiver.name,
          image: receiver.image
        },
        createdAt: conv.created_at,
        isNew: false
      });
    }

    // Crear nueva conversación con transacción correcta
    let newConversation;
    try {
      newConversation = await prisma.$transaction(async (tx) => {
        // 1. Crear la conversación
        const conv = await tx.$executeRaw`
          INSERT INTO conversations (id, is_group, created_at, updated_at)
          VALUES (CONCAT('conv_', UUID()), false, NOW(), NOW())
        `;
        
        // Obtener la conversación recién creada
        const createdConv = await tx.$queryRaw`
          SELECT id, created_at 
          FROM conversations 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        if (!Array.isArray(createdConv) || createdConv.length === 0) {
          throw new Error("No se pudo crear la conversación");
        }
        
        const newConv = createdConv[0] as any;
        const conversationId = newConv.id;
        
        // 2. Crear los participantes
        await tx.$executeRaw`
          INSERT INTO conversation_participants (id, user_id, conversation_id, is_admin, joined_at)
          VALUES (CONCAT('cp_', UUID()), ${session.user.id}, ${conversationId}, true, NOW())
        `;
        
        await tx.$executeRaw`
          INSERT INTO conversation_participants (id, user_id, conversation_id, is_admin, joined_at)
          VALUES (CONCAT('cp_', UUID()), ${receiverId}, ${conversationId}, false, NOW())
        `;
        
        return { id: conversationId, createdAt: newConv.created_at };
      });
    } catch (error) {
      console.error("Error en la transacción:", error);
      return NextResponse.json(
        { error: "Error al crear la conversación", details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log(`Nueva conversación creada: ${newConversation.id}`);
    
    return NextResponse.json({
      id: newConversation.id,
      receiver: {
        id: receiver.id,
        username: receiver.username,
        name: receiver.name,
        image: receiver.image
      },
      createdAt: newConversation.createdAt,
      isNew: true
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: (error as Error).message },
      { status: 500 }
    );
  }
}