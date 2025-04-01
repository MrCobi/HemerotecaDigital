import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    // Verificar sesión y permisos de administrador
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    // Obtener parámetro de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q") || "";

    if (!query.trim() || query.length < 2) {
      return NextResponse.json([]);
    }

    // Buscar usuarios que coincidan con el término de búsqueda
    const users = await prisma.user.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
            },
          },
          {
            email: {
              contains: query,
            },
          },
          {
            username: {
              contains: query,
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        username: true,
        role: true,
      },
      take: 10,
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error al buscar usuarios:", error);
    return NextResponse.json({ error: "Error al buscar usuarios" }, { status: 500 });
  }
}
