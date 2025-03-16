// src/app/api/sources/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Source, Rating } from "@/src/interface/source";

// GET para obtener una lista de fuentes con filtros y paginación
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación y filtros
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") || "publishedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Construir condiciones de filtro
    const where: {
      OR?: { name?: { contains: string }; description?: { contains: string } }[];
      category?: string;
    } = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } }
      ];
    }
    
    if (category) {
      where.category = category;
    }

    // Validar campo de ordenación
    const validSortFields = ["createdAt", "name", "updatedAt"];
    const orderBy: Record<string, string> = {};
    
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    // Consultar datos con paginación
    const [sources, total] = await Promise.all([
      prisma.source.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy
      }),
      prisma.source.count({ where })
    ]);

    // Para cada fuente, calcular el rating promedio
    const sourcesWithRatings = await Promise.all(
      sources.map(async (source: Source) => {
        const ratings = await prisma.rating.findMany({
          where: { sourceId: source.id }
        });
        
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum: number, rating: Rating) => sum + rating.value, 0) / ratings.length 
          : 0;
        
        return {
          ...source,
          avgRating,
          ratingCount: ratings.length
        };
      })
    );

    return NextResponse.json({
      sources: sourcesWithRatings,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener fuentes:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de fuentes" },
      { status: 500 }
    );
  }
}

// POST para obtener detalles de fuentes específicas por IDs (migrado desde sources/details)
export async function POST(request: Request) {
  try {
    const { sourceIds } = await request.json();

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: "sourceIds es requerido y debe ser un array" },
        { status: 400 }
      );
    }

    // Obtener los detalles de las fuentes
    const sources = await prisma.source.findMany({
      where: {
        id: {
          in: sourceIds
        }
      }
    });

    // Para cada fuente, calcular el rating promedio
    const sourcesWithRatings = await Promise.all(
      sources.map(async (source: Source) => {
        const ratings = await prisma.rating.findMany({
          where: { sourceId: source.id }
        });
        
        const avgRating = ratings.length > 0 
          ? ratings.reduce((sum: number, rating: Rating) => sum + rating.value, 0) / ratings.length 
          : 0;
        
        return {
          ...source,
          avgRating,
          ratingCount: ratings.length
        };
      })
    );

    return NextResponse.json({ sources: sourcesWithRatings });
  } catch (error) {
    console.error("Error al obtener detalles de las fuentes:", error);
    return NextResponse.json(
      { error: "Error al obtener detalles de las fuentes" },
      { status: 500 }
    );
  }
}
