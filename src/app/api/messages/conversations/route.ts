import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

interface Conversation {
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

    // 1. Obtener conversaciones agrupadas
    const groupedMessages = await prisma.directMessage.groupBy({
      by: ["senderId", "receiverId", "createdAt"], // Añadido createdAt al groupBy
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      orderBy: {
        createdAt: "desc"
      },
      _max: {
        id: true
      },
      _count: {
        _all: true
      }
    });

    // 2. Obtener últimos mensajes
    const lastMessageIds = groupedMessages
      .map(g => g._max.id)
      .filter((id): id is string => !!id);

    const lastMessages = await prisma.directMessage.findMany({
      where: { id: { in: lastMessageIds } },
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

    // 4. Mapeo final con tipos seguros
    const formattedConversations: Conversation[] = groupedMessages
      .filter(g => g._max.id) // Filtrar nulls
      .map(g => {
        const otherUserId = g.senderId === session.user.id 
          ? g.receiverId 
          : g.senderId;

        const lastMessage = lastMessages.find(m => m.id === g._max.id);
        const unread = unreadCounts.find(u => u.senderId === otherUserId)?._count._all || 0;

        return {
          id: `${session.user.id}-${otherUserId}`,
          receiver: {
            id: otherUserId,
            username: lastMessage?.receiver.username || null,
            name: lastMessage?.receiver.name || null,
            image: lastMessage?.receiver.image || null
          },
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            createdAt: lastMessage.createdAt,
            read: lastMessage.read
          } : undefined,
          unreadCount: unread,
          createdAt: g.createdAt // Usar el createdAt del groupBy
        };
      });

    return NextResponse.json(formattedConversations);

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