// src/app/api/favorites/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { revalidateTag } from "next/cache";
import { withAuth } from "../../../lib/auth-utils";

// GET para obtener todos los favoritos del usuario
export const GET = withAuth(async (request: Request, { userId }: { userId: string }) => {
  try {
    // Obtener todos los favoritos del usuario actual
    const favorites = await prisma.favoriteSource.findMany({
      where: {
        userId: userId,
      },
      select: {
        sourceId: true,
      },
    });

    // Extraer los IDs de las fuentes favoritas
    const favoriteIds = favorites.map(fav => fav.sourceId);

    return NextResponse.json({ 
      favoriteIds, 
      count: favoriteIds.length 
    });
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    return NextResponse.json(
      { error: "Error interno al obtener favoritos" },
      { status: 500 }
    );
  }
});

// POST para añadir un favorito
export const POST = withAuth(async (request: Request, { userId }: { userId: string }) => {
  try {
    const { sourceId } = await request.json();

    if (!sourceId) {
      return NextResponse.json({ error: "ID de fuente no proporcionado" }, { status: 400 });
    }

    // Verificar que la fuente existe
    const sourceExists = await prisma.source.findUnique({
      where: { id: sourceId },
      select: { id: true, name: true }
    });

    if (!sourceExists) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Verificar si ya está en favoritos
    const existingFavorite = await prisma.favoriteSource.findUnique({
      where: {
        userId_sourceId: {
          userId: userId,
          sourceId: sourceId
        }
      }
    });

    if (existingFavorite) {
      return NextResponse.json({ error: "Ya está en favoritos" }, { status: 409 });
    }

    // Transacción para ambas operaciones
    await prisma.$transaction([
      // Crear favorito
      prisma.favoriteSource.create({
        data: {
          userId: userId,
          sourceId: sourceId,
        },
      }),
      // Registrar actividad
      prisma.activityHistory.create({
        data: {
          userId: userId,
          type: "favorite",
          sourceName: sourceExists.name,
          userName: (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || '',
          createdAt: new Date(),
        },
      }),
    ]);

    // Revalidar cache
    revalidateTag(`user-${userId}-favorites`);
    revalidateTag(`user-${userId}-activity`);

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Error al añadir favorito:", error);
    return NextResponse.json(
      { error: "Error interno al añadir favorito" },
      { status: 500 }
    );
  }
});

// DELETE para eliminar un favorito
export const DELETE = withAuth(async (request: Request, { userId }: { userId: string }) => {
  try {
    const { sourceId } = await request.json();

    if (!sourceId) {
      return NextResponse.json({ error: "ID de fuente no proporcionado" }, { status: 400 });
    }

    // Verificar que el favorito existe
    const favorite = await prisma.favoriteSource.findUnique({
      where: {
        userId_sourceId: {
          userId: userId,
          sourceId: sourceId
        }
      },
      include: {
        source: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!favorite) {
      return NextResponse.json({ error: "Favorito no encontrado" }, { status: 404 });
    }

    // Transacción para ambas operaciones
    await prisma.$transaction([
      // Eliminar favorito
      prisma.favoriteSource.delete({
        where: {
          userId_sourceId: {
            userId: userId,
            sourceId
          }
        }
      }),
      // Registrar actividad de eliminación
      prisma.activityHistory.create({
        data: {
          userId: userId,
          type: "favorite_removed",
          sourceName: favorite.source.name,
          userName: (await prisma.user.findUnique({ where: { id: userId }, select: { name: true } }))?.name || '',
          createdAt: new Date()
        },
      })
    ]);

    // Revalidar cache
    revalidateTag(`user-${userId}-favorites`);
    revalidateTag(`user-${userId}-activity`);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar favorito:", error);
    return NextResponse.json(
      { error: "Error interno al eliminar favorito" },
      { status: 500 }
    );
  }
});
