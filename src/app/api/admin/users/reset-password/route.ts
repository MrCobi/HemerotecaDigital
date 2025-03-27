import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { sendPasswordResetEmail } from "../../../../../../lib/mail";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// POST: Enviar email de restablecimiento de contraseña
export async function POST(req: NextRequest): Promise<NextResponse>  {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "Se requiere el ID del usuario" },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Generar token único y almacenarlo
    const token = randomUUID();
    const expires = new Date(Date.now() + 3600 * 1000); // 1 hora de validez

    // Almacenar el token en la base de datos
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: token,
        expires: expires,
      },
    });

    // Enviar el email de restablecimiento
    const emailResult = await sendPasswordResetEmail(user.email, token);

    if (!emailResult.success) {
      return NextResponse.json(
        { error: "Error al enviar el correo de restablecimiento" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Email de restablecimiento enviado correctamente" 
    });

  } catch (error) {
    console.error("Error al enviar email de restablecimiento:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

