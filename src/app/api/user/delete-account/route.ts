import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";
import { sendAccountDeletionEmail } from "@/lib/mail";

const prisma = new PrismaClient();

// Función para generar un token seguro
function generateToken() {
  return randomBytes(32).toString("hex");
}

export async function POST(_req: NextRequest): Promise<NextResponse>  {
  try {
    const session = await auth();

    // Verificar que el usuario esté autenticado
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: "No estás autenticado" },
        { status: 401 }
      );
    }

    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json(
        { success: false, message: "Correo electrónico no disponible" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Generar un token de eliminación
    const token = generateToken();
    const expiryDate = new Date();
    expiryDate.setHours(expiryDate.getHours() + 24); // El token expira en 24 horas

    // Crear un registro en la tabla de tokens de restablecimiento (reutilizamos esta tabla)
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: token,
        expires: expiryDate,
      },
    });

    // Enviar correo electrónico de confirmación
    const emailResult = await sendAccountDeletionEmail(userEmail, token);

    if (!emailResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Error al enviar el correo de confirmación" 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Correo de confirmación enviado. Revisa tu bandeja de entrada.",
    });
  } catch (error) {
    console.error("Error en la API de eliminación de cuenta:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error interno del servidor" 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

