import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../../lib/auth-utils";

// PUT para marcar un mensaje específico como leído
export const PUT = withAuth(async (
  req: Request,
  auth: AuthParams
) => {
  const { userId } = auth;
  
  // Obtener el messageId de la URL o el body
  const url = new URL(req.url);
  const messageId = url.searchParams.get('messageId');
  
  // Si no hay messageId en los parámetros, intentar obtenerlo del body
  if (!messageId) {
    try {
      const body = await req.json();
      if (body.messageId) {
        return handleMarkMessageAsRead(body.messageId, userId);
      }
    } catch {
      // Si no podemos parsear el body, devolver error
      return NextResponse.json({ error: "Es necesario especificar el ID del mensaje" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Es necesario especificar el ID del mensaje" }, { status: 400 });
  }
  
  return handleMarkMessageAsRead(messageId, userId);
});

// Función principal para marcar un mensaje como leído
async function handleMarkMessageAsRead(messageId: string, userId: string) {
  try {
    // 1. Obtener información del mensaje
    const message = await prisma.directMessage.findUnique({
      where: {
        id: messageId
      },
      select: {
        id: true,
        senderId: true,
        conversationId: true,
        read: true
      }
    });

    if (!message) {
      return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
    }

    // Verificar si el conversationId es para un chat directo o un grupo
    const isGroupChat = message.conversationId.startsWith('group_');
    
    // 2. Verificar que el usuario pertenece a la conversación
    if (isGroupChat) {
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          userId,
          conversationId: message.conversationId
        }
      });
      
      if (!participant) {
        return NextResponse.json({ error: "No eres miembro de esta conversación" }, { status: 403 });
      }
      
      // Para grupos, crear un registro en MessageRead si no existe
      const existingRead = await prisma.messageRead.findFirst({
        where: {
          messageId: message.id,
          userId
        }
      });
      
      if (!existingRead) {
        await prisma.messageRead.create({
          data: {
            messageId: message.id,
            userId,
            readAt: new Date()
          }
        });
      }
      
      // Si todos los participantes han leído el mensaje, marcarlo como leído a nivel de mensaje
      const conversation = await prisma.conversation.findUnique({
        where: { id: message.conversationId },
        include: { participants: true }
      });
      
      if (conversation) {
        const allReadRecords = await prisma.messageRead.findMany({
          where: { messageId: message.id }
        });
        
        // Si todos los participantes (excepto el remitente) han leído, marcar como leído globalmente
        if (allReadRecords.length >= conversation.participants.length - 1) {
          await prisma.directMessage.update({
            where: { id: message.id },
            data: { read: true }
          });
        }
      }
    } else {
      // Para chats directos, simplemente marcar el mensaje como leído
      if (message.senderId !== userId) {
        await prisma.directMessage.update({
          where: { id: message.id },
          data: { read: true }
        });
      }
    }
    
    return NextResponse.json({ 
      success: true,
      messageId: message.id 
    });
    
  } catch (error) {
    console.error("Error al marcar mensaje como leído:", error);
    return NextResponse.json(
      { error: "Error al marcar mensaje como leído" },
      { status: 500 }
    );
  }
}
