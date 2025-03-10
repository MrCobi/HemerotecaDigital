// src/app/api/comments/[commentId]/route.ts
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextResponse } from "next/server";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ commentId: string }> }
) {
    const { commentId } = await params;
    const session = await auth();

    if (!session?.user) {
        return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    try {
        await prisma.$transaction(async (tx) => {
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
            // Falta el campo userName
            await tx.activityHistory.create({
                data: {
                  userId: session.user.id,
                  type: "comment_deleted",
                  sourceName: comment.source?.name || "Fuente desconocida",
                  userName: session.user.name, // Agregar esta línea
                  createdAt: new Date(),
                },
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
                    where: { id: { in: toDelete.map(a => a.id) } },
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