// src/app/api/messages/conversations/[conversationId]/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// Función auxiliar para determinar si un conversationId es de grupo o privado
// Nota: Esto debe coincidir con la lógica del resto de la aplicación
const _isGroupConversation = (_conversationId: string) => {
  // En la base de datos, todas las conversaciones tienen un campo isGroup
  // No podemos determinar esto solo por el ID, debemos consultar la base de datos
  return true; // Intentaremos buscar ambos tipos y manejarlos adecuadamente
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    // Verificar autenticación
    const session = await auth();
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // El ID puede tener el prefijo "group_", debemos quitarlo
    let { conversationId } = await params;
    const originalId = conversationId; // Guardamos el ID original para la respuesta
    
    // Quitar el prefijo "group_" si existe
    if (conversationId.startsWith('group_')) {
      conversationId = conversationId.replace('group_', '');
    }
    
    console.log(`[API] Recuperando conversación: ${conversationId} (original: ${originalId})`);

    // Buscar la conversación en la base de datos
    const conversation = await prisma.conversation.findUnique({
      where: {
        id: conversationId
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                image: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 1,
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                image: true
              }
            }
          }
        }
      }
    });

    if (!conversation) {
      console.log(`[API] Conversación no encontrada con ID: ${conversationId}`);
      return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
    }

    // Verificar que el usuario actual sea participante
    const isParticipant = conversation.participants.some(p => p.userId === currentUserId);
    if (!isParticipant) {
      console.log(`[API] Usuario ${currentUserId} no es participante de la conversación ${conversationId}`);
      return NextResponse.json({ error: "No autorizado para ver esta conversación" }, { status: 403 });
    }

    // Contar mensajes no leídos
    const unreadCount = await prisma.directMessage.count({
      where: {
        conversationId: conversationId,
        senderId: {
          not: currentUserId
        },
        read: false
      }
    });

    // Formatear respuesta basada en si es una conversación de grupo o privada
    if (conversation.isGroup) {
      // Formatear respuesta para grupo
      const formattedResponse = {
        id: `group_${conversation.id}`,
        name: conversation.name,
        description: conversation.description,
        imageUrl: conversation.imageUrl,
        isGroup: true,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map(p => ({
          id: p.id,
          userId: p.userId,
          role: p.isAdmin ? 'admin' : 'member',
          user: {
            id: p.user.id,
            username: p.user.username,
            name: p.user.name,
            image: p.user.image
          }
        })),
        lastMessage: conversation.messages[0] ? {
          id: conversation.messages[0].id,
          content: conversation.messages[0].content,
          createdAt: conversation.messages[0].createdAt,
          read: conversation.messages[0].read,
          senderId: conversation.messages[0].senderId,
          sender: conversation.messages[0].sender
        } : null,
        unreadCount
      };

      return NextResponse.json(formattedResponse);
    } else {
      // Para conversaciones privadas, formatear con información del otro usuario
      const otherParticipant = conversation.participants.find(p => p.userId !== currentUserId);
      if (!otherParticipant) {
        console.log(`[API] No se encontró el otro participante en la conversación ${conversationId}`);
        return NextResponse.json({ error: "Datos de conversación incompletos" }, { status: 500 });
      }

      // Formatear respuesta para conversación privada
      const formattedResponse = {
        id: conversation.id,
        isGroup: false,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        participants: conversation.participants.map(p => ({
          id: p.id,
          userId: p.userId,
          role: 'member',
          user: {
            id: p.user.id,
            username: p.user.username,
            name: p.user.name,
            image: p.user.image
          }
        })),
        receiver: {
          id: otherParticipant.user.id,
          username: otherParticipant.user.username,
          name: otherParticipant.user.name,
          image: otherParticipant.user.image
        },
        lastMessage: conversation.messages[0] ? {
          id: conversation.messages[0].id,
          content: conversation.messages[0].content,
          createdAt: conversation.messages[0].createdAt,
          read: conversation.messages[0].read,
          senderId: conversation.messages[0].senderId,
          sender: conversation.messages[0].sender
        } : null,
        unreadCount
      };

      return NextResponse.json(formattedResponse);
    }
  } catch (error) {
    console.error("[API] Error al obtener conversación:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}
