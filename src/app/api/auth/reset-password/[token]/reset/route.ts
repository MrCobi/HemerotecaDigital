import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../../../lib/db";
import bcrypt from "bcryptjs";
import { PrismaClient } from '@prisma/client';

// Add dynamic export configurations
export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const body = await request.json();
    const { password } = body;

    if (!token) {
      return NextResponse.json(
        { message: "Token requerido" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { message: "Contraseña no válida. Debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // Buscar el token en la base de datos
    try {
      const prismaTyped = prisma as PrismaClient;
      const resetToken = await prismaTyped.passwordResetToken.findUnique({
        where: { token },
      });

      // Verificar si el token existe y no ha expirado
      if (!resetToken) {
        return NextResponse.json(
          { message: "Token inválido" },
          { status: 400 }
        );
      }

      const now = new Date();
      if (resetToken.expires < now) {
        // El token ha expirado, eliminarlo
        try {
          await prismaTyped.passwordResetToken.delete({
            where: { id: resetToken.id },
          });
        } catch (error) {
          console.error("Error al eliminar token expirado:", error);
        }

        return NextResponse.json(
          { message: "Token expirado" },
          { status: 400 }
        );
      }

      // Encriptar la nueva contraseña
      const hashedPassword = await bcrypt.hash(password, 10);

      // Actualizar la contraseña del usuario
      await prismaTyped.user.update({
        where: { id: resetToken.userId },
        data: { password: hashedPassword },
      });

      // Eliminar todos los tokens de restablecimiento para este usuario
      try {
        await prismaTyped.passwordResetToken.deleteMany({
          where: { userId: resetToken.userId },
        });
      } catch (error) {
        console.error("Error al eliminar token después del reseteo:", error);
      }

      // Devolver respuesta exitosa
      return NextResponse.json({
        success: true,
        message: "Contraseña actualizada correctamente"
      });
    } catch (error) {
      console.error("Error al restablecer contraseña:", error);
      return NextResponse.json(
        { message: "Error al restablecer la contraseña" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error general en reset-password:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
