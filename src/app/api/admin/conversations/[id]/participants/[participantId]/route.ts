import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

// GET - Obtener un participante específico
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
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

    // Obtener IDs de los params
    const { id: conversationId, participantId } = await params;
    if (!conversationId || !participantId) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // Obtener el participante
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        id: participantId,
        conversationId: conversationId,
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

    if (!participant) {
      return NextResponse.json({ error: "Participante no encontrado" }, { status: 404 });
    }

    return NextResponse.json(participant);
  } catch (error) {
    console.error("Error al obtener participante:", error);
    return NextResponse.json({ error: "Error al obtener el participante" }, { status: 500 });
  }
}

// PATCH - Actualizar rol de un participante
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
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

    // Obtener IDs de los params
    const { id: conversationId, participantId } = await params;
    if (!conversationId || !participantId) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // Obtener datos del cuerpo
    const data = await request.json();
    const { isAdmin } = data;

    if (isAdmin === undefined) {
      return NextResponse.json({ error: "Estado de administrador no proporcionado" }, { status: 400 });
    }

    // Verificar si el participante existe
    const existingParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        id: participantId,
        conversationId: conversationId,
      },
    });

    if (!existingParticipant) {
      return NextResponse.json({ error: "Participante no encontrado" }, { status: 404 });
    }

    // Verificar si el participante es el creador (no se puede cambiar el rol del creador)
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        creatorId: true,
      },
    });

    if (conversation?.creatorId === existingParticipant.userId) {
      return NextResponse.json({ error: "No se puede cambiar el rol del creador del grupo" }, { status: 400 });
    }

    // Actualizar el rol del participante
    const updatedParticipant = await prisma.conversationParticipant.update({
      where: {
        id: participantId,
      },
      data: {
        isAdmin: isAdmin,
        role: isAdmin ? "admin" : "member",
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

    return NextResponse.json(updatedParticipant);
  } catch (error) {
    console.error("Error al actualizar participante:", error);
    return NextResponse.json({ error: "Error al actualizar el participante" }, { status: 500 });
  }
}

// DELETE - Eliminar un participante
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; participantId: string }> }
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

    // Obtener IDs de los params con manejo seguro
    const parameters = await params;
    const conversationId = parameters.id;
    const participantId = parameters.participantId;

    console.log("API - Eliminando participante:", { conversationId, participantId });

    if (!conversationId || !participantId) {
      return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
    }

    // Verificar si el participante existe
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        id: participantId,
        conversationId: conversationId,
      },
      include: {
        user: true,
      },
    });

    if (!participant) {
      return NextResponse.json({ error: "Participante no encontrado" }, { status: 404 });
    }

    // Verificar si el participante es el creador (no se puede eliminar al creador)
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
      select: {
        creatorId: true,
      },
    });

    if (conversation?.creatorId === participant.userId) {
      return NextResponse.json({ error: "No se puede eliminar al creador del grupo" }, { status: 400 });
    }

    // Eliminar el participante
    await prisma.conversationParticipant.delete({
      where: {
        id: participantId,
      },
    });

    return NextResponse.json({ 
      success: true,
      message: "Participante eliminado correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar participante:", error);
    return NextResponse.json({ error: "Error al eliminar el participante" }, { status: 500 });
  }
}
