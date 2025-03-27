import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de un seguimiento por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: followId } = await params;

    // Verificar si el ID tiene el formato correcto (followerId_followingId)
    const [followerId, followingId] = followId.split('_');
    
    if (!followerId || !followingId) {
      return NextResponse.json({ error: "Formato de ID incorrecto" }, { status: 400 });
    }

    const follow = await prisma.follow.findUnique({
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
            image: true,
            email: true,
            bio: true,
            createdAt: true,
          }
        },
        following: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
            bio: true,
            createdAt: true,
          }
        }
      }
    });

    if (!follow) {
      return NextResponse.json({ error: "Seguimiento no encontrado" }, { status: 404 });
    }

    return NextResponse.json(follow);
  } catch (error) {
    console.error("Error al obtener seguimiento:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos del seguimiento" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un seguimiento
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: followId } = await params;

    // Verificar si el ID tiene el formato correcto (followerId_followingId)
    const [followerId, followingId] = followId.split('_');
    
    if (!followerId || !followingId) {
      return NextResponse.json({ error: "Formato de ID incorrecto" }, { status: 400 });
    }

    // Verificar que el seguimiento existe
    const follow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    if (!follow) {
      return NextResponse.json({ error: "Seguimiento no encontrado" }, { status: 404 });
    }

    // Eliminar el seguimiento
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      },
    });
    return NextResponse.json({ message: "Seguimiento eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar seguimiento:", error);
    return NextResponse.json(
      { error: "Error al eliminar el seguimiento" },
      { status: 500 }
    );
  }
}
