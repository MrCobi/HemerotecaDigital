import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

// GET - Obtener una conversación específica por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // Obtener la conversación completa con todos los detalles
    const conversation = await prisma.conversation.findUnique({
      where: {
        id,
      },
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            sender: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        settings: true,
        _count: {
          select: {
            messages: true,
            participants: true,
          },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Error al obtener conversación:", error);
    return NextResponse.json({ error: "Error al obtener la conversación" }, { status: 500 });
  }
}

// DELETE - Eliminar una conversación
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;

    // Verificar si la conversación existe
    const conversation = await prisma.conversation.findUnique({
      where: {
        id,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Eliminar la conversación y toda su información relacionada
    await prisma.conversation.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar conversación:", error);
    return NextResponse.json({ error: "Error al eliminar la conversación" }, { status: 500 });
  }
}

// PATCH - Actualizar información de la conversación
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const data = await request.json();

    // Verificar si la conversación existe
    const conversationExists = await prisma.conversation.findUnique({
      where: {
        id,
      },
    });

    if (!conversationExists) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Actualizar la conversación
    const updatedConversation = await prisma.conversation.update({
      where: {
        id,
      },
      data,
      include: {
        participants: {
          include: {
            user: true,
          },
        },
        messages: {
          include: {
            sender: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        settings: true,
      },
    });

    return NextResponse.json(updatedConversation);
  } catch (error) {
    console.error("Error al actualizar conversación:", error);
    return NextResponse.json({ error: "Error al actualizar la conversación" }, { status: 500 });
  }
}
