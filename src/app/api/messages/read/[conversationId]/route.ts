import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../../lib/auth-utils";

// PUT para marcar una conversación completa como leída
export const PUT = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: { conversationId: string } }
) => {
  const { userId } = auth;
  const { conversationId } = await params;
  
  if (!conversationId) {
    return NextResponse.json({ error: "Es necesario especificar el ID de la conversación" }, { status: 400 });
  }

  // Verificar si el conversationId es para un chat directo o un grupo
  const isDirectChat = conversationId.startsWith('conv_');
  const isGroupChat = conversationId.startsWith('group_');
  
  try {
    if (isDirectChat) {
      // Para conversaciones directas
      // Extrae los IDs de usuario de la conversación (formato: conv_userId1-userId2)
      const userIds = conversationId.replace('conv_', '').split('-');
      const otherUserId = userIds.find(id => id !== userId);
      
      if (!otherUserId) {
        return NextResponse.json({ error: "ID de conversación inválido" }, { status: 400 });
      }
      
      // Marcar como leídos todos los mensajes enviados por el otro usuario al usuario actual
      const result = await prisma.directMessage.updateMany({
        where: {
          senderId: otherUserId,
          conversationId: conversationId,
          read: false
        },
        data: {
          read: true
        }
      });
      
      return NextResponse.json({ 
        success: true,
        messagesRead: result.count
      });
    } else if (isGroupChat) {
      // Para conversaciones grupales
      const conversationDbId = conversationId;
      
      console.log(`Verificando pertenencia a grupo: ${conversationId}, userId: ${userId}`);
      
      // Verificar que el usuario pertenece a la conversación
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          userId,
          conversationId: conversationDbId
        }
      });
      
      console.log('Resultado de búsqueda de participante:', participant);
      
      if (!participant) {
        return NextResponse.json({ error: "No eres miembro de esta conversación" }, { status: 403 });
      }
      
      // 1. Actualizar el último tiempo de lectura del usuario en esta conversación
      await prisma.conversationParticipant.update({
        where: {
          id: participant.id
        },
        data: {
          lastReadAt: new Date()
        }
      });
      
      // 2. Marcar como leídos todos los mensajes de esta conversación que no sean del usuario actual
      // Esto es crucial para grupos y faltaba en la implementación original
      const result = await prisma.directMessage.updateMany({
        where: {
          conversationId: conversationDbId,
          senderId: { not: userId }, // Solo mensajes enviados por otros usuarios
          read: false,
          // Opcional: solo marcar mensajes anteriores al tiempo actual
          createdAt: { lte: new Date() }
        },
        data: {
          read: true
        }
      });
      
      // 3. Crear registros en MessageRead para mensajes grupales
      // Obtener todos los mensajes no leídos de esta conversación
      const unreadMessages = await prisma.directMessage.findMany({
        where: {
          conversationId: conversationDbId,
          senderId: { not: userId },
          readBy: {
            none: {
              userId: userId
            }
          }
        },
        select: {
          id: true
        }
      });
      
      // Crear registros de lectura para cada mensaje
      if (unreadMessages.length > 0) {
        await prisma.messageRead.createMany({
          data: unreadMessages.map(msg => ({
            messageId: msg.id,
            userId: userId,
            readAt: new Date()
          })),
          skipDuplicates: true
        });
      }
      
      return NextResponse.json({ 
        success: true,
        messagesRead: result.count,
        messageReadsCreated: unreadMessages.length
      });
    } else {
      return NextResponse.json({ error: "Formato de ID de conversación inválido" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error al marcar conversación como leída:", error);
    return NextResponse.json(
      { error: "Error al marcar conversación como leída" },
      { status: 500 }
    );
  }
});
