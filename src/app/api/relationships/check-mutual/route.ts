// src/app/api/relationships/check-mutual/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener el ID del otro usuario desde los query params
    const { searchParams } = new URL(request.url);
    const otherUserId = searchParams.get("userId");

    // Validar que el ID del otro usuario esté presente
    if (!otherUserId) {
      return NextResponse.json(
        { error: "Se requiere el ID del usuario" },
        { status: 400 }
      );
    }

    // Verificar que no se está intentando comprobar el seguimiento con uno mismo
    if (session.user.id === otherUserId) {
      return NextResponse.json({ mutualFollow: false });
    }

    // Consulta para verificar si hay seguimiento mutuo
    const mutualFollow = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM follows f1
      INNER JOIN follows f2 
        ON f1.follower_id = f2.following_id 
        AND f1.following_id = f2.follower_id
      WHERE (f1.following_id = ${session.user.id} AND f1.follower_id = ${otherUserId})
    `;

    // Extraer el resultado
    const count = (mutualFollow as { count: bigint }[])[0]?.count || BigInt(0);
    
    return NextResponse.json({ 
      mutualFollow: count > BigInt(0),
      currentUserId: session.user.id,
      otherUserId
    });

  } catch (error) {
    console.error("Error al verificar seguimiento mutuo:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}
