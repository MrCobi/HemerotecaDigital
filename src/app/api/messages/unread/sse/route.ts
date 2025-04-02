import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../../lib/auth-utils";

// Endpoint SSE para mensajes no leídos
export const GET = withAuth(async (
  req: Request,
  { userId }: { userId: string }
) => {
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  let interval: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    if (controller) {
      try {
        controller.close();
      } catch (error) {
        console.error("Error al cerrar el controlador:", error);
      }
      controller = null;
    }
  };

  // Función para obtener el contador de mensajes no leídos
  const getUnreadCount = async () => {
    try {
      // Contar mensajes directos no leídos (conversaciones 1:1)
      const directMessagesUnread = await prisma.directMessage.count({
        where: {
          conversation: {
            isGroup: false,
            participants: {
              some: {
                userId: userId
              }
            }
          },
          senderId: {
            not: userId // No contar los mensajes que el usuario envió
          },
          read: false
        }
      });

      // Obtener las conversaciones grupales del usuario con su última lectura
      const userGroupConversations = await prisma.conversationParticipant.findMany({
        where: {
          userId: userId,
          conversation: {
            isGroup: true
          }
        },
        select: {
          conversationId: true,
          lastReadAt: true
        }
      });

      // Contar mensajes no leídos para cada grupo
      let groupMessagesUnread = 0;
      for (const conv of userGroupConversations) {
        const unreadCount = await prisma.directMessage.count({
          where: {
            conversationId: conv.conversationId,
            senderId: {
              not: userId // No contar los mensajes que el usuario envió
            },
            createdAt: conv.lastReadAt ? {
              gt: conv.lastReadAt
            } : undefined
          }
        });
        groupMessagesUnread += unreadCount;
      }

      return directMessagesUnread + groupMessagesUnread;
    } catch (error) {
      console.error("Error al obtener mensajes no leídos:", error);
      return null;
    }
  };

  // Función para enviar un evento SSE de manera segura
  const sendEvent = (data: any) => {
    if (!controller) return;
    
    try {
      const event = `data: ${JSON.stringify(data)}\n\n`;
      controller.enqueue(encoder.encode(event));
    } catch (error) {
      console.error("Error al enviar evento SSE:", error);
      cleanup();
    }
  };

  // Crear el stream
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Enviar el contador inicial
      getUnreadCount().then(count => {
        if (count !== null) {
          sendEvent({ type: 'initial', count });
        }
      });

      // Configurar el intervalo para actualizaciones
      interval = setInterval(async () => {
        const count = await getUnreadCount();
        if (count !== null) {
          sendEvent({ type: 'update', count });
        }
      }, 5000);

      // Manejar la finalización del stream
      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      cleanup();
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
});
