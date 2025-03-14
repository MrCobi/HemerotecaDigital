import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  try {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let lastCheck = new Date();
        let interval = 5000; // Intervalo inicial de 5 segundos
        let isActive = true;

        const pollMessages = async () => {
          if (!isActive) return;

          try {
            const messages = await prisma.directMessage.findMany({
              where: {
                OR: [
                  { receiverId: session.user.id },
                  { senderId: session.user.id }
                ],
                createdAt: { gt: lastCheck }
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

            if (messages.length > 0) {
              lastCheck = new Date();
              interval = 5000; // Resetear a 5s si hay novedades
              messages.forEach(msg => {
                const conversationId = [msg.senderId, msg.receiverId]
                  .sort()
                  .join('-');
                
                const eventData = {
                  conversationId,
                  message: {
                    ...msg,
                    createdAt: msg.createdAt.toISOString()
                  }
                };
                
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(eventData)}\n\n`));
              });
            } else {
              interval = Math.min(interval * 2, 30000); // Aumentar gradualmente hasta 30s
            }
          } catch (error) {
            console.error('Polling error:', error);
            interval = 30000; // Reset a 30s en errores
          } finally {
            if (isActive) {
              setTimeout(pollMessages, interval);
            }
          }
        };

        const abortHandler = () => {
          isActive = false;
          controller.close();
        };

        request.signal.addEventListener('abort', abortHandler);
        await pollMessages();

        return () => {
          request.signal.removeEventListener('abort', abortHandler);
          isActive = false;
        };
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });

  } catch (error) {
    console.error('SSE Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}