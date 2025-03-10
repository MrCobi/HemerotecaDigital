// src/app/api/favorites/add/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { sourceId } = await request.json();

  try {
    // Transacción para ambas operaciones
    const _result = await prisma.$transaction(async (tx) => {
      // 1. Agregar a favoritos
      await tx.favoriteSource.create({
        data: {
          userId: session.user.id,
          sourceId,
        },
      });

      // 2. Obtener nombre del periódico
      const source = await tx.source.findUnique({
        where: { id: sourceId },
        select: { name: true },
      });

      // 3. Registrar en historial de actividades
      await tx.activityHistory.create({
        data: {
          userId: session.user.id,
          type: "favorite_added", // o "favorite_removed"
          sourceName: source?.name || "Fuente desconocida",
          userName: session.user.name, // Agregar esta línea
          createdAt: new Date(),
        },
      });

      // 4. Limitar a 20 actividades
      const activities = await tx.activityHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });

      if (activities.length > 20) {
        const toDelete = activities.slice(20);
        await tx.activityHistory.deleteMany({
          where: {
            id: { in: toDelete.map((a) => a.id) },
          },
        });
      }

      return true;
    });

    return NextResponse.json({ message: "Fuente agregada a favoritos" });

  } catch (error) {
    console.error("Error al agregar fuente a favoritos:", error);
    return NextResponse.json(
      { message: "Error al agregar fuente a favoritos" },
      { status: 500 }
    );
  }
}