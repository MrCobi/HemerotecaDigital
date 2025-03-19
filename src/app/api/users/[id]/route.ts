// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { withAuth } from "../../../../lib/auth-utils";

// GET para obtener detalles de un usuario específico
export async function GET(req: Request, context: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await context.params;// ✅ Extraemos el id de forma segura

    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
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
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/users/[id]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// PUT para actualizar un usuario existente
export const PUT = withAuth(async (req: Request, { userId, user }: { userId: string, user: any }, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    
    // Verificar si el usuario está autorizado (es administrador o es el mismo usuario)
    const isAdmin = user.role === "admin";
    const isSelf = userId === id;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "No tienes permiso para editar este usuario" }, { status: 403 });
    }

    const { name, email, username, password, image, bio, role, showFavorites, showActivity } = await req.json();

    // Validar campos básicos
    if (!name || !email) {
      return NextResponse.json(
        { error: "Nombre y email son obligatorios" },
        { status: 400 }
      );
    }

    // Solo permitir cambio de rol si es administrador
    if (role && !isAdmin) {
      return NextResponse.json(
        { error: "No tienes permiso para cambiar el rol" },
        { status: 403 }
      );
    }

    // Preparar datos para actualización
    const updatedData: Prisma.UserUpdateInput = {
      name,
      email,
      username,
      image,
      bio
    };

    // Campos opcionales
    if (role && isAdmin) {
      updatedData.role = role;
    }
    
    if (showFavorites !== undefined) {
      updatedData.showFavorites = showFavorites;
    }
    
    if (showActivity !== undefined) {
      updatedData.showActivity = showActivity;
    }

    // Si se proporciona password, hashearlo
    if (password) {
      updatedData.password = await bcrypt.hash(password, 10);
    }

    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updatedData,
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
        showActivity: true
      }
    });

    return NextResponse.json(updatedUser, { status: 200 });
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    
    // Manejar error de duplicación - con verificación de tipo
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
      return NextResponse.json(
        { error: "El email o username ya está en uso" },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { error: "Error al actualizar usuario" },
      { status: 500 }
    );
  }
});

// DELETE para eliminar un usuario
export const DELETE = withAuth(async (req: Request, { userId, user }: { userId: string, user: any }, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    
    // Verificar si el usuario está autorizado (es administrador o es el mismo usuario)
    const isAdmin = user.role === "admin";
    const isSelf = userId === id;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "No tienes permiso para eliminar este usuario" }, { status: 403 });
    }

    // Verificar si existe el usuario
    const userExists = await prisma.user.findUnique({
      where: { id },
      select: { id: true }
    });

    if (!userExists) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Eliminar usuario
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Usuario eliminado exitosamente" }, { status: 200 });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
});
