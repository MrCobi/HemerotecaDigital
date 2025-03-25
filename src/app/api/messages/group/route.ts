// src/app/api/messages/group/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "@/src/lib/auth-utils";
import path from 'path';
import { writeFile, mkdir } from 'fs/promises';
import crypto from 'crypto';

// Función para generar un ID único para los archivos
const generateUniqueId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Exportamos la ruta POST con autenticación
export const POST = withAuth(async (req: any, { userId, user }: { userId: string, user: any }) => {
  try {
    // Convertir a NextRequest para acceder a formData
    const request = req as unknown as NextRequest;
    
    // Obtener datos de la solicitud como FormData para manejar la imagen
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string || '';
    
    // Obtener y validar la lista de participantes
    const participantIdsJson = formData.get('participantIds') as string;
    let participantIds: string[] = [];
    
    try {
      participantIds = JSON.parse(participantIdsJson || '[]');
    } catch (error) {
      return NextResponse.json(
        { error: "Formato de participantes inválido" },
        { status: 400 }
      );
    }

    // Validar datos obligatorios
    if (!name || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios: nombre y participantes" }, 
        { status: 400 }
      );
    }

    // Procesar la imagen si se proporciona
    const imageFile = formData.get('image') as File;
    let imageUrl: string | undefined;

    if (imageFile) {
      try {
        // Generar un nombre único para la imagen
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `group-${generateUniqueId()}.${fileExt}`;
        
        // Crear directorio si no existe
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'groups');
        await mkdir(uploadDir, { recursive: true });
        
        // Guardar la imagen
        const filePath = path.join(uploadDir, fileName);
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        await writeFile(filePath, buffer);
        
        // Generar URL para la base de datos
        imageUrl = `/uploads/groups/${fileName}`;
      } catch (error) {
        console.error("Error al guardar la imagen:", error);
        // Continuamos sin imagen si hay error
      }
    }

    // Asegurarse de que el usuario actual esté incluido como participante
    if (!participantIds.includes(userId)) {
      participantIds.push(userId);
    }

    // Verificar las relaciones de seguimiento de un modo más sencillo
    const follows = await prisma.$queryRaw`
      SELECT follower_id, following_id FROM follows
    `;
    
    // Convertir a array de objetos para facilitar búsqueda
    const followsArray = Array.isArray(follows) ? follows : [];
    
    // Filtrar para asegurarnos de que todos son seguimiento mutuo
    const validParticipantIds: string[] = [userId]; // El creador siempre está incluido
    
    for (const pId of participantIds) {
      if (pId === userId) continue; // Saltamos al creador que ya está incluido
      
      // Verificar que existe seguimiento en ambas direcciones
      const userFollowsParticipant = followsArray.some((f: any) => 
        f.follower_id === userId && f.following_id === pId);
      
      const participantFollowsUser = followsArray.some((f: any) => 
        f.follower_id === pId && f.following_id === userId);
      
      if (userFollowsParticipant && participantFollowsUser) {
        validParticipantIds.push(pId);
      }
    }

    // Si no hay participantes válidos además del creador, mostrar error
    if (validParticipantIds.length <= 1) {
      return NextResponse.json(
        { error: "No hay participantes válidos para crear el grupo. Asegúrate de seguir mutuamente a los usuarios." },
        { status: 400 }
      );
    }

    // Creamos la conversación con todos los datos necesarios
    const groupData = await prisma.conversation.create({
      data: {
        id: `group_${crypto.randomBytes(12).toString('hex')}`,
        name,
        imageUrl,
        isGroup: true,
        participants: {
          create: validParticipantIds.map((participantId: string) => ({
            userId: participantId,
            role: participantId === userId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true,
              },
            },
          },
        },
      },
    });

    // Extraer los participantes del grupo para usar en la respuesta
    const participantsData = groupData.participants.map((participant: any) => ({
      id: participant.user.id,
      username: participant.user.username,
      image: participant.user.image,
      role: participant.role,
    }));

    // Notificar a los participantes
    for (const participantId of validParticipantIds) {
      try {
        console.log(`Notificar al usuario ${participantId} sobre nuevo grupo: ${groupData.id}`);
      } catch (error) {
        console.warn(`Error al notificar al usuario ${participantId}:`, error);
      }
    }

    // También intentar notificar por websocket si está disponible
    try {
      const { default: fetch } = await import('node-fetch');
      const socketUrl = 'http://localhost:3001/webhook/new-group';
      await fetch(socketUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: {
            id: groupData.id,
            name: groupData.name,
            isGroup: true,
            participants: validParticipantIds
          }
        })
      });
    } catch (error) {
      console.warn("Error al notificar al servidor de websockets:", error);
    }

    // Devolver respuesta con el grupo creado
    return NextResponse.json({
      success: true,
      group: {
        id: groupData.id,
        name: groupData.name,
        isGroup: groupData.isGroup,
        imageUrl: groupData.imageUrl,
        participants: participantsData,
        createdAt: groupData.createdAt,
      }
    });
  } catch (error) {
    console.error("Error al crear grupo:", error);
    return NextResponse.json(
      { error: "Error al crear el grupo", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
