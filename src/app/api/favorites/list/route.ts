import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET(_request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const favorites = await prisma.favoriteSource.findMany({
      where: {
        userId: session.user.id,
      },
      select: {
        sourceId: true,
      },
    });

    const favoriteIds = favorites.map((favorite) => favorite.sourceId);
    return NextResponse.json({ favoriteIds });
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    return NextResponse.json(
      { message: "Error al obtener favoritos" },
      { status: 500 }
    );
  }
}