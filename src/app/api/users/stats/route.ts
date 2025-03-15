// app/api/user/stats/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET() {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  
    try {
      const userId = session.user.id;
  
      const [favorites, comments, ratings, activities] = await Promise.all([
        prisma.favoriteSource.count({ where: { userId } }),
        prisma.comment.count({ where: { userId } }),
        prisma.rating.count({ where: { userId } }),
        prisma.activityHistory.count({ where: { userId } }),
      ]);
  
      // Manejo seguro del createdAt
      if (!session.user.createdAt) {
        return NextResponse.json(
          { error: "Fecha de creación no disponible" }, 
          { status: 400 }
        );
      }

      // Conversión explícita a string y validación
      const creationDateString = session.user.createdAt as unknown as string;
      const creationDate = new Date(creationDateString);
      
      if (isNaN(creationDate.getTime())) {
        return NextResponse.json(
          { error: "Fecha de creación inválida" }, 
          { status: 400 }
        );
      }

      const today = new Date();
      const activeDays = Math.floor(
        (today.getTime() - creationDate.getTime()) / (1000 * 3600 * 24)
      );

      return NextResponse.json({
        favoriteCount: favorites,
        commentCount: comments,
        ratingCount: ratings,
        activityCount: activities,
        totalInteractions: favorites + comments + ratings,
        activeDays: activeDays,
      });
      
    } catch (error) {
      console.error("Error detallado:", error);
      return NextResponse.json(
        { 
          error: "Error al obtener estadísticas",
          details: error instanceof Error ? error.message : "Error desconocido"
        },
        { status: 500 }
      );
    }
}