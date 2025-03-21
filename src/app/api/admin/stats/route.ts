import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";

// API route that provides dashboard statistics for the admin panel
export const GET = withAuth(async (req: Request, { userId }: { userId: string }) => {
  try {
    // Verificar que el usuario es un administrador
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });

    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado" },
        { status: 403 }
      );
    }

    // Obtener conteos de cada entidad para mostrar estadísticas
    const [userCount, sourceCount, commentCount, ratingCount, favoriteCount, messageCount] = await Promise.all([
      prisma.user.count(),
      prisma.source.count(),
      prisma.comment.count(),
      prisma.rating.count(),
      prisma.favoriteSource.count(),
      prisma.directMessage.count()
    ]);

    return NextResponse.json({
      userCount,
      sourceCount,
      commentCount,
      ratingCount,
      favoriteCount,
      messageCount
    });
  } catch (error) {
    console.error("Error al obtener estadísticas de administrador:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
});
