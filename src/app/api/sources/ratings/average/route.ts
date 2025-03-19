// src/app/api/sources/ratings/average/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../../lib/auth-utils";

export const GET = withAuth(async (request: Request, { userId }: { userId: string }) => {
  const { searchParams } = new URL(request.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json(
      { message: "sourceId es requerido" },
      { status: 400 }
    );
  }

  try {
    const ratings = await prisma.rating.findMany({
      where: { sourceId },
    });

    const totalRatings = ratings.length; // Nuevo: Obtener conteo total
    const totalValue = ratings.reduce((sum, r) => sum + r.value, 0);
    const average = totalRatings > 0 ? totalValue / totalRatings : 0;

    return NextResponse.json({
      average,
      total: totalRatings // Añadir total a la respuesta
    });
  } catch (error) {
    console.error("Error al obtener la valoración media:", error);
    return NextResponse.json(
      { message: "Error al obtener la valoración media" },
      { status: 500 }
    );
  }
});