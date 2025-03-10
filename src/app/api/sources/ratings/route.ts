// src/app/api/sources/ratings/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// Manejar solicitudes GET
export async function GET(request: Request) {
  const session = await auth();

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
    // Obtener la valoración del usuario actual
    const rating = await prisma.rating.findUnique({
      where: {
        userId_sourceId: {
          userId: session.user.id,
          sourceId,
        },
      },
      select: {
        value: true,
      },
    });

    return NextResponse.json({ rating: rating?.value || 0 });
  } catch (error) {
    console.error("Error al obtener la valoración:", error);
    return NextResponse.json(
      { message: "Error al obtener la valoración" },
      { status: 500 }
    );
  }
}
// Manejar solicitudes POST (ya existente)
// Método POST modificado
export async function POST(request: Request) {
  const session = await auth();
  console.log("session", session);

  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { sourceId, value } = await request.json();

  if (!sourceId || value < 1 || value > 5) {
    return NextResponse.json(
      { message: "Datos inválidos" },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Obtener nombre de la fuente
      const source = await tx.source.findUnique({
        where: { id: sourceId },
        select: { name: true }
      });

      if (!source) {
        throw new Error("Fuente no encontrada");
      }

      // 2. Crear/Actualizar rating
      const rating = await tx.rating.upsert({
        where: { userId_sourceId: { userId: session.user.id, sourceId } },
        update: { value },
        create: { userId: session.user.id, sourceId, value }
      });

      // 3. Registrar en historial
      await tx.activityHistory.create({
        data: {
          userId: session.user.id,
          type: value === 0 ? "rating_removed" : "rating_added",
          sourceName: source.name,
          userName: session.user.name, // Incluir el nombre del usuario
          createdAt: new Date(),
        }
      });

      // 4. Limitar a 20 actividades
      const activities = await tx.activityHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" }
      });

      if (activities.length > 20) {
        const toDelete = activities.slice(20);
        await tx.activityHistory.deleteMany({
          where: { id: { in: toDelete.map(a => a.id) } }
        });
      }

      return rating;
    });

    return NextResponse.json({ result });

  } catch (error: unknown) {
    console.error("Error al guardar la valoración:", error);
    return NextResponse.json(
      { message: (error instanceof Error ? error.message : "Error al guardar la valoración") },
      { status: 500 }
    );
  }
}

// Método DELETE modificado
export async function DELETE(req: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sourceId = searchParams.get("sourceId");

  if (!sourceId) {
    return NextResponse.json(
      { message: "sourceId es requerido" },
      { status: 400 }
    );
  }

  try {
    const _result = await prisma.$transaction(async (tx) => {
      // 1. Obtener rating y fuente
      const rating = await tx.rating.findUnique({
        where: { userId_sourceId: { userId: session.user.id, sourceId } },
        include: { source: true }
      });

      if (!rating) {
        throw new Error("Valoración no encontrada");
      }

      // 2. Eliminar rating
      await tx.rating.delete({
        where: { userId_sourceId: { userId: session.user.id, sourceId } }
      });

      // 3. Registrar en historial
      await tx.activityHistory.create({
        data: {
          userId: session.user.id,
          type: "rating_removed",
          sourceName: rating.source.name,
          userName: session.user.name, // Incluir el nombre del usuario
          createdAt: new Date(),
        }
      });

      // 4. Limitar a 20 actividades
      const activities = await tx.activityHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" }
      });

      if (activities.length > 20) {
        const toDelete = activities.slice(20);
        await tx.activityHistory.deleteMany({
          where: { id: { in: toDelete.map(a => a.id) } }
        });
      }

      return true;
    });

    return NextResponse.json({ message: "Valoración eliminada" }, { status: 200 });

  } catch (error: unknown) {
    console.error("Error al eliminar la valoración:", error);
    const errorMessage = error instanceof Error ? error.message : "Error al eliminar la valoración";
    return NextResponse.json(
      { message: errorMessage },
      { status: 500 }
    );
  }
}

