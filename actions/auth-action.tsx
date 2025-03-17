"use server";

import { SignUpSchema } from "@/lib/zod";
import { loginSchema } from "@/lib/zod";
import { z } from "zod";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { isProduction } from "@/lib/environment";
import jwt from "jsonwebtoken";
import { sendEmailVerification } from "@/lib/mail";

// auth-action.tsx
export const loginAction = async (values: z.infer<typeof loginSchema>) => {
  try {
    await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    return { success: true };
  } catch (error) {
    let errorMessage = "Error de autenticación";

    if (error instanceof Error) {
      switch (error.message) {
        case "Usuario no encontrado":
          errorMessage = "No existe una cuenta con este email";
          break;
        case "Contraseña incorrecta":
          errorMessage = "La contraseña es incorrecta";
          break;
        case "Datos inválidos":
          errorMessage = "Formato de email o contraseña inválido";
          break;
      }
    }

    return { error: errorMessage };
  }
};

export const registerAction = async (values: z.infer<typeof SignUpSchema>) => {
  try {
    const { data, success } = SignUpSchema.safeParse(values);
    if (!success) {
      return { error: "Datos de registro no válidos" };
    }

    // Verificar si el username ya existe
    const existingUserByUsername = await prisma.user.findUnique({
      where: { username: data.username },
    });
    if (existingUserByUsername) {
      return { error: "El nombre de usuario ya está en uso" };
    }

    // Nueva verificación para el email
    const existingUserByEmail = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existingUserByEmail) {
      return { error: "El correo electrónico ya está registrado" };
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    // En producción, creamos una cuenta no verificada
    // En desarrollo, creamos una cuenta ya verificada para facilitar pruebas
    const emailVerified = isProduction() ? null : new Date();

    const newUser = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        image: data.image || "/images/AvatarPredeterminado.webp",
        emailVerified, // Null en producción, fecha actual en desarrollo
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        username: true,
      },
    });

    // En producción, enviar correo de verificación
    if (isProduction()) {
      try {
        // Generar token JWT para verificación de correo
        const verificationToken = jwt.sign(
          { userId: newUser.id, email: newUser.email },
          process.env.AUTH_SECRET!,
          { expiresIn: "24h" }
        );

        // Enviar correo de verificación
        await sendEmailVerification(newUser.email, verificationToken);
        
        return { 
          success: true, 
          requiresVerification: true,
          message: "Se ha enviado un correo de verificación a tu dirección de email. Por favor, verifica tu cuenta para continuar."
        };
      } catch (emailError) {
        console.error("Error al enviar email de verificación:", emailError);
        // Continuar aunque falle el envío del correo, para no bloquear el registro
      }
    }

    // En desarrollo, iniciar sesión automáticamente
    if (!isProduction()) {
      await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
    }

    return { 
      success: true,
      requiresVerification: isProduction(),
      message: isProduction() 
        ? "Se ha enviado un correo de verificación a tu dirección de email. Por favor, verifica tu cuenta para continuar."
        : "Registro exitoso. ¡Bienvenido!"
    };
  } catch (error) {
    // Manejo adicional de errores de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { error: "El correo electrónico ya está registrado" };
      }
    }

    if (error instanceof AuthError) {
      return { error: error.cause?.err?.message };
    }

    console.error("Error en registro:", error);
    return { error: "Error interno del servidor" };
  }
};
