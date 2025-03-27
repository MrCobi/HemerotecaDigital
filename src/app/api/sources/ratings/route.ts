// src/app/api/sources/ratings/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";
import { User } from "@prisma/client";

// Manejar solicitudes GET
export const GET = withAuth(async (request: Request, { userId, user: _user }: { userId: string, user: User }) => {
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
          userId: userId,
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
});

// Método POST modificado
export const POST = withAuth(async (request: Request, { userId, user: _user }: { userId: string, user: User }) => {
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
        where: { userId_sourceId: { userId: userId, sourceId } },
        update: { value },
        create: { userId: userId, sourceId, value }
      });

      // 3. Registrar en historial
      await tx.activityHistory.create({
        data: {
          user: {
            connect: { id: userId }
          },
          type: value === 0 ? "rating_removed" : "rating_added",
          sourceName: source.name,
          source: {
            connect: { id: sourceId }
          },
          targetName: null,
          targetId: null,
          targetType: null,
          details: `Valoración ${value === 0 ? "eliminada" : value.toString()} para ${source.name}`,
          createdAt: new Date(),
        }
      });

      // 4. Limitar a 20 actividades
      const activities = await tx.activityHistory.findMany({
        where: { userId: userId },
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
});

// Método DELETE modificado
export const DELETE = withAuth(async (req: Request, { userId, user: _user }: { userId: string, user: User }) => {
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
        where: { userId_sourceId: { userId: userId, sourceId } },
        include: { source: true }
      });

      if (!rating) {
        throw new Error("Valoración no encontrada");
      }

      // 2. Eliminar rating
      await tx.rating.delete({
        where: { userId_sourceId: { userId: userId, sourceId } }
      });

      // 3. Registrar en historial
      await tx.activityHistory.create({
        data: {
          user: {
            connect: { id: userId }
          },
          type: "rating_deleted",
          sourceName: rating.source.name,
          source: {
            connect: { id: rating.sourceId }
          },
          targetName: null,
          targetId: null,
          targetType: null,
          details: `Valoración eliminada para ${rating.source.name}`,
          createdAt: new Date(),
        }
      });

      // 4. Limitar a 20 actividades
      const activities = await tx.activityHistory.findMany({
        where: { userId: userId },
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
});
