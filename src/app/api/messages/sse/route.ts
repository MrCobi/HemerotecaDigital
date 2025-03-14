// src/app/api/messages/sse/route.ts
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { 
      status: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return new Response('Missing userId', { 
    status: 400,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    }
  });

  try {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isActive = true;
        let lastChecked = new Date();

        const checkMessages = async () => {
          try {
            const messages = await prisma.directMessage.findMany({
              where: {
                OR: [
                  { senderId: session.user.id, receiverId: userId },
                  { senderId: userId, receiverId: session.user.id }
                ],
                createdAt: { gt: lastChecked }
              },
              orderBy: { createdAt: 'desc' },
              take: 1
            });

            if (messages.length > 0) {
              lastChecked = new Date();
              const data = `data: ${JSON.stringify(messages[0])}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          } catch (error) {
            console.error('Error checking messages:', error);
          }
        };

        const interval = setInterval(checkMessages, 2000);

        // Manejar cierre de conexión
        request.signal.addEventListener('abort', () => {
          clearInterval(interval);
          controller.close();
        });

        // Verificación inicial
        await checkMessages();
      },
      cancel() {
        console.log('Connection closed by client');
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET'
      },
    });
    
  } catch (error) {
    console.error('SSE Error:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json'
      }
    });
  }
}