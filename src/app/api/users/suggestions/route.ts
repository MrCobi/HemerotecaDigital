// src/app/api/users/suggestions/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

export async function GET(req: Request) {
  const session = await auth();
  try {
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const userId = session.user.id;
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.toLowerCase() || "";

    if (!userId) {
      return NextResponse.json(
        { error: "ID de usuario requerido" },
        { status: 400 }
      );
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: userId } },
          { followers: { none: { followerId: userId } } },
          {
            OR: [
              { name: { contains: query } },
              { username: { contains: query } },
              { bio: { contains: query } }
            ]
          }
        ]
      },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        bio: true
      },
      take: 30,
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ data: users });
  } catch (error: unknown) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}