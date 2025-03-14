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
        'Content-Type': 'application/json'
      }
    });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return new Response('Missing userId', { 
    status: 400,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  try {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isActive = true;
        let lastChecked = new Date();
        let interval = 2000; // Intervalo inicial de 2s

        const checkMessages = async () => {
          if (!isActive) return;

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

            if (messages.length > 0 && isActive) {
              lastChecked = new Date();
              const data = `data: ${JSON.stringify(messages[0])}\n\n`;
              controller.enqueue(encoder.encode(data));
              interval = 2000; // Resetear intervalo si hay mensajes
            } else {
              interval = Math.min(interval * 2, 30000); // Aumentar gradualmente hasta 30s
            }
          } catch (error) {
            console.error('Error checking messages:', error);
            interval = 30000; // Intervalo más largo en errores
          } finally {
            if (isActive) {
              setTimeout(checkMessages, interval);
            }
          }
        };

        const cleanup = () => {
          isActive = false;
          controller.close();
        };

        request.signal.addEventListener('abort', cleanup);
        await checkMessages();

        return () => {
          request.signal.removeEventListener('abort', cleanup);
          cleanup();
        };
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      },
    });
    
  } catch (error) {
    console.error('SSE Error:', error);
    return new Response('Internal Server Error', { 
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}