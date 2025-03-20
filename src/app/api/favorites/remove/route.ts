import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";

// Implementación del método DELETE (para compatibilidad con REST)
export const DELETE = withAuth(async (req: Request, { userId }: { userId: string }) => {
  return await removeFavorite(req, userId);
});

// Implementación del método POST (para clientes que prefieren usar POST)
export const POST = withAuth(async (req: Request, { userId }: { userId: string }) => {
  return await removeFavorite(req, userId);
});

// Función auxiliar que maneja la lógica común entre DELETE y POST
async function removeFavorite(req: Request, userId: string) {
  try {
    let sourceId;
    
    // Intentar obtener el sourceId del body
    try {
      const body = await req.json();
      sourceId = body.sourceId;
    } catch {
      // Si no hay body o no se puede parsear, intentar obtener de los parámetros
      const { searchParams } = new URL(req.url);
      sourceId = searchParams.get("sourceId");
    }

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId es requerido" },
        { status: 400 }
      );
    }

    // Eliminar el favorito de la base de datos
    const result = await prisma.favoriteSource.deleteMany({
      where: {
        userId,
        sourceId,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { message: "No se encontró el favorito o ya fue eliminado" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Favorito eliminado con éxito", success: true },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar favorito:", error);
    return NextResponse.json(
      { error: "Error al eliminar favorito" },
      { status: 500 }
    );
  }
}
