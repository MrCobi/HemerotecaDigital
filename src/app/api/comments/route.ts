// src/app/api/comments/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../lib/auth-utils";

export const POST = withAuth(async (request: Request, { userId, user }: { userId: string, user: any }) => {
  try {
    const { content, sourceId } = await request.json();
    const trimmedContent = content?.trim() || "";

    // Validaciones
    if (!trimmedContent || !sourceId) {
      return NextResponse.json(
        { message: "Contenido y sourceId son requeridos" },
        { status: 400 }
      );
    }

    if (trimmedContent.length < 3 || trimmedContent.length > 500) {
      return NextResponse.json(
        { message: "El comentario debe tener entre 3 y 500 caracteres" },
        { status: 400 }
      );
    }

    // Transacción atómica
    const result = await prisma.$transaction(async (tx) => {
      // 1. Verificar existencia de la fuente
      const sourceExists = await tx.source.findUnique({
        where: { id: sourceId },
      });

      if (!sourceExists) {
        throw new Error("La fuente no existe");
      }

      // 2. Crear comentario
      const newComment = await tx.comment.create({
        data: {
          content: trimmedContent,
          userId: userId,
          sourceId,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              image: true,
            },
          },
        },
      });

      // 3. Registrar en historial de actividades
      await tx.activityHistory.create({
        data: {
          userId: userId,
          type: "comment",
          sourceName: sourceExists.name,
          userName: user.name || "",
          createdAt: new Date(),
        },
      });

      // 4. Limitar a 20 actividades
      const activities = await tx.activityHistory.findMany({
        where: { userId: userId },
        orderBy: { createdAt: "desc" },
      });

      if (activities.length > 20) {
        const toDelete = activities.slice(20);
        await tx.activityHistory.deleteMany({
          where: { id: { in: toDelete.map((a) => a.id) } },
        });
      }

      return newComment;
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Error creating comment:", error);

    // Manejar errores específicos
    if (error instanceof Error && error.message === "La fuente no existe") {
      return NextResponse.json(
        { message: "La fuente especificada no existe" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Error al crear comentario" },
      { status: 500 }
    );
  }
});