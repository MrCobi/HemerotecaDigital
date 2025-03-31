// src/app/api/messages/group/[groupId]/leave/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../../../lib/auth-utils";

// Función para asegurar que el ID de conversación tiene el prefijo correcto
function ensureIdFormat(id: string | null | undefined) {
  if (!id) return '';
  // Si ya tiene el prefijo, devolverlo tal cual
  if (id.startsWith('group_') || id.startsWith('conv_')) {
    return id;
  }
  // Si no tiene prefijo, añadir 'group_'
  return `group_${id}`;
}

// POST - Abandonar un grupo
export const POST = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: { groupId: string } }
) => {
  try {
    const groupId = ensureIdFormat(params.groupId);
    const userId = auth.user.id;
    
    console.log(`[DEBUG] Usuario ${userId} intentando abandonar grupo: ${groupId}`);
    
    // Verificar que el usuario es miembro del grupo
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: groupId,
        userId: userId
      }
    });
    
    if (!participant) {
      console.log(`[ERROR] El usuario ${userId} no es miembro del grupo ${groupId}`);
      return NextResponse.json(
        { error: "No eres miembro de este grupo" },
        { status: 404 }
      );
    }
    
    // Verificar si es el último participante del grupo
    const participantCount = await prisma.conversationParticipant.count({
      where: {
        conversationId: groupId
      }
    });
    
    if (participantCount <= 1) {
      console.log(`[DEBUG] Último participante abandona grupo ${groupId}, eliminando grupo`);
      // Si es el último, eliminar el grupo completo
      await prisma.conversation.delete({
        where: {
          id: groupId
        }
      });
      
      return NextResponse.json({
        success: true,
        deleted: true,
        message: "Eras el último miembro, el grupo ha sido eliminado"
      });
    }
    
    // Si el usuario que abandona es el administrador, asignar otro administrador
    if (participant.role === 'admin' || participant.role === 'owner') {
      // Buscar otro participante para hacerlo admin
      const newAdmin = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: groupId,
          userId: {
            not: userId
          }
        }
      });
      
      if (newAdmin) {
        console.log(`[DEBUG] Asignando nuevo admin: ${newAdmin.userId} para el grupo ${groupId}`);
        await prisma.conversationParticipant.update({
          where: {
            id: newAdmin.id
          },
          data: {
            role: 'admin'
          }
        });
      }
    }
    
    // Eliminar al participante
    await prisma.conversationParticipant.delete({
      where: {
        id: participant.id
      }
    });
    
    console.log(`[DEBUG] Usuario ${userId} ha abandonado el grupo ${groupId}`);
    
    // Obtener conversación actualizada
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true
              }
            }
          }
        }
      }
    });
    
    return NextResponse.json({
      success: true,
      conversation: updatedConversation
    });
    
  } catch (error) {
    console.error("Error al abandonar grupo:", error);
    return NextResponse.json(
      { error: "Error al abandonar el grupo", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
