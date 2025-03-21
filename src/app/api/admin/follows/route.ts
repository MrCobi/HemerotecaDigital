import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todos los seguimientos con sus relaciones
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    // Obtener seguimientos con información de usuario seguidor y seguido
    const follows = await prisma.follow.findMany({
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
          }
        },
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(follows);
  } catch (error) {
    console.error("Error al obtener seguimientos:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de seguimientos" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo seguimiento (como administrador)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validar datos requeridos
    if (!body.followerId || !body.followingId) {
      return NextResponse.json(
        { error: "ID de seguidor e ID de seguido son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que los usuarios existen
    const followerExists = await prisma.user.findUnique({
      where: { id: body.followerId },
    });

    if (!followerExists) {
      return NextResponse.json(
        { error: "El usuario seguidor especificado no existe" },
        { status: 400 }
      );
    }

    const followingExists = await prisma.user.findUnique({
      where: { id: body.followingId },
    });

    if (!followingExists) {
      return NextResponse.json(
        { error: "El usuario seguido especificado no existe" },
        { status: 400 }
      );
    }

    // Verificar que no se está intentando seguir a uno mismo
    if (body.followerId === body.followingId) {
      return NextResponse.json(
        { error: "Un usuario no puede seguirse a sí mismo" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un seguimiento entre estos usuarios
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: body.followerId,
          followingId: body.followingId
        }
      }
    });

    if (existingFollow) {
      return NextResponse.json(
        { error: "El usuario ya sigue a este usuario" },
        { status: 400 }
      );
    }

    // Crear el nuevo seguimiento
    const newFollow = await prisma.follow.create({
      data: {
        followerId: body.followerId,
        followingId: body.followingId,
      },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        },
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        }
      }
    });

    // Actualizar contadores de followers y following
    try {
      // No se actualizan los contadores ya que no existen en el modelo actual
    } catch (error) {
      console.error("Error al actualizar contadores:", error);
      // Continuar con la respuesta, no fallar por esto
    }

    // Registrar actividad
    try {
      await prisma.activityHistory.create({
        data: {
          userId: body.followerId,
          type: "FOLLOW",
          targetUserId: body.followingId,
          targetUsername: followingExists.username || followingExists.name
        } as any
      });
    } catch (error) {
      console.error("Error al registrar actividad:", error);
      // Continuar con la respuesta, no fallar por esto
    }

    return NextResponse.json(newFollow, { status: 201 });
  } catch (error) {
    console.error("Error al crear seguimiento:", error);
    return NextResponse.json(
      { error: "Error al crear el seguimiento" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un seguimiento (como administrador)
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const followerId = searchParams.get("followerId");
    const followingId = searchParams.get("followingId");

    // Validar parámetros
    if (!followerId || !followingId) {
      return NextResponse.json(
        { error: "Se requieren los parámetros followerId y followingId" },
        { status: 400 }
      );
    }

    // Verificar si existe el seguimiento
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      },
      include: {
        follower: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        },
        following: {
          select: {
            id: true,
            name: true,
            username: true,
          }
        }
      }
    });

    if (!existingFollow) {
      return NextResponse.json(
        { error: "No se encontró la relación de seguimiento" },
        { status: 404 }
      );
    }

    // Eliminar el seguimiento
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    // Actualizar contadores (si existen en el modelo)
    try {
      // No se actualizan los contadores ya que no existen en el modelo actual
    } catch (error) {
      console.error("Error al actualizar contadores:", error);
      // Continuar con la respuesta, no fallar por esto
    }

    // Registrar actividad de eliminación (si es necesario)
    try {
      await prisma.activityHistory.create({
        data: {
          userId: followerId,
          type: "unfollow",
          sourceName: existingFollow.follower.username || existingFollow.follower.name || "",
          sourceId: followerId,
          targetName: existingFollow.following.username || existingFollow.following.name || "",
          targetId: followingId,
          targetType: "user",
          details: `Eliminada relación de seguimiento (por administrador)`,
          createdAt: new Date()
        } as any
      });
    } catch (error) {
      console.error("Error al registrar actividad:", error);
      // Continuar con la respuesta, no fallar por esto
    }

    return NextResponse.json({
      success: true,
      message: "Relación de seguimiento eliminada correctamente"
    });
  } catch (error) {
    console.error("Error al eliminar seguimiento:", error);
    return NextResponse.json(
      { error: "Error al eliminar la relación de seguimiento" },
      { status: 500 }
    );
  }
}
