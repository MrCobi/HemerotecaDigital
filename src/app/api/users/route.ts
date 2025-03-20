import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../lib/auth-utils";
import { User } from "@prisma/client";

// Esta ruta es solo para administradores
export const GET = withAuth(async (req: Request, { userId: _userId, user }: { userId: string, user: User }) => {
  try {
    // Verificar si el usuario es admin
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Acceso denegado: se requieren permisos de administrador" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const page = Number(searchParams.get("page") || 1);
    const limit = Math.min(Number(searchParams.get("limit") || 10), 100);
    const search = searchParams.get("search") || "";

    const where = search ? {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } }
      ]
    } : {};
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          role: true,
          createdAt: true
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" }
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Error al obtener usuarios" },
      { status: 500 }
    );
  }
});