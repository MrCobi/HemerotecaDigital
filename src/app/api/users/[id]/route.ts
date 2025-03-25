// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { Prisma, User } from "@prisma/client";
import { withAuth } from "../../../../lib/auth-utils";
import { auth } from "@/auth";

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
export const PUT = withAuth(async (req: Request, { userId, user }: { userId: string, user: User }, context: { params: Promise<{ id: string }> }) => {
  try {
    const { id } = await context.params;
    
    // Verificar si el usuario está autorizado (es administrador o es el mismo usuario)
    const isAdmin = user.role === "admin";
    const isSelf = userId === id;
    
    if (!isAdmin && !isSelf) {
      return NextResponse.json({ error: "No tienes permiso para editar este usuario" }, { status: 403 });
    }

    const { name, email, username, image, bio, role, showFavorites, showActivity, currentPassword, newPassword } = await req.json();

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

    // Manejar cambio de contraseña
    if (currentPassword && newPassword) {
      console.log("Solicitando cambio de contraseña para el usuario:", id);
      
      // Buscar usuario actual para verificar contraseña
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { password: true }
      });
      
      if (!existingUser || !existingUser.password) {
        console.error("Usuario no encontrado o sin contraseña", id);
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      
      // Verificar que la contraseña actual sea correcta
      const isPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
      
      if (!isPasswordValid) {
        console.error("Contraseña actual incorrecta para el usuario:", id);
        return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
      }
      
      console.log("Contraseña verificada correctamente, actualizando a nueva contraseña");
      
      // Si la contraseña es válida, hashear y asignar la nueva
      updatedData.password = await bcrypt.hash(newPassword, 10);
    }

    // Actualizar usuario
    try {
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
      
      if (updatedData.password) {
        console.log("Contraseña actualizada exitosamente para el usuario:", id);
      }

      return NextResponse.json(updatedUser, { status: 200 });
    } catch (updateError) {
      console.error("Error al actualizar usuario:", updateError);
      
      // Manejar error de duplicación
      if (typeof updateError === 'object' && updateError !== null && 'code' in updateError && updateError.code === 'P2002') {
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

// PATCH para actualizar un usuario existente
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    
    // Obtener información de sesión
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    
    // Verificar si el usuario está autorizado (es administrador o es el mismo usuario)
    const isAdmin = session.user.role === "admin";
    const isSelf = session.user.id === id;
    
    if (!isAdmin && !isSelf) {
      console.error("Intento de edición no autorizado. Usuario:", session.user.id, "intentó editar:", id);
      return NextResponse.json({ error: "No tienes permiso para editar este usuario" }, { status: 403 });
    }

    const requestData = await req.json();
    console.log("Datos recibidos para actualización:", requestData);
    
    const { 
      name, 
      username, 
      image, 
      bio, 
      role, 
      showFavorites, 
      showActivity, 
      currentPassword, 
      newPassword 
    } = requestData;

    // Validar campos básicos
    if (!name || !username) {
      return NextResponse.json(
        { error: "Nombre y nombre de usuario son obligatorios" },
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

    // Manejar cambio de contraseña
    if (currentPassword && newPassword) {
      console.log("Solicitando cambio de contraseña para el usuario:", id);
      
      // Buscar usuario actual para verificar contraseña
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: { password: true }
      });
      
      if (!existingUser || !existingUser.password) {
        console.error("Usuario no encontrado o sin contraseña", id);
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
      
      // Verificar que la contraseña actual sea correcta
      const isPasswordValid = await bcrypt.compare(currentPassword, existingUser.password);
      
      if (!isPasswordValid) {
        console.error("Contraseña actual incorrecta para el usuario:", id);
        return NextResponse.json({ error: "La contraseña actual es incorrecta" }, { status: 400 });
      }
      
      console.log("Contraseña verificada correctamente, actualizando a nueva contraseña");
      
      // Si la contraseña es válida, hashear y asignar la nueva
      updatedData.password = await bcrypt.hash(newPassword, 10);
    }

    // Actualizar usuario
    try {
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
      
      if (updatedData.password) {
        console.log("Contraseña actualizada exitosamente para el usuario:", id);
      }

      return NextResponse.json(updatedUser, { status: 200 });
    } catch (updateError) {
      console.error("Error al actualizar usuario:", updateError);
      
      // Manejar error de duplicación
      if (typeof updateError === 'object' && updateError !== null && 'code' in updateError && updateError.code === 'P2002') {
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
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// DELETE para eliminar un usuario
export const DELETE = withAuth(async (req: Request, { userId, user }: { userId: string, user: User }, context: { params: Promise<{ id: string }> }) => {
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
