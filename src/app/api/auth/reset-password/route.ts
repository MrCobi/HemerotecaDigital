import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { randomUUID } from "crypto";
import { sendPasswordResetEmail } from "@/lib/mail"; // Función para enviar emails
import { z } from "zod";
import { PrismaClient } from '@prisma/client';

// Esquema para validar el email
const resetPasswordSchema = z.object({
  email: z.string().email("Introduce un correo electrónico válido"),
});

// Endpoint para solicitar el reseteo de contraseña
export async function POST(req: NextRequest) {
  try {
    // Extraer y validar el email del body
    const body = await req.json();
    const validationResult = resetPasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: "Correo electrónico inválido" },
        { status: 400 }
      );
    }

    const { email } = validationResult.data;
    
    // Verificar si existe un usuario con ese email
    const prismaTyped = prisma as PrismaClient;
    const user = await prismaTyped.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, emailVerified: true },
    });

    // Si el usuario no existe, igualmente devolvemos respuesta exitosa
    // para evitar enumeration attacks
    if (!user) {
      console.log("Usuario no encontrado para reset de contraseña:", email);
      return NextResponse.json({
        success: true,
        message: "Si tu cuenta existe, recibirás un correo electrónico con instrucciones para restablecer tu contraseña.",
      });
    }

    // Generar token para reseteo
    const resetToken = randomUUID();
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 1); // Expira en 1 hora

    // Guardar token en la base de datos
    try {
      await prismaTyped.passwordResetToken.create({
        data: {
          userId: user.id,
          token: resetToken,
          expires: tokenExpiry,
        },
      });
    } catch (error) {
      console.error("Error al guardar token de reseteo:", error);
      return NextResponse.json(
        { success: false, error: "Error al procesar la solicitud. Intenta más tarde." },
        { status: 500 }
      );
    }

    // Enviar email con el link de reseteo
    try {
      await sendPasswordResetEmail(email, resetToken);
    } catch (error) {
      console.error("Error al enviar email de reseteo:", error);
      // No devolvemos error al cliente, pues el token ya se generó correctamente
    }

    // Devolvemos respuesta exitosa
    return NextResponse.json({
      success: true,
      message: "Si tu cuenta existe, recibirás un correo electrónico con instrucciones para restablecer tu contraseña.",
    });
  } catch (error) {
    console.error("Error general en reset-password:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar la solicitud" },
      { status: 500 }
    );
  }
}
