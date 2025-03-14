// src/app/api/relationships/mutual/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 1. Obtener IDs de seguidores mutuos en una sola consulta
    const mutualRelationships = await prisma.$queryRaw`
      SELECT f1.followerId 
      FROM Follow f1
      INNER JOIN Follow f2 
        ON f1.followerId = f2.followingId 
        AND f1.followingId = f2.followerId
      WHERE f1.followingId = ${session.user.id}
    `;

    const mutualIds = (mutualRelationships as { followerId: string }[])
      .map(rel => rel.followerId);

    // 2. Obtener detalles de los usuarios mutuos
    const mutualUsers = await prisma.user.findMany({
      where: { id: { in: mutualIds } },
      select: {
        id: true,
        username: true,
        name: true,
        image: true,
        email: true
      }
    });

    // 3. Formatear respuesta asegurando campos requeridos
    const formattedUsers = mutualUsers.map(user => ({
      id: user.id,
      username: user.username || `user_${user.id.slice(0, 6)}`,
      name: user.name || "Usuario",
      image: user.image,
      email: user.email
    }));

    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error("Error al obtener seguidores mutuos:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}