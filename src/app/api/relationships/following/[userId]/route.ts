import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET para obtener los usuarios que sigue un usuario específico
export async function GET(req: Request, context: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
    
    // Verificar que el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true }
    });
    
    if (!userExists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Obtener usuarios seguidos con paginación
    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { 
          followerId: userId 
        },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              bio: true,
              role: true
            }
          }
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.follow.count({
        where: { followerId: userId }
      })
    ]);

    // Transformar datos para la respuesta
    const formattedFollowing = following.map(follow => ({
      ...follow.following,
      followingSince: follow.createdAt
    }));

    return NextResponse.json({
      following: formattedFollowing,
      data: formattedFollowing,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener usuarios seguidos:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de usuarios seguidos" },
      { status: 500 }
    );
  }
}
