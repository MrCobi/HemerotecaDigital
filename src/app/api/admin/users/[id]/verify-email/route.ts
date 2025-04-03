import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// POST: Verificar el correo electrónico de un usuario manualmente por un administrador
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;

    // Verificar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Si ya está verificado, retornar un mensaje informativo
    if (existingUser.emailVerified) {
      return NextResponse.json({ 
        message: "El correo electrónico ya estaba verificado",
        verified: true
      });
    }

    // Actualizar el usuario con la verificación
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        emailVerified: new Date()
      },
      select: {
        id: true,
        emailVerified: true
      }
    });

    console.log(`Correo electrónico verificado manualmente para el usuario ${userId} por un administrador`);
    
    return NextResponse.json({
      message: "Correo electrónico verificado correctamente",
      verified: true,
      timestamp: updatedUser.emailVerified
    });
  } catch (error) {
    console.error("Error al verificar correo electrónico:", error);
    return NextResponse.json(
      { error: "Error al procesar la verificación del correo electrónico" },
      { status: 500 }
    );
  }
}
