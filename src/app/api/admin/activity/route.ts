import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todo el historial de actividad con sus relaciones
export async function GET(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación y filtros
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 20), 1), 100);
    const userId = searchParams.get("userId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Construir condiciones de filtro
    const where: {
      userId?: string;
      type?: string;
      createdAt?: {
        gte?: Date;
        lte?: Date;
      };
    } = {};
    
    if (userId) {
      where.userId = userId;
    }
    
    if (type) {
      where.type = type;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Consultar datos con paginación
    const [activities, total] = await Promise.all([
      prisma.activityHistory.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityHistory.count({ where })
    ]);

    // Mapear los datos al formato esperado por el cliente
    const formattedActivities = activities.map((activity: {
      id: string;
      type: string;
      userId: string;
      createdAt: Date;
      sourceName?: string;
      sourceId?: string;
      targetName?: string;
      targetId?: string;
      targetType?: string;
      details?: string;
      user?: {
        id: string;
        name: string | null;
        username: string;
        image: string | null;
        email: string;
      };
    }) => ({
      id: activity.id,
      type: activity.type,
      userId: activity.userId,
      createdAt: activity.createdAt,
      sourceName: activity.sourceName,
      sourceId: activity.sourceId,
      targetName: activity.targetName,
      targetId: activity.targetId,
      targetType: activity.targetType,
      details: activity.details,
      user: activity.user
    }));

    return NextResponse.json({
      activities: formattedActivities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener historial de actividad:", error);
    return NextResponse.json(
      { error: "Error al obtener el historial de actividad" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un registro de actividad (para administradores)
export async function DELETE(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    
    // Si se proporciona un ID, eliminar solo ese registro
    if (id) {
      const activity = await prisma.activityHistory.findUnique({
        where: { id }
      });

      if (!activity) {
        return NextResponse.json({ error: "Registro de actividad no encontrado" }, { status: 404 });
      }

      await prisma.activityHistory.delete({
        where: { id }
      });

      return NextResponse.json({ message: "Registro de actividad eliminado correctamente" });
    } 
    
    // Si se proporciona un userId, eliminar todos los registros de ese usuario
    const userId = searchParams.get("userId");
    if (userId) {
      const result = await prisma.activityHistory.deleteMany({
        where: { userId }
      });

      return NextResponse.json({ 
        message: `Se eliminaron ${result.count} registros de actividad del usuario`,
        count: result.count
      });
    }

    // Si se proporciona un rango de fechas, eliminar registros en ese rango
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    
    if (startDate || endDate) {
      const dateFilter: {
        gte?: Date;
        lte?: Date;
      } = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) dateFilter.lte = new Date(endDate);
      
      const result = await prisma.activityHistory.deleteMany({
        where: { createdAt: dateFilter }
      });

      return NextResponse.json({ 
        message: `Se eliminaron ${result.count} registros de actividad en el rango de fechas especificado`,
        count: result.count
      });
    }
    
    return NextResponse.json(
      { error: "Se requiere especificar id, userId o rango de fechas para eliminar registros" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error al eliminar registros de actividad:", error);
    return NextResponse.json(
      { error: "Error al eliminar registros de actividad" },
      { status: 500 }
    );
  }
}
