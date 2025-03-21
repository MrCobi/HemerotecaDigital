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

// DELETE: Eliminar un comentario (o marcarlo como eliminado)
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
    const softDelete = searchParams.get('soft') === 'true';

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

    // Si tiene respuestas o se solicita borrado suave, marcar como eliminado
    if (softDelete || comment._count.replies > 0) {
      await prisma.comment.update({
        where: { id: commentId },
        data: { isDeleted: true }
      });
      
      return NextResponse.json({ 
        message: "Comentario marcado como eliminado",
        softDeleted: true
      });
    } else {
      // Borrado real si no tiene respuestas
      await prisma.comment.delete({
        where: { id: commentId },
      });
      
      return NextResponse.json({ 
        message: "Comentario eliminado permanentemente",
        softDeleted: false
      });
    }
  } catch (error) {
    console.error("Error al eliminar comentario:", error);
    return NextResponse.json(
      { error: "Error al eliminar el comentario" },
      { status: 500 }
    );
  }
}
