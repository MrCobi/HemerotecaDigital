import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todas las valoraciones con sus relaciones
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    // Obtener valoraciones con información de usuario y fuente
    const ratings = await prisma.rating.findMany({
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
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(ratings);
  } catch (error) {
    console.error("Error al obtener valoraciones:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de valoraciones" },
      { status: 500 }
    );
  }
}

// POST: Crear una nueva valoración (como administrador)
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validar datos requeridos
    if (!body.value || !body.userId || !body.sourceId) {
      return NextResponse.json(
        { error: "Valor, ID de usuario e ID de fuente son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que el valor está entre 1 y 5
    if (body.value < 1 || body.value > 5) {
      return NextResponse.json(
        { error: "El valor debe estar entre 1 y 5" },
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

    // Verificar si ya existe una valoración de este usuario para esta fuente
    const existingRating = await prisma.rating.findUnique({
      where: {
        userId_sourceId: {
          userId: body.userId,
          sourceId: body.sourceId
        }
      }
    });

    let newRating;

    if (existingRating) {
      // Actualizar la valoración existente
      newRating = await prisma.rating.update({
        where: {
          userId_sourceId: {
            userId: body.userId,
            sourceId: body.sourceId
          }
        },
        data: {
          value: body.value
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
    } else {
      // Crear una nueva valoración
      newRating = await prisma.rating.create({
        data: {
          value: body.value,
          userId: body.userId,
          sourceId: body.sourceId,
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

      // Registrar actividad
      await prisma.activityHistory.create({
        data: {
          userId: body.userId,
          type: "RATING",
          sourceName: sourceExists.name
        }
      });
    }

    return NextResponse.json(newRating, { status: 201 });
  } catch (error) {
    console.error("Error al crear valoración:", error);
    return NextResponse.json(
      { error: "Error al crear la valoración" },
      { status: 500 }
    );
  }
}
