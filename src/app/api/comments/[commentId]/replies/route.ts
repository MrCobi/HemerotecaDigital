// src/app/api/comments/[commentId]/replies/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ commentId: string }> }
) {
  const { commentId } = await params; // Corregido: Extraer `commentId` directamente de los parámetros
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json(
      { message: "Debes iniciar sesión" },
      { status: 401 }
    );
  }

  try {
    const { content, sourceId } = await request.json();
    const trimmedContent = content?.trim() || "";

    // Validación básica del contenido
    if (!trimmedContent || trimmedContent.length < 3 || trimmedContent.length > 500) {
      return NextResponse.json(
        { message: "El comentario debe tener entre 3 y 500 caracteres" },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Verificar comentario padre y fuente
      const parentComment = await tx.comment.findUnique({
        where: { id: commentId }, // Corregido: Usar `commentId` en lugar de `id`
        include: { 
          source: true,
          user: { select: { id: true, name: true, image: true } } // Incluir el usuario
        }
      });

      if (!parentComment || !parentComment.source || !parentComment.user) {
        throw new Error("Comentario padre, fuente o usuario no encontrados");
      }

      // 2. Crear la respuesta
      const newReply = await tx.comment.create({
        data: {
          content: trimmedContent,
          userId: session.user.id,
          sourceId,
          parentId: commentId, // Corregido: Usar `commentId` en lugar de `id`
          depth: parentComment.depth + 1,
          path: `${parentComment.path}/${commentId}`, // Corregido: Usar `commentId` en lugar de `id`
        },
        include: {
          user: { select: { id: true, name: true, image: true } }
        }
      });

      // 3. Registrar en historial de actividades
      await tx.activityHistory.create({
        data: {
          userId: session.user.id,
          type: "comment_reply",
          sourceName: parentComment.source.name,
          sourceId: parentComment.sourceId,
          targetName: parentComment.user.name,
          targetId: parentComment.userId,
          targetType: "user",
          details: `Respondiste a un comentario de ${parentComment.user.name} en ${parentComment.source.name}`,
          createdAt: new Date(),
        }
      });

      // 4. Limitar a 20 actividades
      const activities = await tx.activityHistory.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
      });

      if (activities.length > 20) {
        const toDelete = activities.slice(20);
        await tx.activityHistory.deleteMany({
          where: { id: { in: toDelete.map((a: { id: string }) => a.id) } },
        });
      }

      return newReply;
    });

    return NextResponse.json(result);

  } catch (error: unknown) {
    console.error("Error creando respuesta:", error);

    // Manejar errores específicos
    if (error instanceof Error && error.message === "Comentario padre, fuente o usuario no encontrados") {
      return NextResponse.json(
        { message: "Comentario padre no válido" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Error al crear respuesta" },
      { status: 500 }
    );
  }
}