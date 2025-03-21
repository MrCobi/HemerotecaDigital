import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todos los comentarios con sus relaciones
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    // Obtener comentarios con información de usuario y fuente
    const comments = await prisma.comment.findMany({
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
            imageUrl: true,
          }
        },
        parent: {
          select: {
            id: true,
            content: true,
            userId: true,
            user: {
              select: {
                name: true,
                username: true,
              }
            }
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error("Error al obtener comentarios:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de comentarios" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo comentario (como administrador)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validar datos requeridos
    if (!body.content || !body.userId || !body.sourceId) {
      return NextResponse.json(
        { error: "Contenido, ID de usuario e ID de fuente son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que la fuente existe
    const sourceExists = await prisma.source.findUnique({
      where: { id: body.sourceId },
    });

    if (!sourceExists) {
      return NextResponse.json(
        { error: "La fuente especificada no existe" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const userExists = await prisma.user.findUnique({
      where: { id: body.userId },
    });

    if (!userExists) {
      return NextResponse.json(
        { error: "El usuario especificado no existe" },
        { status: 400 }
      );
    }

    // Procesar comentario padre si existe
    let path = "/";
    let depth = 1;
    
    if (body.parentId) {
      const parentComment = await prisma.comment.findUnique({
        where: { id: body.parentId },
      });

      if (!parentComment) {
        return NextResponse.json(
          { error: "El comentario padre especificado no existe" },
          { status: 400 }
        );
      }

      // Construir la ruta basada en el padre
      path = `${parentComment.path}${parentComment.id}/`;
      depth = parentComment.depth + 1;
    }

    // Crear el nuevo comentario
    const newComment = await prisma.comment.create({
      data: {
        content: body.content,
        userId: body.userId,
        sourceId: body.sourceId,
        parentId: body.parentId || null,
        path,
        depth,
        isDeleted: false
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

    // Registrar actividad si corresponde
    await prisma.activityHistory.create({
      data: {
        userId: body.userId,
        type: "COMMENT",
        sourceName: sourceExists.name
      }
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (error) {
    console.error("Error al crear comentario:", error);
    return NextResponse.json(
      { error: "Error al crear el comentario" },
      { status: 500 }
    );
  }
}
