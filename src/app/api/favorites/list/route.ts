// src/app/api/favorites/list/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";

// Este endpoint es transitorio hasta que todas las referencias
// del frontend hayan sido actualizadas a la nueva estructura API
export const GET = withAuth(async (request: Request, { userId }: { userId: string }) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 100);

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
        where: { 
          userId: userId
        }
      })
    ]);

    // Transformar datos para la respuesta
    const formattedFavorites = favorites.map((favorite) => ({
      id: `${favorite.userId}_${favorite.sourceId}`,
      createdAt: favorite.createdAt,
      source: favorite.source
    }));

    // Extraer solo los IDs de las fuentes para compatibilidad con el cliente
    const favoriteIds = favorites.map(favorite => favorite.sourceId);

    return NextResponse.json({
      favorites: formattedFavorites,
      favoriteIds,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    return NextResponse.json(
      { message: "Error al obtener favoritos" },
      { status: 500 }
    );
  }
});
