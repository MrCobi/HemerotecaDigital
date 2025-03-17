// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { messageEvents } from "./sse-messages/route";

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
        createdAt: true,
        read: true
      }
    });
    
    const optimizedMessage = {
      id: message.id,
      content,
      senderId: session.user.id,
      receiverId,
      read: message.read,
      createdAt: message.createdAt.toISOString()
    };
    
    // Notificar a través de SSE al remitente y al destinatario
    console.log('Broadcasting message through SSE:', optimizedMessage);
    messageEvents.sendMessage(receiverId, optimizedMessage);
    messageEvents.sendMessage(session.user.id, optimizedMessage);
    
    return new Response(JSON.stringify(optimizedMessage), { 
      status: 201,
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
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

    return NextResponse.json(optimizedMessages, { 
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}