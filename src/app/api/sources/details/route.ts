import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// Esta es una ruta de compatibilidad transitoria que redirige 
// las solicitudes a la API actualizada en /api/sources

export async function POST(req: Request): Promise<NextResponse>  {
  try {
    // Extraer los IDs de fuentes del cuerpo de la solicitud
    const body = await req.json();
    const { sourceIds } = body;

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: "Los ids de fuentes son requeridos y deben ser un array" },
        { status: 400 }
      );
    }

    // Consultar directamente la base de datos en lugar de hacer otra llamada API
    const sources = await prisma.source.findMany({
      where: {
        id: {
          in: sourceIds,
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        category: true,
        language: true,
        country: true,
        imageUrl: true,
        // Puedes añadir más campos según sea necesario
      },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error en detalles de fuentes:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud de detalles de fuentes" },
      { status: 500 }
    );
  }
}

