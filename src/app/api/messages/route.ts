import { auth } from "@/auth";
import prisma from "@/lib/db";
import { broadcastMessage } from "@/lib/websocket";
import { NextResponse } from 'next/server';

// Definir tipo para el mensaje serializado
type Message = {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
  sender: {
    id: string;
    username: string | null;
    image: string | null;
  };
  receiver: {
    id: string;
    username: string | null;
    image: string | null;
  };
};

// Enviar mensaje
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const { receiverId, content } = await request.json();
  
  const message = await prisma.directMessage.create({
    data: {
      content,
      senderId: session.user.id,
      receiverId,
    },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          image: true
        }
      },
      receiver: {
        select: {
          id: true,
          username: true,
          image: true
        }
      }
    }
  });

  // Serializar las fechas a strings
  const sanitizedMessage: Message = {
    ...message,
    createdAt: message.createdAt.toISOString(),
    read: Boolean(message.read),
    sender: {
      ...message.sender,
      username: message.sender.username || null,
      image: message.sender.image || null
    },
    receiver: {
      ...message.receiver,
      username: message.receiver.username || null,
      image: message.receiver.image || null
    }
  };

  await broadcastMessage(receiverId, sanitizedMessage);
  
  return new Response(JSON.stringify(sanitizedMessage), { status: 201 });
}

// Obtener conversación
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const otherUserId = searchParams.get('userId');

  if (!otherUserId) {
    return NextResponse.json({ error: 'ID de usuario requerido' }, { status: 400 });
  }

  const messages = await prisma.directMessage.findMany({
    where: {
      OR: [
        { senderId: session.user.id, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: session.user.id }
      ]
    },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      content: true,
      senderId: true,
      receiverId: true,
      read: true,
      createdAt: true,
      sender: {
        select: {
          id: true,
          username: true,
          image: true
        }
      },
      receiver: {
        select: {
          id: true,
          username: true,
          image: true
        }
      }
    }
  });

  // Serializar los mensajes
  const sanitizedMessages: Message[] = messages.map(message => ({
    ...message,
    createdAt: message.createdAt.toISOString(),
    read: Boolean(message.read),
    sender: {
      ...message.sender,
      username: message.sender.username || null,
      image: message.sender.image || null
    },
    receiver: {
      ...message.receiver,
      username: message.receiver.username || null,
      image: message.receiver.image || null
    }
  }));

  return NextResponse.json(sanitizedMessages);
}