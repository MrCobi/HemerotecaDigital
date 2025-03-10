import { NextResponse } from "next/server";
import { auth } from "@/auth"; // Importa la función auth
import prisma from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth(); // Obtén la sesión

  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json(
      { message: "sourceId es requerido" },
      { status: 400 }
    );
  }

  try {
    const favorite = await prisma.favoriteSource.findUnique({
      where: {
        userId_sourceId: {
          userId: session.user.id,
          sourceId,
        },
      },
    });
    return NextResponse.json({ isFavorite: !!favorite });
  } catch (error) {
    console.error("Error al verificar fuente favorita:", error);
    return NextResponse.json(
      { message: "Error al verificar fuente favorita" },
      { status: 500 }
    );
  }
}