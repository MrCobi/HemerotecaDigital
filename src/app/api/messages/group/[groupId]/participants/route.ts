// src/app/api/messages/group/[groupId]/participants/route.ts
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

// POST - Añadir participantes a un grupo
export const POST = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: Promise<{ groupId: string }> }
) => {
  try {
    const nextReq = req as unknown as NextRequest;
    // En Next.js 15, params es una promesa que debe resolverse primero
    const resolvedParams = await params;
    const groupId = ensureIdFormat(resolvedParams.groupId);
    console.log(`[DEBUG] Añadiendo participantes al grupo: ${groupId}`);
    
    const userId = auth.user.id;
    
    // Verificar si el usuario es administrador
    const isAdmin = await isGroupAdmin(groupId, userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para añadir participantes a este grupo" },
        { status: 403 }
      );
    }
    
    // Obtener IDs de nuevos participantes
    const { participants } = await nextReq.json();
    console.log(`[DEBUG] Participantes a añadir: ${JSON.stringify(participants)}`);
    
    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return NextResponse.json(
        { error: "No se proporcionaron participantes válidos" },
        { status: 400 }
      );
    }
    
    // Verificar que el grupo existe
    const group = await prisma.conversation.findUnique({
      where: { id: groupId },
      include: { participants: true }
    });
    
    if (!group) {
      console.log(`[ERROR] Grupo no encontrado: ${groupId}`);
      return NextResponse.json(
        { error: "El grupo no existe" },
        { status: 404 }
      );
    }
    
    // Obtener los IDs de participantes actuales
    const existingParticipantIds = group.participants.map(p => p.userId);
    
    // Filtrar participantes que ya están en el grupo
    const newParticipants = participants.filter(id => !existingParticipantIds.includes(id));
    
    if (newParticipants.length === 0) {
      return NextResponse.json(
        { error: "Todos los participantes ya están en el grupo" },
        { status: 400 }
      );
    }
    
    // Añadir nuevos participantes
    const participantPromises = newParticipants.map(participantId => 
      prisma.conversationParticipant.create({
        data: {
          conversationId: groupId,
          userId: participantId,
          role: 'member'
        }
      })
    );
    
    await Promise.all(participantPromises);
    console.log(`[DEBUG] Participantes añadidos correctamente al grupo: ${groupId}`);
    
    // Obtener grupo actualizado con los participantes
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
      conversation: updatedGroup
    });
    
  } catch (error) {
    console.error("Error al añadir participantes:", error);
    return NextResponse.json(
      { error: "Error al añadir participantes", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
