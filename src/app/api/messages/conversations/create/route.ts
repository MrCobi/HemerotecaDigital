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

    // Buscar o crear el mensaje inicial
    let lastMessage = await prisma.directMessage.findFirst({
      where: {
        OR: [
          {
            senderId: session.user.id,
            receiverId: userId,
          },
          {
            senderId: userId,
            receiverId: session.user.id,
          },
        ],
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    // Si no existe un mensaje, crear uno inicial
    if (!lastMessage) {
      lastMessage = await prisma.directMessage.create({
        data: {
          content: "¡Hola! He iniciado una conversación contigo.",
          senderId: session.user.id,
          receiverId: userId,
          read: false,
        },
        include: {
          sender: true,
          receiver: true,
        },
      });
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

    // Construir ID de conversación (ordenado para consistencia)
    const conversationId = [session.user.id, userId].sort().join("-");

    // Crear respuesta estructurada
    const conversation = {
      id: conversationId,
      senderId: session.user.id,
      receiverId: userId,
      otherUser: otherUser,
      lastMessage: {
        id: lastMessage.id,
        content: lastMessage.content,
        createdAt: lastMessage.createdAt.toISOString(),
        read: lastMessage.read,
        senderId: lastMessage.senderId,
        receiverId: lastMessage.receiverId,
      },
      unreadCount: 0,
      createdAt: lastMessage.createdAt.toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json({
      conversation,
      message: "Conversación iniciada correctamente",
    });
  } catch (error) {
    console.error("Error creando conversación:", error);
    return NextResponse.json(
      { error: "Error del servidor", details: (error as Error).message },
      { status: 500 }
    );
  }
}
