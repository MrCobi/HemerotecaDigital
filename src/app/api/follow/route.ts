import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { followingId } = await req.json();

    if (!followingId) {
      return NextResponse.json({ error: "Missing followingId" }, { status: 400 });
    }

    // Verificar si ya existe el follow
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
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
      select: { username: true }
    });

    if (!followingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Crear el follow
    const newFollow = await prisma.follow.create({
      data: {
        followerId: session.user.id,
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
        userId: session.user.id,
        type: "follow",
        sourceName: null,
        userName: followingUser.username,
        createdAt: new Date()
      }
    });

    // Revalidar caché
    revalidateTag(`user-${session.user.id}-following`);
    revalidateTag(`user-${session.user.id}-activity`);

    return NextResponse.json(newFollow);
  } catch (error) {
    console.error("Error following user:", error);
    return NextResponse.json(
      { error: "Failed to follow user" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");

    // Validación mejorada con mensajes claros
    if (!targetUserId) {
      return NextResponse.json(
        { error: "Parámetro 'targetUserId' requerido en la URL" },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9-]{20,}$/i.test(targetUserId)) {
      return NextResponse.json(
        { error: "Formato de ID inválido. Debe contener letras, números y guiones, con mínimo 20 caracteres" },
        { status: 400 }
      );
    }

    // Verificar existencia del usuario con manejo de errores
    const userExists = await prisma.user.findUnique({
      where: { id: targetUserId },
    }).catch(() => null);

    if (!userExists) {
      return NextResponse.json(
        { error: `Usuario con ID ${targetUserId} no encontrado` },
        { status: 404 }
      );
    }

    // Eliminar relación con validación de existencia
    const deleteResult = await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: targetUserId
        }
      }
    });

    if (!deleteResult) throw new Error("No se pudo eliminar la relación");

    // Registrar la actividad de "unfollow"
    await prisma.activityHistory.create({
      data: {
        userId: session.user.id,
        type: "unfollow",
        sourceName: null,
        userName: userExists.username,
        createdAt: new Date()
      }
    });

    // Revalidar caché
    revalidateTag(`user-${session.user.id}-following`);
    revalidateTag(`user-${session.user.id}-activity`);

    return NextResponse.json({ 
      success: true,
      message: "Dejaste de seguir al usuario correctamente"
    });
  } catch (error: unknown) {
    console.error("Error detallado:", error);
    return NextResponse.json(
      { 
        error: "Error al procesar la solicitud",
        details: (error instanceof Error) ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}