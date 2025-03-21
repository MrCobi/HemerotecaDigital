import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de un mensaje por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: messageId } = await params;

    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
            bio: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
            bio: true,
          }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error al obtener mensaje:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos del mensaje" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar información de un mensaje (marcar como leído)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: messageId } = await params;
    const body = await req.json();

    // Validar que el mensaje existe
    const existingMessage = await prisma.directMessage.findUnique({
      where: { id: messageId },
    });

    if (!existingMessage) {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    // Actualizar el mensaje
    const updatedMessage = await prisma.directMessage.update({
      where: { id: messageId },
      data: {
        read: body.read !== undefined ? body.read : existingMessage.read,
        content: body.content || existingMessage.content
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        }
      }
    });

    return NextResponse.json(updatedMessage);
  } catch (error) {
    console.error("Error al actualizar mensaje:", error);
    return NextResponse.json(
      { error: "Error al actualizar el mensaje" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un mensaje
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: messageId } = await params;

    // Verificar que el mensaje existe
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    // Eliminar el mensaje
    await prisma.directMessage.delete({
      where: { id: messageId },
    });

    return NextResponse.json({ message: "Mensaje eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar mensaje:", error);
    return NextResponse.json(
      { error: "Error al eliminar el mensaje" },
      { status: 500 }
    );
  }
}
