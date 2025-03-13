import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: "Se requiere el ID del usuario" },
        { status: 400 }
      );
    }

    // Verificar que existe seguimiento mutuo
    const followsUser = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: userId,
        },
      },
    });

    const followedByUser = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: session.user.id,
        },
      },
    });

    if (!followsUser || !followedByUser) {
      return NextResponse.json(
        { error: "No hay seguimiento mutuo entre los usuarios" },
        { status: 403 }
      );
    }

    // Buscar si ya existe una conversación con mensajes entre estos usuarios
    const existingMessages = await prisma.directMessage.findFirst({
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
    });

    if (!existingMessages) {
      // Crear un mensaje inicial para establecer la conversación
      await prisma.directMessage.create({
        data: {
          content: "¡Hola! He iniciado una conversación contigo.",
          senderId: session.user.id,
          receiverId: userId,
        },
      });
    }

    // Obtener el usuario con el que se está iniciando la conversación
    const otherUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        image: true,
      },
    });

    return NextResponse.json({
      success: true,
      otherUser: otherUser,
    });
  } catch (error) {
    console.error("Error al crear conversación:", error);
    return NextResponse.json(
      { error: "Error al crear conversación" },
      { status: 500 }
    );
  }
}
