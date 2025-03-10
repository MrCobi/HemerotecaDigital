import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  try {
    const { sourceIds } = await request.json();

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { message: "sourceIds es requerido y debe ser un array" },
        { status: 400 }
      );
    }

    // Obtener los detalles de los periódicos
    const sources = await prisma.source.findMany({
      where: {
        id: {
          in: sourceIds, // Filtra por los IDs proporcionados
        },
      },
    });

    return NextResponse.json({ sources });
  } catch (error) {
    console.error("Error al obtener detalles de los periódicos:", error);
    return NextResponse.json(
      { message: "Error al obtener detalles de los periódicos" },
      { status: 500 }
    );
  }
}