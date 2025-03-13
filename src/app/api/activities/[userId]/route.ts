import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export const dynamic = 'force-dynamic';

interface ActivityResult {
  type: string;
  createdAt: Date;
  sourceName: string | null;
  userName: string | null;
  total: number | bigint;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
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

    // Consulta SQL usando activity_history
    const query = await prisma.$queryRaw<ActivityResult[]>`
      WITH limited_activities AS (
        SELECT * FROM activity_history
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT 20
      )
      SELECT 
        *,
        (SELECT COUNT(*) FROM limited_activities) AS total
      FROM limited_activities
      ORDER BY created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    // Extraer total y actividades
    const totalCount = Number(query[0]?.total || 0);
    const activities = query.map(({ total: _total, ...rest }) => rest);

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
}
