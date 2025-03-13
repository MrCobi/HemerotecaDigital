import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextResponse } from 'next/server';

// Enviar mensaje
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  const { receiverId, content } = await req.json();
  
  // Verificar seguimiento mutuo
  const isMutualFollow = await prisma.follow.findFirst({
    where: {
      followerId: session.user.id,
      followingId: receiverId,
      following: {
        followers: {
          some: {
            followerId: receiverId
          }
        }
      }
    }
  });

  if (!isMutualFollow) {
    return NextResponse.json({ error: 'Deben seguirse mutuamente' }, { status: 403 });
  }

  const message = await prisma.directMessage.create({
    data: {
      content,
      senderId: session.user.id,
      receiverId,
      read: false
    }
  });

  return NextResponse.json(message);
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
