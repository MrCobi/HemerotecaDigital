import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Interfaz para el objeto Source con sus selecciones
interface SourceWithCounts {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string;
  category: string;
  language: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    comments: number;
    favoriteSources: number;
    ratings: number;
  };
}

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todas las fuentes con estadísticas
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    // Obtener fuentes directamente desde la base de datos con conteos de relaciones
    const sources = await prisma.source.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        imageUrl: true,
        category: true,
        language: true,
        country: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            comments: true,
            favoriteSources: true,
            ratings: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Calcular rating promedio para cada fuente
    const sourcesWithRatings = await Promise.all(
      sources.map(async (source: SourceWithCounts) => {
        const ratings = await prisma.rating.findMany({
          where: { sourceId: source.id }
        });
        
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum: number, rating: { value: number }) => sum + rating.value, 0) / ratings.length 
          : 0;
        
        return {
          ...source,
          avgRating,
          ratingCount: ratings.length
        };
      })
    );

    return NextResponse.json(sourcesWithRatings);
  } catch (error) {
    console.error("Error al obtener fuentes:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de fuentes" },
      { status: 500 }
    );
  }
}

// POST: Crear una nueva fuente
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validar datos requeridos
    if (!body.name || !body.description || !body.url || !body.category || !body.language || !body.country) {
      return NextResponse.json(
        { error: "Nombre, descripción, URL, categoría, idioma y país son requeridos" },
        { status: 400 }
      );
    }

    // Crear la nueva fuente
    const newSource = await prisma.source.create({
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

    return NextResponse.json(newSource, { status: 201 });
  } catch (error) {
    console.error("Error al crear fuente:", error);
    return NextResponse.json(
      { error: "Error al crear la fuente" },
      { status: 500 }
    );
  }
}
