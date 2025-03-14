import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const session = await auth();
  
  // Verificación de autenticación mejorada
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Debes iniciar sesión para esta acción" },
      { status: 401 }
    );
  }

  try {
    const { userId } = await request.json();

    // Validación de entrada más robusta
    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    // Verificación de seguimiento mutuo optimizada
    const [followsUser, followedByUser] = await Promise.all([
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: session.user.id,
            followingId: userId,
          },
        },
      }),
      prisma.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: userId,
            followingId: session.user.id,
          },
        },
      }),
    ]);

    if (!followsUser || !followedByUser) {
      return NextResponse.json(
        { error: "Requiere seguimiento mutuo para chatear" },
        { status: 403 }
      );
    }

    // Buscar conversación existente con paginación
    const existingMessages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: userId },
          { senderId: userId, receiverId: session.user.id },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 1,
      include: {
        sender: true,
        receiver: true,
      },
    });

    let createdMessage = null;
    
    // Crear mensaje inicial si no existe conversación
    if (existingMessages.length === 0) {
      createdMessage = await prisma.directMessage.create({
        data: {
          content: "¡Hola! He iniciado una conversación contigo.",
          senderId: session.user.id,
          receiverId: userId,
        },
        include: {
          sender: true,
          receiver: true,
        },
      });
    }

    // Obtener último mensaje de la conversación
    const lastMessage = createdMessage || existingMessages[0];

    // Construir estructura completa de la conversación
    const conversationResponse = {
      id: `${session.user.id}-${userId}`, // ID único para la conversación
      senderId: session.user.id,
      receiverId: userId,
      createdAt: lastMessage.createdAt.toISOString(),
      sender: {
        id: session.user.id,
        username: session.user.username,
        image: session.user.image,
      },
      receiver: {
        id: lastMessage.receiver.id,
        username: lastMessage.receiver.username,
        image: lastMessage.receiver.image,
      },
      lastMessage: {
        id: lastMessage.id,
        content: lastMessage.content,
        createdAt: lastMessage.createdAt.toISOString(),
        read: lastMessage.read,
      },
      unreadCount: 0, // Inicializar contador de no leídos
    };

    return NextResponse.json({
      success: true,
      conversation: conversationResponse,
    });

  } catch (error) {
    console.error("Error en creación de conversación:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}