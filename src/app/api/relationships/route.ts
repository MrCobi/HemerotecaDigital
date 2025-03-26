import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import prisma from "@/lib/db";
import { withAuth } from "../../../lib/auth-utils";
import { User } from "@prisma/client";

// POST para seguir a un usuario
export const POST = withAuth(async (req: Request, { userId, user: _user }: { userId: string, user: User }) => {
  try {
    const { followingId } = await req.json();

    if (!followingId) {
      return NextResponse.json({ error: "ID de usuario a seguir no proporcionado" }, { status: 400 });
    }

    // Verificar que no intenta seguirse a sí mismo
    if (followingId === userId) {
      return NextResponse.json({ error: "No puedes seguirte a ti mismo" }, { status: 400 });
    }

    // Verificar si ya existe el follow
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: followingId
        }
      }
    });

    if (existingFollow) {
      return NextResponse.json({ error: "Ya estás siguiendo a este usuario" }, { status: 400 });
    }

    // Obtener información del usuario que se está siguiendo
    const followingUser = await prisma.user.findUnique({
      where: { id: followingId },
      select: { username: true, name: true }
    });

    if (!followingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Crear el follow
    const _newFollow = await prisma.follow.create({
      data: {
        followerId: userId,
        followingId: followingId
      },
      include: {
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      }
    });

    // Registrar la actividad de "follow"
    await prisma.activityHistory.create({
      data: {
        user: {
          connect: { id: userId }
        },
        type: "follow",
        targetId: followingId,
        targetName: followingUser.username || followingUser.name || "",
        targetType: "user",
        details: `Comenzaste a seguir a ${followingUser.username || followingUser.name || ""}`,
        createdAt: new Date()
      }
    });

    // Revalidar caché
    revalidateTag(`user-${userId}-following`);
    revalidateTag(`user-${userId}-activity`);

    return NextResponse.json({
      success: true,
      isFollowing: true,
      followerCount: await prisma.follow.count({
        where: { followingId: followingId }
      })
    });
  } catch (error) {
    console.error("Error al seguir usuario:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud de seguimiento" },
      { status: 500 }
    );
  }
});

// DELETE para dejar de seguir a un usuario
export const DELETE = withAuth(async (req: Request, { userId, user: _user }: { userId: string, user: User }) => {
  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");

    // Validación de parámetros
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Parámetro 'targetUserId' requerido" },
        { status: 400 }
      );
    }

    // Verificar existencia del usuario
    const userExists = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, username: true, name: true }
    });

    if (!userExists) {
      return NextResponse.json(
        { error: `Usuario no encontrado` },
        { status: 404 }
      );
    }

    // Verificar si existe la relación
    const followExists = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId
        }
      }
    });

    if (!followExists) {
      return NextResponse.json(
        { error: "No estás siguiendo a este usuario" },
        { status: 404 }
      );
    }

    // Eliminar relación
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetUserId
        }
      }
    });

    // Verificar si ya no hay seguimiento mutuo
    const mutualFollowExists = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetUserId,
          followingId: userId
        }
      }
    });

    // Si ya no hay seguimiento mutuo, eliminar todos los mensajes entre los usuarios
    if (!mutualFollowExists) {
      // Eliminar todos los mensajes entre ambos usuarios en ambas direcciones
      await prisma.directMessage.deleteMany({
        where: {
          OR: [
            {
              senderId: userId,
              receiverId: targetUserId
            },
            {
              senderId: targetUserId,
              receiverId: userId
            }
          ]
        }
      });
    }

    // Registrar la actividad de "unfollow"
    await prisma.activityHistory.create({
      data: {
        user: {
          connect: { id: userId }
        },
        type: "unfollow",
        targetId: targetUserId,
        targetName: userExists.username || userExists.name || "",
        targetType: "user",
        details: `Dejaste de seguir a ${userExists.username || userExists.name || ""}`,
        createdAt: new Date()
      }
    });

    // Revalidar caché
    revalidateTag(`user-${userId}-following`);
    revalidateTag(`user-${userId}-activity`);

    return NextResponse.json({
      success: true,
      isFollowing: false,
      followerCount: await prisma.follow.count({
        where: { followingId: targetUserId }
      })
    });
  } catch (error) {
    console.error("Error al dejar de seguir usuario:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
});
