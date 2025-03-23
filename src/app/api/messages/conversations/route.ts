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
    isInitial?: boolean;
  };
  unreadCount: number;
  createdAt: Date;
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

    // 1. Obtener conversaciones únicas con tipo explícito
    const uniqueConversations = await prisma.$queryRaw<ConversationPair[]>`
      SELECT 
        LEAST(sender_id, receiver_id) as user1,
        GREATEST(sender_id, receiver_id) as user2,
        MAX(created_at) as lastMessageDate
      FROM direct_messages
      WHERE sender_id = ${session.user.id} 
        OR receiver_id = ${session.user.id}
      GROUP BY user1, user2
      ORDER BY lastMessageDate DESC
    `;

    // 2. Obtener IDs de los últimos mensajes con tipo seguro
    const conversationPairs = uniqueConversations.map(conv => ({
      user1: conv.user1,
      user2: conv.user2
    }));

    const lastMessages = await prisma.directMessage.findMany({
      where: {
        OR: conversationPairs.map(pair => ({
          AND: [
            { OR: [{ senderId: pair.user1 }, { senderId: pair.user2 }] },
            { OR: [{ receiverId: pair.user1 }, { receiverId: pair.user2 }] }
          ]
        }))
      },
      orderBy: { createdAt: "desc" },
      distinct: ['senderId', 'receiverId'],
      include: {
        sender: true,
        receiver: true
      }
    });

    // 3. Obtener mensajes no leídos
    const unreadCounts = await prisma.directMessage.groupBy({
      by: ["senderId"],
      where: {
        receiverId: session.user.id,
        read: false
      },
      _count: { _all: true }
    });

    // 4. Construir respuesta final
    const formattedConversations: ConversationResponse[] = lastMessages.map(message => {
      const otherUser = message.senderId === session.user.id ? message.receiver : message.sender;
      const conversationId = [message.senderId, message.receiverId]
        .sort()
        .join('-');

      return {
        id: conversationId,
        receiver: {
          id: otherUser?.id || "",
          username: otherUser?.username,
          name: otherUser?.name,
          image: otherUser?.image
        },
        lastMessage: {
          content: message.content,
          createdAt: message.createdAt,
          read: message.read,
        },
        unreadCount: unreadCounts.find(u => u.senderId === otherUser?.id)?._count._all || 0,
        createdAt: message.createdAt
      };
    });

    // Eliminar duplicados y ordenar
    const uniqueConversationsMap = new Map(
      formattedConversations.map(conv => [conv.id, conv])
    );

    const sortedConversations = Array.from(uniqueConversationsMap.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

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