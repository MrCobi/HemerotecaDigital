// src/app/api/messages/conversation/create/route.ts
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request): Promise<NextResponse>  {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { error: "Debes iniciar sesión" },
        { status: 401 }
      );
    }

    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Se requiere ID de usuario" },
        { status: 400 }
      );
    }

    // Verificar seguimiento mutuo
    const relationship = await prisma.follow.findFirst({
      where: {
        OR: [
          {
            followerId: session.user.id,
            followingId: userId,
          },
          {
            followerId: userId,
            followingId: session.user.id,
          },
        ],
      },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: "No hay una relación de seguimiento" },
        { status: 403 }
      );
    }

    // Obtener la información del otro usuario
    const otherUser = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
      },
    });

    if (!otherUser) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Buscar si ya existe una conversación entre estos usuarios
    let conversation = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        participants: {
          every: {
            userId: {
              in: [session.user.id, userId],
            },
          },
        },
      },
      include: {
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: true,
            receiver: true,
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
                { userId: session.user.id },
                { userId: userId },
              ],
            },
          },
        },
        include: {
          messages: {
            take: 1,
            include: {
              sender: true,
              receiver: true,
            },
          },
        },
      });

      // Crear mensaje inicial
      await prisma.directMessage.create({
        data: {
          content: "¡Hola! He iniciado una conversación contigo.",
          senderId: session.user.id,
          receiverId: userId,
          conversationId: conversation.id,
          read: false,
        },
      });
    }

    // Obtener el último mensaje de la conversación
    const lastMessage = await prisma.directMessage.findFirst({
      where: {
        conversationId: conversation.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Calcular mensajes no leídos para el usuario actual
    const unreadCount = await prisma.directMessage.count({
      where: {
        conversationId: conversation.id,
        senderId: { not: session.user.id },
        read: false,
      },
    });

    // Construir respuesta estructurada
    const response = {
      conversation: {
        id: conversation.id,
        senderId: session.user.id,
        receiverId: userId,
        otherUser: otherUser,
        lastMessage: lastMessage ? {
          id: lastMessage.id,
          content: lastMessage.content,
          createdAt: lastMessage.createdAt.toISOString(),
          read: lastMessage.read,
          senderId: lastMessage.senderId,
          receiverId: lastMessage.receiverId,
        } : null,
        unreadCount,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      },
      message: "Conversación iniciada correctamente",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error creando conversación:", error);
    return NextResponse.json(
      { error: "Error del servidor", details: (error as Error).message },
      { status: 500 }
    );
  }
}
