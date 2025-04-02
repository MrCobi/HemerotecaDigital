import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../../lib/auth-utils";

// GET para obtener el número de mensajes no leídos
export const GET = withAuth(async (_request: Request, { userId }: { userId: string }) => {
  try {
    console.log('Contando mensajes no leídos para usuario:', userId);

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

    console.log('Mensajes directos no leídos:', directMessagesUnread);

    // Obtener las conversaciones grupales del usuario
    const userGroupConversations = await prisma.conversationParticipant.findMany({
      where: {
        userId: userId,
        conversation: {
          isGroup: true
        }
      },
      include: {
        conversation: true
      }
    });

    console.log('Conversaciones grupales encontradas:', userGroupConversations.length);

    // Contar mensajes no leídos para cada grupo
    let groupMessagesUnread = 0;
    for (const conv of userGroupConversations) {
      // Obtener el último mensaje leído en este grupo
      const lastReadTime = conv.lastReadAt || new Date(0);
      
      const unreadCount = await prisma.directMessage.count({
        where: {
          conversationId: conv.conversationId,
          senderId: {
            not: userId // No contar los mensajes que el usuario envió
          },
          createdAt: {
            gt: lastReadTime
          }
        }
      });

      console.log('Grupo:', conv.conversationId, 'Última lectura:', lastReadTime, 'Mensajes no leídos:', unreadCount);
      groupMessagesUnread += unreadCount;
    }

    console.log('Total mensajes de grupo no leídos:', groupMessagesUnread);

    // Sumar ambos contadores
    const totalUnread = directMessagesUnread + groupMessagesUnread;
    console.log('Total mensajes no leídos:', totalUnread);

    return NextResponse.json({ count: totalUnread });
  } catch (error) {
    console.error("Error al contar mensajes no leídos:", error);
    return NextResponse.json(
      { error: "Error al contar mensajes no leídos" },
      { status: 500 }
    );
  }
});
