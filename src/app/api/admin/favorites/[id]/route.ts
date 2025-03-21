import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de un favorito por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: favoriteId } = await params;

    const favorite = await prisma.favoriteSource.findUnique({
      where: { id: favoriteId },
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

    if (!favorite) {
      return NextResponse.json({ error: "Favorito no encontrado" }, { status: 404 });
    }

    return NextResponse.json(favorite);
  } catch (error) {
    console.error("Error al obtener favorito:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos del favorito" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un favorito
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: favoriteId } = await params;

    // Verificar que el favorito existe
    const favorite = await prisma.favoriteSource.findUnique({
      where: { id: favoriteId },
      include: {
        user: true,
        source: true
      }
    });

    if (!favorite) {
      return NextResponse.json({ error: "Favorito no encontrado" }, { status: 404 });
    }

    // Eliminar el favorito
    await prisma.favoriteSource.delete({
      where: { id: favoriteId },
    });

    return NextResponse.json({ message: "Favorito eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar favorito:", error);
    return NextResponse.json(
      { error: "Error al eliminar el favorito" },
      { status: 500 }
    );
  }
}
