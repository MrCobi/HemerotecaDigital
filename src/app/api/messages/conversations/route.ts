import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextResponse } from 'next/server';

// Obtener todas las conversaciones del usuario
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
  }

  try {
    const conversations = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id },
          { receiverId: session.user.id }
        ]
      },
      distinct: ['senderId', 'receiverId'],
      orderBy: { createdAt: 'desc' },
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

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error al obtener conversaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener conversaciones' },
      { status: 500 }
    );
  }
}
