// src/app/api/users/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

// GET para listar usuarios con paginación y filtros opcionales
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(Number(searchParams.get("page") || 1), 1);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 100);
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Preparar condiciones de búsqueda
    const where = search ? {
      OR: [
        { name: { contains: search } },
        { email: { contains: search } },
        { username: { contains: search } },
      ]
    } : {};

    // Validar orden de clasificación
    const validSortFields = ["name", "email", "createdAt", "username"];
    const validSortField = validSortFields.includes(sortBy) ? sortBy : "createdAt";
    const orderBy = { [validSortField]: sortOrder === "asc" ? "asc" : "desc" };

    // Ejecutar consulta con paginación
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true,
          bio: true,
          role: true,
          createdAt: true,
          showFavorites: true,
          showActivity: true,
          // Excluimos campos sensibles como password
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy
      }),
      prisma.user.count({ where })
    ]);

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("Error al listar usuarios:", error);
    return NextResponse.json(
      { error: "Error al listar usuarios" },
      { status: 500 }
    );
  }
}

// POST para crear un nuevo usuario
export async function POST(req: Request) {
  try {
    const _session = await auth();
    
    // Verificar si solo los administradores pueden crear usuarios
    // Comentado por ahora, descomentar según las reglas de la aplicación
    /*
    if (!_session?.user || _session.user.role !== "admin") {
      return NextResponse.json(
        { error: "No autorizado para crear usuarios" },
        { status: 403 }
      );
    }
    */

    const { name, username, email, password, image, role, bio } = await req.json();
    
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const newUser = await prisma.user.create({
      data: { 
        name, 
        email, 
        password: hashedPassword, 
        role,
        username,
        image,
        bio
      },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        bio: true,
        role: true,
        createdAt: true
        // Excluimos campos sensibles
      }
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);

    // Manejar error de duplicación
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: "El email o username ya está en uso" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
