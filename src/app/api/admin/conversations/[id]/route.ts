import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

// GET - Obtener una conversación específica por ID
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

    // Obtener la conversación completa con todos los detalles
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
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
            readBy: {
              include: {
                user: true,
              }
            },
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

    // Obtener el creador de la conversación si existe creatorId
    let creator = null;
    if (conversation.creatorId) {
      creator = await prisma.user.findUnique({
        where: {
          id: conversation.creatorId
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true
        }
      });
    }

    // Devolver la conversación con el creador
    // Usamos JSON.parse(JSON.stringify()) para crear un objeto plano serializable
    const conversationWithCreator = {
      ...JSON.parse(JSON.stringify(conversation)),
      creator
    };
    
    return NextResponse.json(conversationWithCreator);
  } catch (error) {
    console.error("Error al obtener conversación:", error);
    return NextResponse.json({ error: "Error al obtener la conversación" }, { status: 500 });
  }
}

// DELETE - Eliminar una conversación específica
export async function DELETE(
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

    // Eliminar la conversación y toda su información relacionada
    await prisma.conversation.delete({
      where: {
        id: conversationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar conversación:", error);
    return NextResponse.json({ error: "Error al eliminar la conversación" }, { status: 500 });
  }
}

// PATCH - Actualizar una conversación específica
export async function PATCH(
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

    const { id: conversationId } = await params;
    if (!conversationId) {
      return NextResponse.json({ error: "ID de conversación no proporcionado" }, { status: 400 });
    }

    const data = await request.json();

    // Verificar si la conversación existe
    const conversationExists = await prisma.conversation.findUnique({
      where: {
        id: conversationId,
      },
    });

    if (!conversationExists) {
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Actualizar la conversación
    const updatedConversation = await prisma.conversation.update({
      where: {
        id: conversationId,
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
