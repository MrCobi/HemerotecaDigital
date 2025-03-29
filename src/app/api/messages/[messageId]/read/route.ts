import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../../lib/auth-utils";

// PUT para marcar un mensaje específico como leído
export const PUT = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: { messageId: string } }
) => {
  const { userId } = auth;
  const { messageId } = params;
  
  if (!messageId) {
    return NextResponse.json({ error: "Es necesario especificar el ID del mensaje" }, { status: 400 });
  }

  console.log(`Intentando marcar mensaje como leído: ${messageId}, userId: ${userId}`);
  
  try {
    // Buscar el mensaje en directMessage (mensajes privados)
    const directMessage = await prisma.directMessage.findUnique({
      where: { id: messageId }
    });

    if (directMessage) {
      // Verificar que el usuario es el receptor del mensaje
      if (directMessage.receiverId !== userId) {
        console.log(`Usuario ${userId} no es el receptor del mensaje ${messageId} (receptor: ${directMessage.receiverId})`);
        return NextResponse.json({ error: "No puedes marcar este mensaje como leído" }, { status: 403 });
      }

      // Marcar el mensaje como leído
      await prisma.directMessage.update({
        where: { id: messageId },
        data: { read: true }
      });

      console.log(`Mensaje directo ${messageId} marcado como leído por ${userId}`);
      return NextResponse.json({ success: true });
    }

    // Si no encontramos el mensaje como directMessage, buscar a qué conversación pertenece
    // Este enfoque asume que el ID puede estar en otra tabla relacionada con mensajes de grupo

    // Buscar la conversación relacionada con este mensaje
    // Nota: Ajusta esta consulta según tu estructura de base de datos
    const groupMessage = await prisma.$queryRaw`
      SELECT m.*, c.id as conversationId 
      FROM "GroupMessage" m 
      JOIN "Conversation" c ON m.conversationId = c.id 
      WHERE m.id = ${messageId}
    `;

    if (groupMessage && Array.isArray(groupMessage) && groupMessage.length > 0) {
      const message = groupMessage[0];
      const conversationId = message.conversationId;
      const groupConversationId = `group_${conversationId}`;

      console.log(`Mensaje grupal encontrado en conversación: ${groupConversationId}`);

      // Verificar que el usuario pertenece a esta conversación grupal
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          userId,
          conversationId: groupConversationId
        }
      });

      if (!participant) {
        console.log(`Usuario ${userId} no es miembro de la conversación ${groupConversationId}`);
        return NextResponse.json({ error: "No eres miembro de esta conversación" }, { status: 403 });
      }

      // Actualizar el timestamp de última lectura del participante
      await prisma.conversationParticipant.update({
        where: { id: participant.id },
        data: { lastReadAt: new Date() }
      });

      console.log(`Timestamp de lectura actualizado para el usuario ${userId} en la conversación ${groupConversationId}`);
      return NextResponse.json({ success: true });
    }

    // Si no se encuentra el mensaje en ninguna de las tablas
    console.log(`Mensaje ${messageId} no encontrado en ninguna tabla`);
    return NextResponse.json({ error: "Mensaje no encontrado" }, { status: 404 });
  } catch (error) {
    console.error("Error al marcar mensaje como leído:", error);
    return NextResponse.json(
      { error: "Error al marcar mensaje como leído" },
      { status: 500 }
    );
  }
});
