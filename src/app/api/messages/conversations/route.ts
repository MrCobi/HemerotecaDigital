// src/app/api/messages/conversations/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

interface ConversationPair {
  user1: string;
  user2: string;
  lastMessageDate: Date;
}

export interface ConversationResponse {
  id: string;
  receiver: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  lastMessage?: {
    content: string;
    createdAt: Date;
    read: boolean;
    isInitial?: boolean;
  };
  unreadCount: number;
  createdAt: Date;
}

export async function GET() {
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
          id: otherUser.id,
          username: otherUser.username,
          name: otherUser.name,
          image: otherUser.image
        },
        lastMessage: {
          content: message.content,
          createdAt: message.createdAt,
          read: message.read,
        },
        unreadCount: unreadCounts.find(u => u.senderId === otherUser.id)?._count._all || 0,
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