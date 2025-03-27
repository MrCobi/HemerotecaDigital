import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todos los favoritos con sus relaciones
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    // Obtener favoritos con información de usuario y fuente
    const favorites = await prisma.favoriteSource.findMany({
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
            category: true,
            language: true,
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error("Error al obtener favoritos:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de favoritos" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo favorito (como administrador)
export async function POST(req: NextRequest): Promise<NextResponse>  {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validar datos requeridos
    if (!body.userId || !body.sourceId) {
      return NextResponse.json(
        { error: "ID de usuario e ID de fuente son requeridos" },
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

    // Verificar si ya existe un favorito de este usuario para esta fuente
    const existingFavorite = await prisma.favoriteSource.findUnique({
      where: {
        userId_sourceId: {
          userId: body.userId,
          sourceId: body.sourceId
        }
      }
    });

    if (existingFavorite) {
      return NextResponse.json(
        { error: "El usuario ya tiene esta fuente como favorita" },
        { status: 400 }
      );
    }

    // Crear el nuevo favorito
    const newFavorite = await prisma.favoriteSource.create({
      data: {
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
            imageUrl: true,
          }
        }
      }
    });

    // Registrar actividad
    await prisma.activityHistory.create({
      data: {
        userId: body.userId,
        type: "FAVORITE",
        sourceName: sourceExists.name
      }
    });

    return NextResponse.json(newFavorite, { status: 201 });
  } catch (error) {
    console.error("Error al crear favorito:", error);
    return NextResponse.json(
      { error: "Error al crear el favorito" },
      { status: 500 }
    );
  }
}

