import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { PrismaClient } from "@prisma/client";
import { withAuth } from "../../../../lib/auth-utils";

export const dynamic = 'force-dynamic';

interface ActivityResult {
  id: string;
  type: string;
  createdAt: Date;
  sourceName: string | null;
  targetName: string | null;
  targetId: string | null;
  targetType: string | null;
  details: string | null;
  userId: string;
  userName: string | null;
  userUsername: string | null;
  userEmail: string | null;
  userImage: string | null;
  total: number | bigint;
}

export const GET = withAuth(async (
  request: Request,
  { userId: _currentUserId }: { userId: string },
  context: { params: Promise<{ userId: string }> }
) => {
  try {
    const { userId } = await context.params;

    // Obtener parámetros de paginación
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5'); // Por página
    const offset = (page - 1) * limit;

    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { success: false, error: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    // Asegurar que prisma está correctamente tipado antes de usar $queryRaw
    const prismaTyped = prisma as PrismaClient;
    
    // Consulta SQL usando activity_history con join para obtener datos del usuario
    const query = await prismaTyped.$queryRaw<ActivityResult[]>`
      WITH limited_activities AS (
        SELECT 
          a.id,
          a.type,
          a.created_at as createdAt,
          a.source_name as sourceName,
          a.target_name as targetName,
          a.target_id as targetId,
          a.target_type as targetType,
          a.details,
          u.id as userId,
          u.name as userName,
          u.username as userUsername,
          u.email as userEmail,
          u.image as userImage,
          (SELECT COUNT(*) FROM activity_history WHERE user_id = ${userId}) AS total
        FROM activity_history a
        JOIN users u ON a.user_id = u.id
        WHERE a.user_id = ${userId}
        ORDER BY a.created_at DESC
        LIMIT ${limit}
        OFFSET ${offset}
      )
      SELECT * FROM limited_activities
    `;

    // Extraer total y actividades
    const totalCount = Number(query[0]?.total || 0);
    
    // Mapear los resultados para formar la estructura correcta
    const activities = query.map(({ total: _total, userId, userName, userUsername, userEmail, userImage, ...rest }) => ({
      ...rest,
      user: {
        id: userId,
        name: userName,
        username: userUsername,
        email: userEmail,
        image: userImage
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        activities,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page
      }
    });

  } catch (error) {
    console.error("Error detallado:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener actividades",
        detalle: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
});
