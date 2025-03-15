import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return new Response('Missing userId', { status: 400 });

  try {
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let isActive = true;
        let lastChecked = Date.now();
        let interval = 800;

        const checkMessages = async () => {
          if (!isActive) return;

          try {
            const messages = await prisma.directMessage.findMany({
              where: {
                OR: [
                  { senderId: session.user.id, receiverId: userId },
                  { senderId: userId, receiverId: session.user.id }
                ],
                createdAt: { gt: new Date(lastChecked) }
              },
              orderBy: { createdAt: 'desc' },
              take: 5,
              select: {
                id: true,
                content: true,
                senderId: true,
                receiverId: true,
                read: true,
                createdAt: true
              }
            });

            if (messages.length > 0) {
              lastChecked = Date.now();
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ messages, _ts: Date.now() })}\n\n`
              ));
              interval = 800;
            } else {
              interval = Math.min(interval * 1.5, 5000);
            }
          } catch (error) {
            interval = 2000;
          } finally {
            if (isActive) setTimeout(checkMessages, interval);
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
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Importante para Nginx
      }
    });
    
  } catch (error) {
    console.error('SSE Error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}