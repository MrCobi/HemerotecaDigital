// src/app/api/messages/group/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, AuthParams } from "../../../../lib/auth-utils";
import crypto from 'crypto';

interface Follow {
  followerId: string;
  followingId: string;
}

// Exportamos la ruta POST con autenticación
export const POST = withAuth(async (req: Request, auth: AuthParams) => {
  const { userId } = auth;
  try {
    // Convertir a NextRequest para acceder a json
    const request = req as unknown as NextRequest;
    
    // Obtener datos de la solicitud como JSON
    const data = await request.json();
    const name = data.name as string;
    const description = data.description as string || '';
    const imageUrl = data.imageUrl as string | undefined;
    
    // Obtener y validar la lista de participantes
    const participantIds = data.participantIds as string[] || [];
    
    // Validar datos obligatorios
    if (!name || participantIds.length === 0) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios: nombre y participantes" }, 
        { status: 400 }
      );
    }

    // Verificar que todos los participantes son seguidores mutuos
    // Buscar todas las relaciones de seguimiento donde el usuario está involucrado
    const follows = await prisma.follow.findMany({
      where: {
        OR: [
          { followerId: userId, followingId: { in: participantIds } },
          { followingId: userId, followerId: { in: participantIds } }
        ]
      }
    });

    // Crear mapas para verificar relaciones bidireccionales
    const userFollows = new Set<string>();
    const followsUser = new Set<string>();
    
    follows.forEach((follow: Follow) => {
      if (follow.followerId === userId) {
        userFollows.add(follow.followingId);
      }
      if (follow.followingId === userId) {
        followsUser.add(follow.followerId);
      }
    });

    // Verificar que todos son seguidores mutuos
    const validParticipants: string[] = [];
    const invalidParticipants: string[] = [];
    
    participantIds.forEach((participantId: string) => {
      if (userFollows.has(participantId) && followsUser.has(participantId)) {
        validParticipants.push(participantId);
      } else {
        invalidParticipants.push(participantId);
      }
    });

    if (invalidParticipants.length > 0) {
      return NextResponse.json(
        { error: "Algunos participantes no son seguidores mutuos", invalidParticipants }, 
        { status: 403 }
      );
    }

    // Crear el grupo en la base de datos
    const group = await prisma.conversation.create({
      data: {
        id: `group_${crypto.randomUUID().replace(/-/g, '')}`,
        isGroup: true,
        name,
        description,
        imageUrl,
        creatorId: userId, // Añadir el ID del creador
        participants: {
          create: [
            // Añadir al creador como owner
            {
              userId: userId,
              isAdmin: true,
              role: 'owner' as const
            },
            // Añadir al resto de participantes como miembros
            ...validParticipants.map((participantId: string) => ({
              userId: participantId,
              isAdmin: false,
              role: 'member' as const
            }))
          ]
        }
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                image: true
              }
            }
          }
        }
      }
    }) as {
      id: string;
      name: string | null;
      description: string | null;
      imageUrl: string | null;
      isGroup: boolean;
      createdAt: Date;
      updatedAt: Date;
      creatorId: string | null;
      participants: {
        user: {
          id: string;
          username: string | null;
          image: string | null;
        };
        role: string;
      }[];
    };

    // Formatear la respuesta
    const formattedGroup = {
      id: group.id,
      name: group.name,
      description: group.description,
      imageUrl: group.imageUrl,
      isGroup: group.isGroup,
      participants: group.participants ? group.participants.map((p: { user: { id: string; username?: string | null; image?: string | null; }; role: string; }) => ({
        id: p.user.id,
        username: p.user.username,
        image: p.user.image,
        role: p.role
      })) : []
    };

    // También intentar notificar por websocket si está disponible
    try {
      const { default: fetch } = await import('node-fetch');
      const socketUrl = process.env.SOCKET_WEBHOOK_URL || 'http://localhost:3001/webhook/new-group';
      await fetch(socketUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: group.id,
          participantIds: [userId, ...validParticipants],
          sender: {
            id: userId,
            username: auth.user.username || 'Usuario',
            image: auth.user.image
          },
          type: 'NEW_GROUP'
        }),
      });
    } catch (socketError) {
      console.warn("No se pudo notificar por websocket:", socketError);
      // No fallamos la petición principal si falla el socket
    }

    return NextResponse.json(formattedGroup);
  } catch (error) {
    console.error("Error al crear grupo:", error);
    return NextResponse.json(
      { error: "Error al crear el grupo", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
});
