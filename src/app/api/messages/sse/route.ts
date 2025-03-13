import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) return new Response('Missing userId', { status: 400 });

  const encoder = new TextEncoder();
  let isConnectionClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      // Función para verificar mensajes
      const checkMessages = async () => {
        if (isConnectionClosed) return;
        
        try {
          const messages = await prisma.directMessage.findMany({
            where: {
              OR: [
                { AND: [{ senderId: session.user.id }, { receiverId: userId }] },
                { AND: [{ senderId: userId }, { receiverId: session.user.id }] }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 1
          });

          if (messages.length > 0 && !isConnectionClosed) {
            const data = `data: ${JSON.stringify(messages[0])}\n\n`;
            controller.enqueue(encoder.encode(data));
          }
        } catch (error) {
          if (!isConnectionClosed) {
            console.error('Error:', error);
            controller.error(error);
          }
        }
      };

      // Intervalo de verificación
      const interval = setInterval(checkMessages, 2000);

      // Manejar cierre de conexión
      request.signal.addEventListener('abort', () => {
        isConnectionClosed = true;
        clearInterval(interval);
        controller.close();
      });

      // Limpieza
      return () => {
        isConnectionClosed = true;
        clearInterval(interval);
      };
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}