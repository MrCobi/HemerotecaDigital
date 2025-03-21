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
    // Obtener mensajes con información de remitente y destinatario
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
    if (!body.content || !body.senderId || !body.recipientId) {
      return NextResponse.json(
        { error: "Contenido, ID de remitente e ID de destinatario son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que los usuarios existen
    const senderExists = await prisma.user.findUnique({
      where: { id: body.senderId },
    });

    if (!senderExists) {
      return NextResponse.json(
        { error: "El usuario remitente especificado no existe" },
        { status: 400 }
      );
    }

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

    // Crear el nuevo mensaje
    const newMessage = await prisma.directMessage.create({
      data: {
        content: body.content,
        senderId: body.senderId,
        receiverId: body.recipientId,
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
        }
      }
    });

    // Registrar actividad para el remitente
    await prisma.activityHistory.create({
      data: {
        userId: body.senderId,
        type: "MESSAGE_SENT",
        sourceName: null,
        sourceId: null,
        targetName: recipientExists.username || recipientExists.name || "",
        targetId: body.recipientId,
        targetType: "user",
        details: `Enviaste un mensaje a ${recipientExists.username || recipientExists.name || ""}`,
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
