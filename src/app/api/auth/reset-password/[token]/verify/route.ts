import { NextRequest, NextResponse } from "next/server";
import prisma from "../../../../../../../lib/db";
import { PrismaClient } from '@prisma/client';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { message: "Token requerido" },
        { status: 400 }
      );
    }

    // Buscar el token en la base de datos
    try {
      const prismaTyped = prisma as PrismaClient;
      const resetToken = await prismaTyped.passwordResetToken.findUnique({
        where: { token },
        include: { user: { select: { email: true } } },
      });

      // Verificar si el token existe
      if (!resetToken) {
        return NextResponse.json(
          { valid: false, message: "Token inválido" },
          { status: 400 }
        );
      }

      // Verificar si el token ha expirado
      const now = new Date();
      if (resetToken.expires < now) {
        // El token ha expirado, eliminarlo
        try {
          await prismaTyped.passwordResetToken.delete({
            where: { id: resetToken.id },
          });
          return NextResponse.json(
            { valid: false, message: "Token expirado" },
            { status: 400 }
          );
        } catch (error) {
          console.error("Error al eliminar token expirado:", error);
          return NextResponse.json(
            { valid: false, message: "Token expirado" },
            { status: 400 }
          );
        }
      }

      // Token válido, devolver éxito
      return NextResponse.json({
        valid: true,
        email: resetToken.user.email,
      });
    } catch (error) {
      console.error("Error al verificar token:", error);
      return NextResponse.json(
        { valid: false, message: "Error verificando token" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error general en verify-token:", error);
    return NextResponse.json(
      { valid: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
