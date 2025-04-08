// src/app/api/messages/group/[groupId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../../lib/auth-utils";

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

// Define el tipo para los datos de actualización
interface GroupUpdateData {
  name?: string;
  description?: string;
  imageUrl?: string;
  updateType?: string;
  participantId?: string;
  role?: string;
  [key: string]: unknown;
}

// PATCH - Actualizar información del grupo
export const PATCH = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: { groupId: string } }
) => {
  try {
    const nextReq = req as unknown as NextRequest;
    // Depuración detallada
    console.log(`[DEBUG-INICIO] Recibiendo solicitud PATCH para grupo. Params:`, params);
    
    // Asegurar que el ID tiene el formato correcto para la base de datos
    // En Next.js 15, params es una promesa que debe esperarse
    const resolvedParams = await params;
    const groupId = ensureIdFormat(resolvedParams.groupId);
    console.log(`[DEBUG] Actualizando grupo con ID formateado: ${groupId}, ID original: ${resolvedParams.groupId}`);
    
    const userId = auth.user.id;
    console.log(`[DEBUG] Usuario que realiza la solicitud: ${userId}`);
    
    // Obtener datos de la actualización
    let updateData: GroupUpdateData = {};
    try {
      updateData = await nextReq.json();
      console.log(`[DEBUG] Datos de actualización recibidos:`, updateData);
    } catch (error) {
      console.error(`[ERROR] Error al parsear datos JSON:`, error);
      return NextResponse.json(
        { error: "Datos de actualización inválidos" },
        { status: 400 }
      );
    }
    
    const { name, description, imageUrl } = updateData;
    
    // Verificar si el usuario es administrador
    console.log(`[DEBUG] Verificando si el usuario ${userId} es administrador del grupo ${groupId}`);
    try {
      const isAdmin = await isGroupAdmin(groupId, userId);
      console.log(`[DEBUG] ¿Es administrador? ${isAdmin}`);
      
      if (!isAdmin) {
        console.log(`[ERROR] El usuario ${userId} no tiene permisos de administrador para el grupo ${groupId}`);
        return NextResponse.json(
          { error: "No tienes permisos para actualizar este grupo" },
          { status: 403 }
        );
      }
    } catch (error) {
      console.error(`[ERROR] Error al verificar permisos de administrador:`, error);
      return NextResponse.json(
        { error: "Error al verificar permisos", details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    // Manejar actualización de rol de participante
    if (updateData.updateType === 'participantRole' && updateData.participantId && updateData.role) {
      console.log(`[DEBUG] Actualizando rol de participante ${updateData.participantId} a ${updateData.role}`);
      
      // Verificar si el participante existe en el grupo
      const targetParticipant = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: groupId,
          userId: updateData.participantId
        }
      });
      
      if (!targetParticipant) {
        console.log(`[ERROR] Participante ${updateData.participantId} no encontrado en el grupo ${groupId}`);
        return NextResponse.json(
          { error: "El participante no existe en este grupo" },
          { status: 404 }
        );
      }
      
      // Verificar si el rol solicitado es válido
      const validRoles = ['admin', 'member', 'moderator'];
      if (!validRoles.includes(updateData.role)) {
        console.log(`[ERROR] Rol inválido: ${updateData.role}`);
        return NextResponse.json(
          { error: "Rol inválido" },
          { status: 400 }
        );
      }
      
      // Verificar si el usuario objetivo es el creador (owner) del grupo
      if (targetParticipant.role === 'owner') {
        console.log(`[ERROR] No se puede cambiar el rol del creador del grupo`);
        return NextResponse.json(
          { error: "No se puede cambiar el rol del creador del grupo" },
          { status: 403 }
        );
      }
      
      // Verificar si el usuario actual es el creador del grupo si está intentando cambiar un admin
      const currentUserRole = await prisma.conversationParticipant.findFirst({
        where: {
          conversationId: groupId,
          userId: userId
        },
        select: {
          role: true
        }
      });
      
      if (targetParticipant.role === 'admin' && currentUserRole?.role !== 'owner') {
        console.log(`[ERROR] Solo el creador puede cambiar el rol de un administrador`);
        return NextResponse.json(
          { error: "Solo el creador puede cambiar el rol de un administrador" },
          { status: 403 }
        );
      }
      
      // Actualizar el rol del participante
      try {
        await prisma.conversationParticipant.update({
          where: {
            id: targetParticipant.id
          },
          data: {
            role: updateData.role as 'admin' | 'member' | 'moderator'
          }
        });
        
        // Obtener la conversación actualizada con todos los participantes
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
            },
            settings: true
          }
        });
        
        // Emitir evento de actualización para informar al chat
        try {
          const payload = {
            conversationId: groupId,
            updateType: 'participant_role_changed',
            data: {
              participantId: updateData.participantId,
              newRole: updateData.role
            }
          };
          
          // Crear URL para emitir evento SSE
          const domain = process.env.NODE_ENV === 'development' 
            ? 'http://localhost:3000' 
            : process.env.NEXT_PUBLIC_SITE_URL || 'https://hemerotecadigital.io';
          
          const sseEndpoint = `${domain}/api/messages/group/updates/sse`;
          
          await fetch(sseEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
          
          console.log(`[DEBUG] Evento de cambio de rol emitido correctamente`);
        } catch (sseError) {
          console.error(`[ERROR] Error al emitir evento SSE:`, sseError);
          // No fallamos la operación completa si falla la notificación SSE
        }
        
        return NextResponse.json(updatedConversation);
      } catch (error) {
        console.error(`[ERROR] Error al actualizar rol del participante:`, error);
        return NextResponse.json(
          { error: "Error al actualizar rol del participante", details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    } else if (!name && !description && !imageUrl) {
      console.log(`[ERROR] No se proporcionaron datos para actualizar`);
      return NextResponse.json(
        { error: "No se proporcionaron datos para actualizar" },
        { status: 400 }
      );
    }
    
    // Preparar objeto de actualización
    interface UpdateObject {
      name?: string;
      description?: string;
      imageUrl?: string;
    }
    
    const updateObj: UpdateObject = {};
    if (name) updateObj.name = name;
    if (description) updateObj.description = description;
    if (imageUrl) updateObj.imageUrl = imageUrl;
    console.log(`[DEBUG] Objeto de actualización:`, updateObj);
    
    // Verificar que el grupo existe
    console.log(`[DEBUG] Verificando si el grupo ${groupId} existe`);
    let existingGroup;
    try {
      existingGroup = await prisma.conversation.findUnique({
        where: { id: groupId }
      });
      
      console.log(`[DEBUG] Resultado de búsqueda de grupo:`, existingGroup);
      
      if (!existingGroup) {
        console.log(`[ERROR] Grupo no encontrado: ${groupId}`);
        return NextResponse.json(
          { error: "El grupo no existe" },
          { status: 404 }
        );
      }
    } catch (error) {
      console.error(`[ERROR] Error al buscar el grupo:`, error);
      return NextResponse.json(
        { error: "Error al verificar existencia del grupo", details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    // Actualizar grupo
    console.log(`[DEBUG] Procediendo a actualizar el grupo ${groupId}`);
    let updatedGroup;
    try {
      updatedGroup = await prisma.conversation.update({
        where: { id: groupId },
        data: updateObj,
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
      
      console.log(`[DEBUG] Grupo actualizado correctamente: ${groupId}, Nombre=${updatedGroup.name}, Description=${updatedGroup.description}`);
    } catch (error) {
      console.error(`[ERROR] Error al actualizar el grupo:`, error);
      return NextResponse.json(
        { error: "Error al actualizar el grupo en la base de datos", details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
    
    console.log(`[DEBUG-FIN] Actualización completada con éxito`);
    
    return NextResponse.json({
      success: true,
      conversation: updatedGroup
    });
    
  } catch (error) {
    console.error("Error al actualizar grupo:", error);
    return NextResponse.json(
      { error: "Error al actualizar el grupo", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// GET - Obtener información de un grupo
export const GET = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: { groupId: string } }
) => {
  try {
    console.log(`[DEBUG] Recibiendo solicitud GET para grupo. Params:`, params);
    
    // Asegurar que el ID tiene el formato correcto para la base de datos
    const resolvedParams = await params;
    const groupId = ensureIdFormat(resolvedParams.groupId);
    console.log(`[DEBUG] Obteniendo grupo con ID formateado: ${groupId}, ID original: ${resolvedParams.groupId}`);
    
    const userId = auth.user.id;
    console.log(`[DEBUG] Usuario que realiza la solicitud: ${userId}`);
    
    // Verificar que el usuario es participante del grupo
    const isParticipant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: groupId,
        userId: userId
      }
    });
    
    if (!isParticipant) {
      console.log(`[ERROR] El usuario ${userId} no es participante del grupo ${groupId}`);
      return NextResponse.json(
        { error: "No tienes permisos para ver este grupo" },
        { status: 403 }
      );
    }
    
    // Obtener datos del grupo con participantes
    const conversation = await prisma.conversation.findUnique({
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
    
    if (!conversation) {
      console.log(`[ERROR] Grupo no encontrado: ${groupId}`);
      return NextResponse.json(
        { error: "El grupo no existe" },
        { status: 404 }
      );
    }
    
    console.log(`[DEBUG] Grupo encontrado: ${groupId}, Nombre=${conversation.name}`);
    
    return NextResponse.json(conversation);
    
  } catch (error) {
    console.error("Error al obtener grupo:", error);
    return NextResponse.json(
      { error: "Error al obtener el grupo", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});

// DELETE - Eliminar un grupo
export const DELETE = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: { groupId: string } }
) => {
  try {
    const resolvedParams = await params;
    const groupId = ensureIdFormat(resolvedParams.groupId);
    const userId = auth.user.id;
    
    // Verificar si el usuario es el creador del grupo (owner)
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        conversationId: groupId,
        userId: userId
      },
      select: {
        role: true
      }
    });
    
    if (!participant) {
      return NextResponse.json(
        { error: "No eres participante de este grupo" },
        { status: 403 }
      );
    }
    
    if (participant.role !== 'owner') {
      console.log(`[ERROR] Usuario no creador intenta eliminar grupo: ${userId} en grupo: ${groupId}`);
      return NextResponse.json(
        { error: "Solo el creador del grupo puede eliminarlo" },
        { status: 403 }
      );
    }
    
    // Eliminar mensajes del grupo
    await prisma.directMessage.deleteMany({
      where: { conversationId: groupId }
    });
    
    // Eliminar participantes del grupo
    await prisma.conversationParticipant.deleteMany({
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
    
    return NextResponse.json({
      success: true,
      message: "Grupo eliminado correctamente"
    });
    
  } catch (error) {
    console.error("Error al eliminar grupo:", error);
    return NextResponse.json(
      { error: "Error al eliminar el grupo", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
