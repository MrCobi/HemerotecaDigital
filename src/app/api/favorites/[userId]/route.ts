// src/app/api/favorites/[userId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Favorite } from "@/src/interface/favorite";

// GET para obtener los favoritos de un usuario
export async function GET(
  req: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
    
    // Verificar que el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, showFavorites: true }
    });
    
    if (!userExists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Si el usuario no permite ver sus favoritos, devolver error o mensaje apropiado
    if (userExists.showFavorites === false) {
      return NextResponse.json(
        { error: "Este usuario ha elegido no compartir sus favoritos" },
        { status: 403 }
      );
    }

    // Obtener favoritos con paginación
    const [favorites, total] = await Promise.all([
      prisma.favoriteSource.findMany({
        where: { 
          userId: userId 
        },
        include: {
          source: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.favoriteSource.count({
        where: { userId: userId }
      })
    ]);

    // Transformar datos para la respuesta
    const formattedFavorites = favorites.map((favorite: Favorite) => ({
      id: `${favorite.userId}_${favorite.sourceId}`,
      createdAt: favorite.createdAt,
      source: favorite.source
    }));

    return NextResponse.json({
      favorites: formattedFavorites,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de favoritos" },
      { status: 500 }
    );
  }
}
