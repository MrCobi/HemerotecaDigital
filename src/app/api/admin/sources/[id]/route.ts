import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de una fuente por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: sourceId } = await params;

    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        _count: {
          select: {
            comments: true,
            favoriteSources: true,
            ratings: true
          }
        }
      }
    });

    if (!source) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Calcular el rating promedio
    const ratings = await prisma.rating.findMany({
      where: { sourceId: source.id }
    });
    
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum: number, rating: { value: number }) => sum + rating.value, 0) / ratings.length 
      : 0;
    
    const sourceWithStats = {
      ...source,
      avgRating,
      ratingCount: ratings.length
    };

    return NextResponse.json(sourceWithStats);
  } catch (error) {
    console.error("Error al obtener fuente:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos de la fuente" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar información de una fuente
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: sourceId } = await params;
    const body = await req.json();

    // Validar que la fuente existe
    const existingSource = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!existingSource) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Actualizar la fuente
    const updatedSource = await prisma.source.update({
      where: { id: sourceId },
      data: {
        name: body.name,
        description: body.description,
        url: body.url,
        imageUrl: body.imageUrl || "/images/default_periodico.jpg",
        category: body.category,
        language: body.language,
        country: body.country
      },
    });

    return NextResponse.json(updatedSource);
  } catch (error) {
    console.error("Error al actualizar fuente:", error);
    return NextResponse.json(
      { error: "Error al actualizar la fuente" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una fuente y todos sus datos asociados
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: sourceId } = await params;

    // Verificar que la fuente existe
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Eliminar la fuente (las relaciones se eliminarán automáticamente por las restricciones ON DELETE CASCADE)
    await prisma.source.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ message: "Fuente eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar fuente:", error);
    return NextResponse.json(
      { error: "Error al eliminar la fuente" },
      { status: 500 }
    );
  }
}
