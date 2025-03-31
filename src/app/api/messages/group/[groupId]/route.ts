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
    const groupId = ensureIdFormat(params.groupId);
    console.log(`[DEBUG] Actualizando grupo con ID formateado: ${groupId}, ID original: ${params.groupId}`);
    
    const userId = auth.user.id;
    console.log(`[DEBUG] Usuario que realiza la solicitud: ${userId}`);
    
    // Obtener datos de la actualización
    let updateData = {};
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
    
    const { name, description, imageUrl } = updateData as any;
    
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
    
    // Validar que al menos un campo está siendo actualizado
    if (!name && !description && !imageUrl) {
      console.log(`[ERROR] No se proporcionaron datos para actualizar`);
      return NextResponse.json(
        { error: "No se proporcionaron datos para actualizar" },
        { status: 400 }
      );
    }
    
    // Preparar objeto de actualización
    const updateObj: any = {};
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

// DELETE - Eliminar un grupo
export const DELETE = withAuth(async (
  req: Request,
  auth: AuthParams,
  { params }: { params: { groupId: string } }
) => {
  try {
    const groupId = ensureIdFormat(params.groupId);
    const userId = auth.user.id;
    
    // Verificar si el usuario es administrador
    const isAdmin = await isGroupAdmin(groupId, userId);
    if (!isAdmin) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar este grupo" },
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
