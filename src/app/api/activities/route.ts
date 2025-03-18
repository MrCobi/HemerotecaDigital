import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { PrismaClient } from "@prisma/client";

export const dynamic = 'force-dynamic';

// Endpoint para obtener actividades globales o filtradas
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 100);
    const skip = (page - 1) * limit;

    // Asegurar que prisma estu00e1 correctamente tipado
    const prismaTyped = prisma as PrismaClient;

    // Obtener actividades recientes globales (se puede filtrar mu00e1s adelante)
    const [activities, total] = await Promise.all([
      prismaTyped.activityHistory.findMany({
        take: limit,
        skip: skip,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true,
            },
          },
        },
      }),
      prismaTyped.activityHistory.count()
    ]);

    return NextResponse.json({
      success: true,
      data: activities,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error fetching activities:", error);
    return NextResponse.json(
      { 
        success: false,
        error: "Error al obtener actividades",
        details: error instanceof Error ? error.message : "Error desconocido" 
      },
      { status: 500 }
    );
  }
}
