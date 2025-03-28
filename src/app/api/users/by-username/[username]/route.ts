// app/api/users/by-username/[username]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params; // Obtener directamente de params
  
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        createdAt: true, 
        showFavorites: true,
        showActivity: true,
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Obtener estadísticas adicionales en paralelo
    const [followers, following, comments] = await Promise.all([
      prisma.follow.count({ where: { followingId: user.id } }),
      prisma.follow.count({ where: { followerId: user.id } }),
      prisma.comment.count({ where: { userId: user.id } })
    ]);

    // Calcular días activos
    const activeDays = Math.floor(
      (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const favorites = user?.showFavorites ? await prisma.favoriteSource.findMany({
      where: { userId: user.id },
      include: { source: true }
    }) : [];

    // Obtener actividad si está pública
    const activity = user?.showActivity ? await prisma.activityHistory.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: 5
    }) : [];

    return NextResponse.json({
      ...user,
      stats: { // Agregar estadísticas en un objeto separado
        followers,
        following,
        comments,
        activeDays
      },
      favorites: favorites.map(f => f.source),
      activity,
      privacySettings: {
        showFavorites: user?.showFavorites,
        showActivity: user?.showActivity
      }
    });
    
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}