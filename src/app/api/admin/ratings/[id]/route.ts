import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de una valoración por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: ratingId } = await params;

    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
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
            category: true,
            language: true,
            country: true,
          }
        }
      }
    });

    if (!rating) {
      return NextResponse.json({ error: "Valoración no encontrada" }, { status: 404 });
    }

    return NextResponse.json(rating);
  } catch (error) {
    console.error("Error al obtener valoración:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos de la valoración" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar información de una valoración
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: ratingId } = await params;
    const body = await req.json();

    // Validar que la valoración existe
    const existingRating = await prisma.rating.findUnique({
      where: { id: ratingId },
    });

    if (!existingRating) {
      return NextResponse.json({ error: "Valoración no encontrada" }, { status: 404 });
    }

    // Verificar que el valor está entre 1 y 5
    if (body.value && (body.value < 1 || body.value > 5)) {
      return NextResponse.json(
        { error: "El valor debe estar entre 1 y 5" },
        { status: 400 }
      );
    }

    // Actualizar la valoración
    const updatedRating = await prisma.rating.update({
      where: { id: ratingId },
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

    return NextResponse.json(updatedRating);
  } catch (error) {
    console.error("Error al actualizar valoración:", error);
    return NextResponse.json(
      { error: "Error al actualizar la valoración" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una valoración
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: ratingId } = await params;

    // Verificar que la valoración existe
    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      include: {
        user: true,
        source: true
      }
    });

    if (!rating) {
      return NextResponse.json({ error: "Valoración no encontrada" }, { status: 404 });
    }

    // Eliminar la valoración
    await prisma.rating.delete({
      where: { id: ratingId },
    });

    return NextResponse.json({ message: "Valoración eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar valoración:", error);
    return NextResponse.json(
      { error: "Error al eliminar la valoración" },
      { status: 500 }
    );
  }
}
