// src/app/api/comments/[commentId]/route.ts
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ commentId: string }> }
) {
    const { commentId } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    async function deleteComment(commentId: string, session: { user: { id: string, name?: string | null, role?: string } }) {
        try {
            // Verificar existencia del comentario
            const comment = await prisma.comment.findUnique({
                where: { id: commentId },
                include: {
                    replies: true,
                    source: true,
                    user: true
                }
            });

            if (!comment) {
                return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });
            }

            const _result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
                // 1. Obtener comentario con fuente relacionada
                const comment = await tx.comment.findUnique({
                    where: { id: commentId },
                    include: {
                        user: true,
                        source: true
                    }
                });

                if (!comment) {
                    throw new Error("Comentario no encontrado");
                }

                // 2. Verificar permisos
                if (comment.userId !== session.user.id && session.user.role !== "admin") {
                    throw new Error("Sin permisos");
                }

                // 3. Registrar en historial antes de eliminar
                await tx.activityHistory.create({
                    data: {
                      userId: session.user.id,
                      type: "comment_deleted",
                      sourceName: comment.source?.name || "Fuente desconocida",
                      sourceId: comment.sourceId,
                      targetName: null,
                      targetId: null,
                      targetType: null,
                      details: `Eliminaste un comentario en ${comment.source?.name || "Fuente desconocida"}`,
                      createdAt: new Date(),
                    }
                  });

                // 4. Eliminar comentario y respuestas
                await tx.comment.delete({
                    where: { id: commentId },
                    include: { replies: true }
                });

                // 5. Limitar a 20 actividades
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
            });

            return NextResponse.json({ message: "Comentario eliminado" });
        } catch (error: unknown) {
            console.error("Error eliminando comentario:", error);

            // Manejar errores específicos
            if (error instanceof Error && error.message === "Comentario no encontrado") {
                return NextResponse.json(
                    { message: "Comentario no encontrado" },
                    { status: 404 }
                );
            }
            if (error instanceof Error && error.message === "Sin permisos") {
                return NextResponse.json(
                    { message: "No tienes permiso" },
                    { status: 403 }
                );
            }

            return NextResponse.json(
                { message: "Error al eliminar comentario" },
                { status: 500 }
            );
        }
    }

    await deleteComment(commentId, session);
}