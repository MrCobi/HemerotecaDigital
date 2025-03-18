import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { PrismaClient } from "@prisma/client";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    
    // Validar y convertir parámetros
    let page = Number(searchParams.get("page"));
    let limit = Number(searchParams.get("limit"));
    
    // Establecer valores por defecto si son inválidos
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 || limit > 100 ? 10 : limit;

    // Asegurar que prisma está correctamente tipado
    const prismaTyped = prisma as PrismaClient;

    // Obtener los IDs de los usuarios seguidos con información de showActivity
    const following = await prismaTyped.follow.findMany({
      where: { followerId: session.user.id },
      include: {
        following: {
          select: {
            id: true,
            showActivity: true
          }
        }
      }
    });

    // Filtrar solo los usuarios que tienen su actividad pública (showActivity = true)
    const followingIds = following
      .filter(f => f.following.showActivity)
      .map(f => f.followingId);

    // Obtener total de actividades solo de usuarios con actividad pública
    const total = await prismaTyped.activityHistory.count({
      where: { userId: { in: followingIds } },
    });

    // Obtener actividades paginadas solo de usuarios con actividad pública
    const activities = await prismaTyped.activityHistory.findMany({
      where: { userId: { in: followingIds } },
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
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      data: activities,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
    
  } catch (error) {
    console.error("Error fetching following activity:", error);
    return NextResponse.json(
      { error: "Error al obtener la actividad reciente" },
      { status: 500 }
    );
  }
}
