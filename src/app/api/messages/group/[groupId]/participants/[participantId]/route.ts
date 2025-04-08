// src/app/api/messages/group/[groupId]/participants/[participantId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../../../../lib/auth-utils";

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

// Función auxiliar para verificar si un usuario es administrador de un grupo
async function isGroupAdmin(groupId: string, userId: string) {
  const participant = await prisma.conversationParticipant.findFirst({
    where: {
      conversationId: groupId,
      userId: userId,
      role: {
        in: ['admin', 'owner']
      }
    }
  });
  return !!participant;
}

// DELETE - Eliminar un participante del grupo
export const DELETE = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: Promise<{ groupId: string; participantId: string }> }
) => {
  try {
    // En Next.js 15, params es una promesa que debe resolverse primero
    const resolvedParams = await params;
    const groupId = ensureIdFormat(resolvedParams.groupId);
    const participantId = resolvedParams.participantId;
    const currentUserId = auth.user.id;
    
    console.log(`[DEBUG] Eliminando participante: ${participantId} del grupo: ${groupId}`);
    
    // Verificar si el usuario actual es administrador o es el propio usuario que quiere salir
    const isAdmin = await isGroupAdmin(groupId, currentUserId);
    const isSelfRemoval = currentUserId === participantId;
    
    if (!isAdmin && !isSelfRemoval) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar a este participante" },
        { status: 403 }
      );
    }
    
    // Verificar que el participante existe en el grupo
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: groupId,
        userId: participantId
      }
    });
    
    if (!participant) {
      console.log(`[ERROR] Participante no encontrado: ${participantId} en grupo: ${groupId}`);
      return NextResponse.json(
        { error: "El participante no existe en este grupo" },
        { status: 404 }
      );
    }
    
    // SEGURIDAD: Verificar si el participante a eliminar es 'owner' y no es auto-eliminación
    if (participant.role === 'owner' && !isSelfRemoval) {
      console.log(`[ERROR] Intento de eliminar al creador del grupo: ${participantId} en grupo: ${groupId}`);
      return NextResponse.json(
        { error: "No se puede eliminar al creador del grupo" },
        { status: 403 }
      );
    }
    
    // Obtener rol del usuario actual si no es auto-eliminación
    if (!isSelfRemoval) {
      const currentUserParticipant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: groupId,
          userId: currentUserId
        },
        select: {
          role: true
        }
      });
      
      // SEGURIDAD: Administradores normales no pueden eliminar a otros administradores
      if (participant.role === 'admin' && currentUserParticipant?.role !== 'owner') {
        console.log(`[ERROR] Admin intenta eliminar a otro admin: ${participantId} en grupo: ${groupId}`);
        return NextResponse.json(
          { error: "Solo el creador del grupo puede eliminar a otros administradores" },
          { status: 403 }
        );
      }
    }
    
    // Si el usuario a eliminar es 'owner' y se está auto-eliminando,
    // comprobar si hay otro administrador para transferirle la propiedad
    if (participant.role === 'owner' && isSelfRemoval) {
      const otherAdmin = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: groupId,
          userId: { not: participantId },
          role: 'admin'
        }
      });
      
      if (otherAdmin) {
        // Transferir propiedad a otro administrador
        await prisma.conversationParticipant.update({
          where: { id: otherAdmin.id },
          data: { role: 'owner' }
        });
        console.log(`[DEBUG] Propiedad transferida de ${participantId} a ${otherAdmin.userId}`);
      } else {
        // Buscar cualquier otro miembro para convertirlo en owner
        const otherMember = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId: groupId,
            userId: { not: participantId }
          }
        });
        
        if (otherMember) {
          // Hacer owner a otro miembro
          await prisma.conversationParticipant.update({
            where: { id: otherMember.id },
            data: { role: 'owner' }
          });
          console.log(`[DEBUG] Propiedad transferida de ${participantId} a ${otherMember.userId}`);
        } else {
          // Si no hay más miembros, simplemente eliminar el grupo
          // Eliminar mensajes del grupo
          await prisma.directMessage.deleteMany({
            where: { conversationId: groupId }
          });
          
          // Eliminar configuración del grupo si existe
          await prisma.groupSettings.deleteMany({
            where: { conversationId: groupId }
          });
          
          // Eliminar invitaciones pendientes del grupo
          await prisma.groupInvitation.deleteMany({
            where: { conversationId: groupId }
          });
          
          // Eliminar el grupo
          await prisma.conversation.delete({
            where: { id: groupId }
          });
          
          console.log(`[DEBUG] Grupo eliminado: ${groupId} por ser el último participante`);
          
          return NextResponse.json({
            success: true,
            message: "Has abandonado el grupo y, al ser el último miembro, el grupo ha sido eliminado"
          });
        }
      }
    }
    
    // Eliminar participante
    await prisma.conversationParticipant.delete({
      where: {
        id: participant.id
      }
    });
    
    console.log(`[DEBUG] Participante eliminado: ${participantId} del grupo: ${groupId}`);
    
    // Obtener grupo actualizado
    const updatedGroup = await prisma.conversation.findUnique({
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
      message: isSelfRemoval 
        ? "Has abandonado el grupo correctamente" 
        : "Participante eliminado correctamente",
      conversation: updatedGroup
    });
    
  } catch (error) {
    console.error("Error al eliminar participante:", error);
    return NextResponse.json(
      { error: "Error al eliminar participante", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
