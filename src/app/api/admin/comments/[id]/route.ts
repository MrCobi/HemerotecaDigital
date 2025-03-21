import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de un comentario por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: commentId } = await params;

    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
            email: true,
          }
        },
        source: {
          select: {
            id: true,
            name: true,
            url: true,
            imageUrl: true,
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              }
            }
          }
        },
        replies: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                username: true,
                image: true,
              }
            }
          },
          orderBy: { createdAt: "asc" }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error("Error al obtener comentario:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos del comentario" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar información de un comentario
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: commentId } = await params;
    const body = await req.json();

    // Validar que el comentario existe
    const existingComment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!existingComment) {
      return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });
    }

    // Actualizar el comentario
    const updatedComment = await prisma.comment.update({
      where: { id: commentId },
      data: {
        content: body.content,
        isDeleted: body.isDeleted !== undefined ? body.isDeleted : existingComment.isDeleted
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          }
        },
        source: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    return NextResponse.json(updatedComment);
  } catch (error) {
    console.error("Error al actualizar comentario:", error);
    return NextResponse.json(
      { error: "Error al actualizar el comentario" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un comentario físicamente
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: commentId } = await params;
    const searchParams = new URL(req.url).searchParams;
    // Parámetro para eliminar también las respuestas
    const deleteReplies = searchParams.get('deleteReplies') === 'true';

    // Verificar que el comentario existe
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        _count: {
          select: {
            replies: true
          }
        }
      }
    });

    if (!comment) {
      return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });
    }

    // Array para almacenar los IDs de los comentarios eliminados
    const deletedIds = [commentId];
    let totalResponsesDeleted = 0;

    // Función recursiva para encontrar y eliminar todas las respuestas anidadas
    async function findAndDeleteAllReplies(parentId: string) {
      // Buscar todas las respuestas directas a este comentario
      const directReplies = await prisma.comment.findMany({
        where: { parentId },
        select: { 
          id: true,
          _count: {
            select: {
              replies: true
            }
          }
        }
      });
      
      // Si hay respuestas directas
      if (directReplies.length > 0) {
        // Primero, procesamos recursivamente las respuestas de estas respuestas
        for (const reply of directReplies) {
          // Si esta respuesta tiene sus propias respuestas, eliminarlas primero
          if (reply._count.replies > 0) {
            await findAndDeleteAllReplies(reply.id);
          }
          
          // Añadir el ID de esta respuesta a los eliminados
          deletedIds.push(reply.id);
          totalResponsesDeleted++;
        }
        
        // Después de procesar recursivamente todas las respuestas anidadas,
        // eliminamos las respuestas directas
        await prisma.comment.deleteMany({
          where: { parentId }
        });
      }
    }

    // Si se solicita eliminar las respuestas
    if (deleteReplies && comment._count.replies > 0) {
      // Iniciar el proceso recursivo de eliminación
      await findAndDeleteAllReplies(commentId);
    }

    // Eliminar físicamente el comentario principal
    await prisma.comment.delete({
      where: { id: commentId }
    });
    
    return NextResponse.json({ 
      message: deleteReplies && totalResponsesDeleted > 0 
        ? `Comentario y ${totalResponsesDeleted} respuestas eliminados permanentemente` 
        : "Comentario eliminado permanentemente",
      deletedIds: deletedIds
    });
  } catch (error) {
    console.error("Error al eliminar comentario:", error);
    return NextResponse.json(
      { error: "Error al eliminar el comentario" },
      { status: 500 }
    );
  }
}
