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

    // Consulta corregida para seguidores mutuos
    const mutualRelationships = await prisma.$queryRaw`
      SELECT f1.follower_id as followerId
      FROM follows f1
      INNER JOIN follows f2 
        ON f1.follower_id = f2.following_id 
        AND f1.following_id = f2.follower_id
      WHERE f1.following_id = ${session.user.id}
    `;

    // Extraer IDs válidos y filtrar undefined
    const mutualIds = (mutualRelationships as { followerId: string }[])
      .map(rel => rel.followerId)
      .filter(id => typeof id === "string");

    // Si no hay IDs válidos, retornar array vacío
    if (mutualIds.length === 0) {
      return NextResponse.json([]);
    }

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