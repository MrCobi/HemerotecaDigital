// src/app/api/messages/group/[groupId]/leave/route.ts
import { NextRequest, NextResponse } from "next/server";
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
export async function POST(
  req: NextRequest,
  { params }: { params: { groupId: string } }
) {
  return withAuth(async (user: AuthParams['user']) => {
    try {
      const groupId = ensureIdFormat(params.groupId);
      const userId = user.id;
      
      console.log(`[DEBUG] Usuario ${userId} intentando abandonar grupo: ${groupId}`);
      
      // Verificar que el usuario es miembro del grupo
      const participant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: groupId,
          userId: userId
        }
      });
      
      if (!participant) {
        return NextResponse.json(
          { error: "No eres miembro de este grupo" },
          { status: 404 }
        );
      }
      
      // Si el usuario es 'owner', comprobar si hay otro administrador para transferirle la propiedad
      if (participant.role === 'owner') {
        const otherAdmin = await prisma.conversationParticipant.findFirst({
          where: {
            conversationId: groupId,
            userId: { not: userId },
            role: 'admin'
          }
        });
        
        if (otherAdmin) {
          // Transferir propiedad a otro administrador
          await prisma.conversationParticipant.update({
            where: { id: otherAdmin.id },
            data: { role: 'owner' }
          });
          console.log(`[DEBUG] Propiedad transferida de ${userId} a ${otherAdmin.userId}`);
        } else {
          // Buscar cualquier otro miembro para convertirlo en owner
          const otherMember = await prisma.conversationParticipant.findFirst({
            where: {
              conversationId: groupId,
              userId: { not: userId }
            }
          });
          
          if (otherMember) {
            // Hacer owner a otro miembro
            await prisma.conversationParticipant.update({
              where: { id: otherMember.id },
              data: { role: 'owner' }
            });
            console.log(`[DEBUG] Propiedad transferida de ${userId} a ${otherMember.userId}`);
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
            
            console.log(`[DEBUG] Grupo eliminado: ${groupId} por ser el último miembro`);
            
            return NextResponse.json({
              success: true,
              message: "Has abandonado el grupo y, al ser el último miembro, el grupo ha sido eliminado"
            });
          }
        }
      }
      
      // Eliminar al usuario del grupo
      await prisma.conversationParticipant.delete({
        where: {
          id: participant.id
        }
      });
      
      console.log(`[DEBUG] Usuario ${userId} ha abandonado el grupo: ${groupId}`);
      
      return NextResponse.json({
        success: true,
        message: "Has abandonado el grupo correctamente"
      });
      
    } catch (error) {
      console.error("Error al abandonar grupo:", error);
      return NextResponse.json(
        { error: "Error al abandonar el grupo", details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  });
}
