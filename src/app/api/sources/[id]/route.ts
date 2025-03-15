// src/app/api/sources/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Source } from "@/src/interface/source";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const source = await prisma.source.findUnique({
      where: { id: id },
      include: {
        ratings: true,
        comments: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true
              }
            }
          }
        },
        favoriteSources: true
      }
    });

    if (!source) {
      return NextResponse.json(
        { error: "Fuente no encontrada" },
        { status: 404 }
      );
    }

    const avgRating = source.ratings.length > 0 
      ? source.ratings.reduce((sum, rating) => sum + rating.value, 0) / source.ratings.length 
      : 0;

    const formattedSource: Source = {
      ...source,
      avgRating: Number(avgRating.toFixed(1)),
      ratingCount: source.ratings.length,
      favoriteCount: source.favoriteSources.length,
      recentComments: source.comments.map(comment => ({
        id: comment.id,
        content: comment.content,
        userId: comment.userId,
        sourceId: comment.sourceId,
        createdAt: comment.createdAt.toISOString(),
        updatedAt: comment.updatedAt?.toISOString(),
        user: {
          id: comment.user.id,
          name: comment.user.name || "Usuario Anónimo",
          username: comment.user.username || "usuario",
          image: comment.user.image || undefined
        },
        ...('path' in comment && { path: comment.path })
      }))
    };

    return NextResponse.json(formattedSource);

  } catch (error) {
    console.error("Error al obtener detalles de la fuente:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}