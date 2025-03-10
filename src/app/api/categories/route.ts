// src/app/api/categories/route.ts
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Obtener las categorías únicas de las fuentes
    const categories = await prisma.source.findMany({
      select: {
        category: true,
      },
      distinct: ["category"],
    });

    // Devolver las categorías
    return NextResponse.json(categories.map((c) => c.category));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Error interno - Ver logs del servidor" },
      { status: 500 }
    );
  }
}