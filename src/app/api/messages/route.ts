import { auth } from "@/auth";
import prisma from "@/lib/db";
import { broadcastMessage } from "@/lib/websocket";
import { NextResponse } from 'next/server';

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
      sender: true,
      receiver: true
    }
  });

  await broadcastMessage(receiverId, message);
  
  return new Response(JSON.stringify(message), { status: 201 });
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

  return NextResponse.json(messages);
}
