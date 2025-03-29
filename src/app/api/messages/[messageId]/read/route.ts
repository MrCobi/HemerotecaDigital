import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../../lib/auth-utils";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";

// PUT para marcar un mensaje específico como leído
export const PUT = withAuth(async (
  req: Request,
  auth: AuthParams,
  context: { params: { messageId: string } }
) => {
  const { userId } = auth;
  // Esperar a que params esté disponible
  const params = await context.params;
  const messageId = params.messageId;
  
  if (!messageId) {
    return NextResponse.json({ error: "Es necesario especificar el ID del mensaje" }, { status: 400 });
  }

  console.log(`Intentando marcar mensaje como leído: ${messageId}, userId: ${userId}`);
  
  try {
    // Buscar el mensaje en DirectMessage (tanto para mensajes privados como de grupo)
    const message = await prisma.directMessage.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            participants: true
          }
        }
      }
    });

    if (!message) {
      console.log(`Mensaje ${messageId} no encontrado en la base de datos`);
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    // Verificar que el usuario pertenece a esta conversación
    const isParticipant = message.conversation?.participants?.some(
      (p) => p.userId === userId
    );

    if (!isParticipant) {
      console.log(`Usuario ${userId} no es participante de la conversación del mensaje ${messageId}`);
      return NextResponse.json({ error: "No puedes marcar este mensaje como leído" }, { status: 403 });
    }

    // Determinar si es una conversación grupal o privada
    const isGroup = message.conversation.id.startsWith('group_') || 
                   (typeof message.conversation.isGroup === 'boolean' && message.conversation.isGroup) ||
                   (typeof message.conversation.isGroup === 'number' && message.conversation.isGroup === 1);

    if (isGroup) {
      // Para mensajes de grupo, actualizamos el timestamp de última lectura del participante
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          userId,
          conversationId: message.conversationId
        }
      });

      if (participant) {
        // Actualizar el timestamp de última lectura del participante
        await prisma.conversationParticipant.update({
          where: { id: participant.id },
          data: { lastReadAt: new Date() }
        });
        
        // Usar un método más simple; evitar buscar primero
        try {
          // Actualizar directamente todos los registros que coincidan, si no existen no pasa nada
          await prisma.messageRead.updateMany({
            where: {
              messageId: message.id,
              userId: userId
            },
            data: {
              readAt: new Date()
            }
          });
        } catch (error) {
          // Ignorar cualquier error en esta operación, ya que la actualización
          // principal de lastReadAt ya se ha realizado
          console.error('Error menor al actualizar registro de lectura:', error);
        }
      }

      console.log(`Mensaje de grupo ${messageId} marcado como leído por ${userId}`);
      return NextResponse.json({ success: true });
    } else {
      // Para mensajes privados
      
      // Solo se marca como leído si el usuario es el receptor
      if (message.receiverId === userId) {
        await prisma.directMessage.update({
          where: { id: messageId },
          data: { read: true }
        });
        
        console.log(`Mensaje directo ${messageId} marcado como leído por el receptor ${userId}`);
      } else {
        // Si no es el receptor, igual devolvemos éxito pero no modificamos el estado
        console.log(`Usuario ${userId} no es el receptor del mensaje ${messageId}, pero es participante`);
      }
      
      return NextResponse.json({ success: true });
    }
    
  } catch (error) {
    console.error('Error al marcar mensaje como leído:', error);
    return NextResponse.json({ error: "Error interno al marcar mensaje como leído" }, { status: 500 });
  }
});
