// src/app/api/users/suggestions/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";
import { Prisma } from "@prisma/client";

export const GET = withAuth(async (req: Request, { userId }: { userId: string }) => {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query")?.toLowerCase() || "";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "10", 10);
    const sortBy = searchParams.get("sortBy") || "followers";
    const order = searchParams.get("order") || "desc";
    const skip = (page - 1) * limit;

    // Solo excluimos al usuario actual
    let whereClause: Prisma.UserWhereInput = {
      id: { not: userId }
    };

    // Añadir condición de búsqueda solo si hay una consulta
    if (query) {
      whereClause = {
        AND: [
          whereClause,
          {
            OR: [
              { name: { contains: query } },
              { username: { contains: query } }
            ]
          }
        ]
      };
    }

    // Obtener total de resultados para la paginación
    const totalUsers = await prisma.user.count({
      where: whereClause
    });

    // Definir el orden según los parámetros recibidos
    const orderBy: Prisma.UserOrderByWithRelationInput = {};
    
    // Configurar el orden según el parámetro sortBy (excepto followers)
    switch (sortBy) {
      case "name":
        orderBy.name = order as Prisma.SortOrder;
        break;
      case "username":
        orderBy.username = order as Prisma.SortOrder;
        break;
      case "createdAt":
        orderBy.createdAt = order as Prisma.SortOrder;
        break;
      case "followers":
        // Para ordenar por seguidores, usaremos un enfoque especial
        orderBy.createdAt = "desc"; // orden por defecto como fallback
        break;
      default:
        orderBy.createdAt = "desc";
        break;
    }

    // PARA ORDENACIÓN POR SEGUIDORES:
    // Si estamos ordenando por seguidores, primero obtenemos todos los usuarios
    // los ordenamos por seguidores, y luego aplicamos la paginación manualmente
    if (sortBy === "followers") {
      // Obtenemos TODOS los usuarios que cumplen con el filtro (sin paginación)
      const allUsers = await prisma.user.findMany({
        where: whereClause,
        orderBy: orderBy, // Orden secundario por si hay empate
      });
      
      // Array para guardar los usuarios con sus conteos de seguidores
      const usersWithFollowers = [];
      
      // Obtener conteo de seguidores para todos los usuarios
      for (const user of allUsers) {
        // Conteo real de seguidores (quiénes le siguen)
        const followerCount = await prisma.follow.count({
          where: {
            followingId: user.id,
          },
        });
        
        usersWithFollowers.push({
          user,
          followerCount
        });
      }
      
      // Ordenar TODOS los usuarios por número de seguidores
      usersWithFollowers.sort((a, b) => {
        return order === "desc"
          ? b.followerCount - a.followerCount
          : a.followerCount - b.followerCount;
      });
      
      // Aplicar paginación manualmente
      const paginatedUsers = usersWithFollowers.slice(skip, skip + limit);
      
      // Formatear la respuesta
      const formattedUsers = paginatedUsers.map(item => ({
        id: item.user.id,
        name: item.user.name || "",
        username: item.user.username || "",
        bio: item.user.bio || "",
        image: item.user.image || "",
        stats: {
          followers: item.followerCount
        }
      }));
      
      // Devolver la respuesta paginada con los usuarios ordenados por seguidores
      return NextResponse.json({
        data: formattedUsers,
        pagination: {
          total: totalUsers,
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit)
        }
      });
    }
    // PARA OTROS TIPOS DE ORDENACIÓN (no por seguidores):
    // Usamos la paginación estándar de Prisma
    else {
      // Consulta con paginación estándar para ordenaciones que no son por seguidores
      const users = await prisma.user.findMany({
        where: whereClause,
        orderBy: orderBy,
        skip,
        take: limit,
      });
      
      // Array para guardar los usuarios formateados
      const formattedUsers = [];
      
      // Obtener y transformar usuarios con sus conteos de seguidores
      for (const user of users) {
        const followerCount = await prisma.follow.count({
          where: {
            followingId: user.id,
          },
        });
        
        formattedUsers.push({
          id: user.id,
          name: user.name || "",
          username: user.username || "",
          bio: user.bio || "",
          image: user.image || "",
          stats: {
            followers: followerCount
          }
        });
      }
      
      return NextResponse.json({
        data: formattedUsers,
        pagination: {
          total: totalUsers,
          page,
          limit,
          totalPages: Math.ceil(totalUsers / limit)
        }
      });
    }
  } catch (error: unknown) {
    console.error("Error fetching suggestions:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        data: [],
        pagination: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0
        }
      },
      { status: 500 }
    );
  }
});