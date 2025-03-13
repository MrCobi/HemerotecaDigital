// src/app/api/sources/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Rating } from "@/src/interface/source";

// GET para obtener los detalles de una fuente específica
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    // Verificar que la fuente existe
    const source = await prisma.source.findUnique({
      where: { id }
    });
    
    if (!source) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Calcular rating promedio
    const ratings = await prisma.rating.findMany({
      where: { sourceId: id }
    });
    
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum: number, rating: Rating) => sum + rating.value, 0) / ratings.length 
      : 0;

    // Obtener detalles adicionales como comentarios recientes
    const recentComments = await prisma.comment.findMany({
      where: { sourceId: id },
      orderBy: { createdAt: 'desc' },
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
    });

    return NextResponse.json({
      source: {
        ...source,
        avgRating,
        ratingCount: ratings.length
      },
      recentComments
    });
  } catch (error) {
    console.error("Error al obtener detalles de la fuente:", error);
    return NextResponse.json(
      { error: "Error al obtener detalles de la fuente" },
      { status: 500 }
    );
  }
}
