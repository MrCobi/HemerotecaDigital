import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";
import { revalidateTag } from "next/cache";
import { PrismaClient } from "@prisma/client";

// Implementación del método DELETE (para compatibilidad con REST)
export const DELETE = withAuth(async (req: Request, { userId }: { userId: string }) => {
  return await removeFavorite(req, userId);
});

// Implementación del método POST (para clientes que prefieren usar POST)
export const POST = withAuth(async (req: Request, { userId }: { userId: string }) => {
  return await removeFavorite(req, userId);
});

// Función auxiliar que maneja la lógica común entre DELETE y POST
async function removeFavorite(req: Request, userId: string) {
  try {
    let sourceId;
    
    // Intentar obtener el sourceId del body
    try {
      const body = await req.json();
      sourceId = body.sourceId;
    } catch {
      // Si no hay body o no se puede parsear, intentar obtener de los parámetros
      const { searchParams } = new URL(req.url);
      sourceId = searchParams.get("sourceId");
    }

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId es requerido" },
        { status: 400 }
      );
    }

    // Verificar si la fuente existe
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { error: "La fuente especificada no existe" },
        { status: 404 }
      );
    }

    // Verificar si existe el favorito
    const existingFavorite = await prisma.favoriteSource.findFirst({
      where: {
        userId,
        sourceId,
      },
    });

    if (!existingFavorite) {
      return NextResponse.json(
        { message: "No se encontró el favorito o ya fue eliminado" },
        { status: 404 }
      );
    }

    // Eliminar el favorito y registrar actividad
    await prisma.$transaction(async (tx: Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use'>) => {
      // Eliminar favorito
      await tx.favoriteSource.deleteMany({
        where: {
          userId,
          sourceId,
        },
      });
      
      // Registrar actividad
      await tx.activityHistory.create({
        data: {
          userId: userId,
          type: "favorite_removed",
          sourceName: source.name,
          sourceId: source.id,
          targetName: null,
          targetId: null,
          targetType: null,
          details: `Eliminaste ${source.name} de favoritos`,
          createdAt: new Date()
        }
      });
    });

    // Revalidar cache
    revalidateTag(`user-${userId}-favorites`);
    revalidateTag(`user-${userId}-activity`);

    return NextResponse.json(
      { message: "Favorito eliminado con éxito", success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar favorito:", error);
    return NextResponse.json(
      { error: "Error al eliminar favorito" },
      { status: 500 }
    );
  }
}
