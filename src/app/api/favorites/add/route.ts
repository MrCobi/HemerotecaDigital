import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";
import { NextRequest } from "next/server";

// Esta es una ruta de compatibilidad transitoria
// que redirige las solicitudes a la API actualizada en /api/favorites

export const POST = withAuth(async (req: NextRequest, { userId }: { userId: string }) => {
  try {
    // Extraer el sourceId del cuerpo de la solicitud
    const body = await req.json();
    const { sourceId } = body;

    if (!sourceId) {
      return NextResponse.json(
        { error: "Se requiere sourceId" },
        { status: 400 }
      );
    }

    // Verificar si la fuente existe
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json(
        { error: "La fuente especificada no existe" },
        { status: 404 }
      );
    }

    // Verificar si ya está en favoritos
    const existingFavorite = await prisma.favoriteSource.findFirst({
      where: {
        userId,
        sourceId,
      },
    });

    if (existingFavorite) {
      return NextResponse.json(
        { message: "Esta fuente ya está en tus favoritos" },
        { status: 200 }
      );
    }

    // Añadir a favoritos
    const favorite = await prisma.favoriteSource.create({
      data: {
        userId,
        sourceId,
      },
    });

    return NextResponse.json(
      { 
        message: "Fuente añadida a favoritos con éxito",
        success: true
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al añadir favorito:", error);
    return NextResponse.json(
      { error: "Error al añadir favorito" },
      { status: 500 }
    );
  }
});
