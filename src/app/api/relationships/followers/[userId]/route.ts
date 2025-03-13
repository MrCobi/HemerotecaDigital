import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Follow, FollowerResponse } from "@/src/interface/relationship";

// GET para obtener los seguidores de un usuario
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

    // Obtener seguidores con paginación
    const [followers, total] = await Promise.all([
      prisma.follow.findMany({
        where: { 
          followingId: userId 
        },
        include: {
          follower: {
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
        where: { followingId: userId }
      })
    ]);

    // Transformar datos para la respuesta
    const formattedFollowers = followers.map((follow): FollowerResponse => ({
      id: follow.follower!.id,
      name: follow.follower!.name,
      username: follow.follower!.username,
      image: follow.follower!.image,
      bio: follow.follower!.bio,
      role: follow.follower!.role,
      followingSince: follow.createdAt
    }));

    return NextResponse.json({
      followers: formattedFollowers,
      data: formattedFollowers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener seguidores:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de seguidores" },
      { status: 500 }
    );
  }
}
