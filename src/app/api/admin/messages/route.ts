import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todos los mensajes con sus relaciones
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    // Obtener mensajes con información de remitente, destinatario y conversación
    const messages = await prisma.directMessage.findMany({
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
          }
        },
        conversation: {
          select: {
            id: true,
            name: true,
            isGroup: true,
            imageUrl: true,
            participants: {
              select: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    username: true,
                    image: true,
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error al obtener mensajes:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de mensajes" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo mensaje (como administrador)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validar datos requeridos
    if (!body.content && !body.mediaUrl) {
      return NextResponse.json(
        { error: "Se requiere contenido o un archivo multimedia" },
        { status: 400 }
      );
    }

    if (!body.senderId) {
      return NextResponse.json(
        { error: "ID de remitente es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el remitente existe
    const senderExists = await prisma.user.findUnique({
      where: { id: body.senderId },
    });

    if (!senderExists) {
      return NextResponse.json(
        { error: "El usuario remitente especificado no existe" },
        { status: 400 }
      );
    }

    let conversationId = body.conversationId;

    // Si no tenemos un ID de conversación pero tenemos un destinatario, 
    // podemos estar creando un mensaje para un chat individual
    if (!conversationId && body.recipientId) {
      // Verificar que el destinatario existe
      const recipientExists = await prisma.user.findUnique({
        where: { id: body.recipientId },
      });

      if (!recipientExists) {
        return NextResponse.json(
          { error: "El usuario destinatario especificado no existe" },
          { status: 400 }
        );
      }

      // Verificar que no se está enviando un mensaje a uno mismo
      if (body.senderId === body.recipientId) {
        return NextResponse.json(
          { error: "Un usuario no puede enviarse un mensaje a sí mismo" },
          { status: 400 }
        );
      }

      // Buscar una conversación existente entre estos dos usuarios
      const existingConversation = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            every: {
              userId: {
                in: [body.senderId, body.recipientId]
              }
            }
          },
          AND: [
            {
              participants: {
                some: {
                  userId: body.senderId
                }
              }
            },
            {
              participants: {
                some: {
                  userId: body.recipientId
                }
              }
            }
          ]
        }
      });

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Crear una nueva conversación si no existe
        const newConversation = await prisma.conversation.create({
          data: {
            isGroup: false,
            participants: {
              create: [
                { userId: body.senderId, isAdmin: true },
                { userId: body.recipientId, isAdmin: false }
              ]
            }
          }
        });
        conversationId = newConversation.id;
      }
    } else if (!conversationId) {
      return NextResponse.json(
        { error: "Se requiere ID de conversación o ID de destinatario" },
        { status: 400 }
      );
    } else {
      // Verificar que la conversación existe
      const conversationExists = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: true
        }
      });

      if (!conversationExists) {
        return NextResponse.json(
          { error: "La conversación especificada no existe" },
          { status: 400 }
        );
      }

      // Verificar que el remitente es parte de la conversación
      const isSenderParticipant = conversationExists.participants.some(
        (p) => p.userId === body.senderId
      );

      if (!isSenderParticipant) {
        return NextResponse.json(
          { error: "El remitente no es parte de esta conversación" },
          { status: 400 }
        );
      }
    }

    // Determinar el tipo de mensaje
    const messageType = body.messageType || 
      (body.mediaUrl ? (
        body.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image" :
        body.mediaUrl.match(/\.(mp3|wav|ogg)$/i) ? "voice" :
        body.mediaUrl.match(/\.(mp4|webm|mov)$/i) ? "video" :
        body.mediaUrl.match(/\.(pdf|doc|docx|xls|xlsx|txt)$/i) ? "file" : "text"
      ) : "text");

    // Crear el nuevo mensaje
    const newMessage = await prisma.directMessage.create({
      data: {
        content: body.content,
        mediaUrl: body.mediaUrl,
        messageType,
        senderId: body.senderId,
        receiverId: body.recipientId || null,
        conversationId,
        read: false
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

    // Si es un mensaje grupal, registrar una entrada en MessageRead para el remitente
    if (newMessage.conversation.isGroup) {
      await prisma.messageRead.create({
        data: {
          messageId: newMessage.id,
          userId: body.senderId
        }
      });
    }

    // Registrar actividad para el remitente
    let targetName = newMessage.receiver?.username || newMessage.receiver?.name || "";
    let targetId = body.recipientId || "";
    let details = `Enviaste un mensaje a ${targetName}`;

    if (newMessage.conversation.isGroup) {
      targetName = newMessage.conversation.name || "un grupo";
      targetId = newMessage.conversation.id;
      details = `Enviaste un mensaje al grupo ${targetName}`;
    }

    await prisma.activityHistory.create({
      data: {
        userId: body.senderId,
        type: "MESSAGE_SENT",
        sourceName: null,
        sourceId: null,
        targetName,
        targetId,
        targetType: newMessage.conversation.isGroup ? "group" : "user",
        details,
        createdAt: new Date()
      } as any
    });

    return NextResponse.json(newMessage, { status: 201 });
  } catch (error) {
    console.error("Error al crear mensaje:", error);
    return NextResponse.json(
      { error: "Error al crear el mensaje" },
      { status: 500 }
    );
  }
}
