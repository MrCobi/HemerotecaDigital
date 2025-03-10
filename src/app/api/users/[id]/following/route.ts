// src/app/api/users/[id]/following/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    
    // Validar formato del ID
    if (!/^[a-z0-9]+$/i.test(id)) {
      return NextResponse.json(
        { error: "ID de usuario inválido" },
        { status: 400 }
      );
    }

    // Verificar existencia del usuario
    const userExists = await prisma.user.findUnique({
      where: { id: id },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Obtener seguidos con paginación
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get("limit")) || 20;
    const page = Number(searchParams.get("page")) || 1;

    const [following, total] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: id },
        include: {
          following: {
            select: {
              id: true,
              name: true,
              username: true,
              image: true
            }
          }
        },
        take: limit,
        skip: (page - 1) * limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.follow.count({
        where: { followerId: id }
      })
    ]);

    return NextResponse.json({
      data: following.map(f => f.following),
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("Error fetching following:", error);
    return NextResponse.json(
      { error: "Error al obtener seguidos" },
      { status: 500 }
    );
  }
}
