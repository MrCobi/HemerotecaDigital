import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod";

// Esquema de validación
const PasswordSchema = z.object({
  password: z.string().min(6).max(32),
});

export async function POST(request: NextRequest) {
  try {
    // Verificar la autenticación
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Obtener y validar los datos
    const body = await request.json();
    const result = PasswordSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: "Contraseña inválida" },
        { status: 400 }
      );
    }

    // Hash de la nueva contraseña
    const hashedPassword = await bcrypt.hash(result.data.password, 10);

    // Actualizar la contraseña del usuario y quitar la marca de necesitar cambio
    await prisma.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        password: hashedPassword,
        needsPasswordChange: false,
      },
    });
    
    // Establecer un flag para indicar a la UI que debe hacer un "hard refresh"
    return NextResponse.json({ 
      success: true, 
      message: "Contraseña configurada correctamente",
      requiresRefresh: true
    });
    
  } catch (error) {
    console.error("Error al configurar la contraseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
