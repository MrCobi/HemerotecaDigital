// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { broadcastMessage } from "@/lib/websocket";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  try {
    const { receiverId, content } = await request.json();
    
    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId: session.user.id,
        receiverId,
      },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        read: true,
        createdAt: true,
        sender: { select: { id: true, username: true, image: true } },
        receiver: { select: { id: true, username: true, image: true } }
      }
    });

    const optimizedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
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

    await broadcastMessage(receiverId, optimizedMessage);
    
    return new Response(JSON.stringify(optimizedMessage), { 
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get('userId');
    
    if (!otherUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
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
        sender: { select: { id: true, username: true, image: true } },
        receiver: { select: { id: true, username: true, image: true } }
      }
    });

    const optimizedMessages = messages.map(message => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
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

    return NextResponse.json(optimizedMessages);
    
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}