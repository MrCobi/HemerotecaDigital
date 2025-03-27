import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { MessageType } from "@prisma/client";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de un mensaje por ID
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: messageId } = await context.params;

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
        },
        conversation: {
          select: {
            id: true,
            name: true,
            isGroup: true,
            imageUrl: true,
            description: true,
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                    email: true,
                  }
                }
              }
            }
          }
        },
        readBy: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              }
            }
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                username: true,
              }
            }
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
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: messageId } = await context.params;
    const body = await req.json();

    // Validar que el mensaje existe
    const existingMessage = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          select: {
            isGroup: true
          }
        }
      }
    });

    if (!existingMessage) {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    // Actualizar el mensaje
    const updateData: {
      read?: boolean;
      content?: string;
      messageType?: MessageType;
      mediaUrl?: string;
    } = {};
    
    // Solo actualizar campos proporcionados
    if (body.read !== undefined) {
      updateData.read = body.read;
    }
    
    if (body.content !== undefined) {
      updateData.content = body.content;
    }
    
    // Actualizar el tipo de mensaje si se proporciona
    if (body.messageType !== undefined) {
      updateData.messageType = body.messageType;
    }
    
    // Actualizar la URL del media si se proporciona
    if (body.mediaUrl !== undefined) {
      updateData.mediaUrl = body.mediaUrl;
    }

    const updatedMessage = await prisma.directMessage.update({
      where: { id: messageId },
      data: updateData,
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
        },
        conversation: {
          select: {
            id: true,
            name: true,
            isGroup: true,
          }
        }
      }
    });

    // Si estamos marcando como leído un mensaje grupal y el administrador lo está leyendo,
    // registrarlo en MessageRead
    if (body.read === true && existingMessage.conversation.isGroup) {
      const session = await auth();
      const userId = session?.user?.id;

      if (userId) {
        // Verificar si ya existe un registro de lectura para este usuario y mensaje
        const existingRead = await prisma.messageRead.findFirst({
          where: {
            messageId,
            userId
          }
        });

        if (!existingRead) {
          await prisma.messageRead.create({
            data: {
              messageId,
              userId
            }
          });
        }
      }
    }

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
  context: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: messageId } = await context.params;

    // Verificar que el mensaje existe
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    // Primero eliminar los registros de lectura relacionados con este mensaje (si existen)
    await prisma.messageRead.deleteMany({
      where: { messageId }
    });

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
