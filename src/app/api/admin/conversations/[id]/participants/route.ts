import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

// GET - Obtener los participantes de una conversación
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar sesión y permisos de administrador
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    // Obtener el ID de conversación de los params
    const { id: conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "ID de conversación no proporcionado" }, { status: 400 });
    }

    // Obtener los participantes con sus datos de usuario
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        joinedAt: "asc",
      },
    });

    return NextResponse.json(participants);
  } catch (error) {
    console.error("Error al obtener participantes:", error);
    return NextResponse.json({ error: "Error al obtener los participantes" }, { status: 500 });
  }
}

// POST - Añadir un participante a la conversación
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar sesión y permisos de administrador
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    // Obtener el ID de conversación de los params
    const { id: conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "ID de conversación no proporcionado" }, { status: 400 });
    }

    // Verificar si la conversación existe
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Obtener el ID de usuario del cuerpo de la solicitud
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario no proporcionado" }, { status: 400 });
    }

    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si el usuario ya es participante
    const existingParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId,
        userId,
      },
    });

    if (existingParticipant) {
      return NextResponse.json({ error: "El usuario ya es participante de esta conversación" }, { status: 400 });
    }

    // Nota: Normalmente habría una verificación de seguimiento mutuo aquí,
    // pero los administradores pueden saltarse esta restricción

    // Añadir el usuario como participante
    const participant = await prisma.conversationParticipant.create({
      data: {
        conversationId,
        userId,
        isAdmin: false,
        role: "member",
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    // Obtener la conversación actualizada con todos los participantes
    const updatedConversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ 
      participant,
      conversation: updatedConversation
    });
  } catch (error) {
    console.error("Error al añadir participante:", error);
    return NextResponse.json({ error: "Error al añadir el participante" }, { status: 500 });
  }
}
