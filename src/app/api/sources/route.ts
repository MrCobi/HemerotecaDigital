// src/app/api/sources/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { Source, Rating } from "@/src/interface/source";
import { withAuth } from "../../../lib/auth-utils";

// El método GET es público para que cualquiera pueda ver las fuentes
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación y filtros
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 50);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category");
    const language = searchParams.get("language");
    const sortBy = searchParams.get("sortBy") || "publishedAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Construir condiciones de filtro
    const where: {
      OR?: { name?: { contains: string }; description?: { contains: string } }[];
      category?: string;
      language?: string;
    } = {};
    
    if (search) {
      // Buscar solo por nombre, no por descripción
      where.OR = [
        { name: { contains: search.toLowerCase() } }
      ];
    }
    
    if (category) {
      where.category = category;
    }

    if (language) {
      where.language = language;
    }

    // Validar campo de ordenación
    const validSortFields = ["createdAt", "name", "updatedAt"];
    const orderBy: Record<string, string> = {};
    
    if (validSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder === "asc" ? "asc" : "desc";
    } else {
      orderBy.createdAt = "desc";
    }

    // Optimización 1: Obtener todas las fuentes 
    // Dado que no podemos usar mode: "insensitive", debemos realizar la deduplicación 
    // y comparación case-insensitive manualmente
    const allSources = await prisma.source.findMany({
      where,
      orderBy,
      select: {
        id: true,
        name: true,
      }
    });
    
    // Deduplicar basado en el nombre (case-insensitive) manualmente
    const uniqueSourceMap = new Map();
    allSources.forEach(source => {
      const lowerCaseName = source.name.toLowerCase();
      if (!uniqueSourceMap.has(lowerCaseName)) {
        uniqueSourceMap.set(lowerCaseName, source.id);
      }
    });
    
    // Obtener la lista de IDs únicos
    const uniqueSourceIds = Array.from(uniqueSourceMap.values());
    const total = uniqueSourceIds.length;
    
    // Paginar los IDs
    const paginatedIds = uniqueSourceIds.slice((page - 1) * limit, page * limit);
    
    // Si no hay resultados, devolver array vacío
    if (paginatedIds.length === 0) {
      return NextResponse.json({
        sources: [],
        pagination: {
          total: 0,
          page: page,
          limit: limit,
          totalPages: Math.ceil(0 / limit)
        }
      });
    }

    // Optimización 3: Obtener las fuentes con sus ratings en una consulta eficiente
    // Obtenemos las fuentes completas con los IDs filtrados
    const sources = await prisma.source.findMany({
      where: {
        id: {
          in: paginatedIds
        }
      },
      orderBy
    });

    // Obtener ratings para todas las fuentes en una sola consulta
    const ratings = await prisma.rating.groupBy({
      by: ['sourceId'],
      where: {
        sourceId: {
          in: paginatedIds
        }
      },
      _avg: {
        value: true
      },
      _count: {
        id: true
      }
    });

    // Mapear los ratings a las fuentes
    const ratingsMap = new Map();
    ratings.forEach(rating => {
      ratingsMap.set(rating.sourceId, {
        avgRating: rating._avg.value || 0,
        ratingCount: rating._count.id
      });
    });

    // Combinar fuentes con sus ratings
    const sourcesWithRatings = sources.map(source => {
      const ratingInfo = ratingsMap.get(source.id) || { avgRating: 0, ratingCount: 0 };
      return {
        ...source,
        avgRating: ratingInfo.avgRating,
        ratingCount: ratingInfo.ratingCount
      };
    });

    // Optimización 2: Ordenación mejorada para mantener fuentes relevantes primero
    // Si hay un término de búsqueda, mejoramos la ordenación para priorizar coincidencias exactas
    let sortedSources = sourcesWithRatings;
    if (search) {
      // Ordenar por relevancia: coincidencias exactas primero, luego por el orden original
      sortedSources = sourcesWithRatings.sort((a, b) => {
        const aNameLower = a.name.toLowerCase();
        const bNameLower = b.name.toLowerCase();
        const searchLower = search.toLowerCase();
        
        // Coincidencia exacta tiene prioridad máxima
        if (aNameLower === searchLower && bNameLower !== searchLower) return -1;
        if (bNameLower === searchLower && aNameLower !== searchLower) return 1;
        
        // Coincidencia al inicio del nombre tiene segunda prioridad
        if (aNameLower.startsWith(searchLower) && !bNameLower.startsWith(searchLower)) return -1;
        if (bNameLower.startsWith(searchLower) && !aNameLower.startsWith(searchLower)) return 1;
        
        // Mantener el orden original para el resto
        return 0;
      });
    }

    // Asegurarse de que sources nunca es undefined
    return NextResponse.json({
      sources: sortedSources || [],
      pagination: {
        total: total,
        page: page,
        limit: limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al obtener fuentes:", error);
    // En caso de error, devuelve una estructura válida para evitar errores en el cliente
    return NextResponse.json({
      sources: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0
      }
    }, { status: 500 });
  }
}

// El método POST requiere autenticación para obtener detalles específicos de fuentes
export const POST = withAuth(async (request: Request) => {
  try {
    const { sourceIds } = await request.json();

    if (!sourceIds || !Array.isArray(sourceIds)) {
      return NextResponse.json(
        { error: "sourceIds es requerido y debe ser un array" },
        { status: 400 }
      );
    }

    const sources = await prisma.source.findMany({
      where: {
        id: {
          in: sourceIds
        }
      }
    });

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
    // En caso de error, devuelve una estructura válida para evitar errores en el cliente
    return NextResponse.json({
      sources: []
    }, { status: 500 });
  }
});