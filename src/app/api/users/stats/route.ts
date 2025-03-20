// app/api/user/stats/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";
import { User } from "@prisma/client";

export const GET = withAuth(async (req: Request, { userId, user }: { userId: string, user: User }) => {
    try {
      const [favorites, comments, ratings, activities] = await Promise.all([
        prisma.favoriteSource.count({ where: { userId } }),
        prisma.comment.count({ where: { userId } }),
        prisma.rating.count({ where: { userId } }),
        prisma.activityHistory.count({ where: { userId } }),
      ]);
  
      // Manejo seguro del createdAt
      if (!user.createdAt) {
        return NextResponse.json(
          { error: "Fecha de creación no disponible" }, 
          { status: 400 }
        );
      }

      // Conversión explícita a Date
      let creationDate: Date;
      
      if (typeof user.createdAt === 'string') {
        creationDate = new Date(user.createdAt);
      } else if (user.createdAt instanceof Date) {
        creationDate = user.createdAt;
      } else {
        return NextResponse.json(
          { error: "Formato de fecha de creación inválido" }, 
          { status: 400 }
        );
      }
      
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
});