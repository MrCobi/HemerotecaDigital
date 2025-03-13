import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// GET para verificar si un usuario sigue a otro
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("targetUserId");
    
    if (!targetUserId) {
      return NextResponse.json({ error: "Falta el parámetro targetUserId" }, { status: 400 });
    }

    // Verificar que el usuario objetivo existe
    const userExists = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true }
    });
    
    if (!userExists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si existe la relación de seguimiento
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: session.user.id,
          followingId: targetUserId
        }
      }
    });

    // Verificar si el usuario objetivo también sigue al usuario actual
    const reverseFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: targetUserId,
          followingId: session.user.id
        }
      }
    });

    // Obtener el número de seguidores del usuario objetivo
    const followerCount = await prisma.follow.count({
      where: { followingId: targetUserId }
    });

    return NextResponse.json({
      isFollowing: !!existingFollow,
      isMutualFollow: !!existingFollow && !!reverseFollow,
      followerCount
    });
  } catch (error) {
    console.error("Error al verificar estado de seguimiento:", error);
    return NextResponse.json(
      { error: "Error al verificar estado de seguimiento" },
      { status: 500 }
    );
  }
}
