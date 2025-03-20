import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Token no proporcionado" },
        { status: 400 }
      );
    }

    // Buscar el token en la base de datos
    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    // Verificar si el token es válido
    if (!tokenRecord) {
      return NextResponse.json(
        { success: false, message: "Token no válido o expirado" },
        { status: 400 }
      );
    }

    // Verificar si el token ha expirado
    if (new Date() > tokenRecord.expires) {
      await prisma.passwordResetToken.delete({
        where: { id: tokenRecord.id },
      });

      return NextResponse.json(
        { success: false, message: "El enlace ha expirado. Por favor, solicita uno nuevo." },
        { status: 400 }
      );
    }

    // Obtener el ID del usuario
    const userId = tokenRecord.userId;

    // Iniciar una transacción para eliminar todos los datos del usuario
    await prisma.$transaction(async (tx) => {
      // Eliminar todos los tokens asociados
      await tx.passwordResetToken.deleteMany({
        where: { userId },
      });

      // Eliminar favoritos
      await tx.favoriteSource.deleteMany({
        where: { userId },
      });

      // Eliminar ratings
      await tx.rating.deleteMany({
        where: { userId },
      });

      // Eliminar actividad del usuario
      await tx.activityHistory.deleteMany({
        where: { userId },
      });

      // Eliminar seguidores y seguidos
      await tx.follow.deleteMany({
        where: {
          OR: [
            { followerId: userId },
            { followingId: userId },
          ],
        },
      });

      // Eliminar mensajes
      await tx.directMessage.deleteMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId },
          ],
        },
      });

      // Eliminar cuentas vinculadas
      await tx.account.deleteMany({
        where: { userId },
      });

      // Finalmente, eliminar al usuario
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Cuenta eliminada correctamente",
    });
  } catch (error) {
    console.error("Error al confirmar eliminación de cuenta:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Error interno del servidor al procesar la eliminación de la cuenta" 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
