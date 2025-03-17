import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token");
    
    if (!token) {
      console.error("Token missing from request");
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
    }

    console.log("Processing token verification request");

    try {
      // Verify the token
      const payload = jwt.verify(token, process.env.AUTH_SECRET!) as { 
        userId: string;
        email: string;
        exp: number;
      };

      // Log for debugging
      console.log("Token payload:", {
        userId: payload.userId,
        email: payload.email,
        expires: new Date(payload.exp * 1000).toISOString()
      });

      // Verificar que el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          emailVerified: true,
          image: true,
          role: true
        }
      });

      if (!user) {
        console.error(`User with ID ${payload.userId} not found`);
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      // Si el email ya está verificado, no hay necesidad de actualizarlo de nuevo
      if (user.emailVerified) {
        console.log(`User ${payload.email} already verified`);
        return NextResponse.json({ 
          success: true, 
          message: "Email ya verificado",
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            username: user.username,
            image: user.image,
            role: user.role,
            emailVerified: user.emailVerified
          }
        });
      }

      // Update the user's email verification status
      const updatedUser = await prisma.user.update({
        where: { id: payload.userId },
        data: { emailVerified: new Date() },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          emailVerified: true,
          image: true,
          role: true
        }
      });

      console.log(`User ${payload.email} verified successfully`);

      return NextResponse.json({ 
        success: true, 
        message: "Email verificado correctamente",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          username: updatedUser.username,
          image: updatedUser.image,
          role: updatedUser.role,
          emailVerified: updatedUser.emailVerified
        }
      });
    } catch (error) {
      console.error("Token verification error:", error);
      
      if (error instanceof jwt.JsonWebTokenError) {
        if (error.name === "TokenExpiredError") {
          return NextResponse.json({ error: "El token ha expirado" }, { status: 401 });
        }
        return NextResponse.json({ error: "Token inválido" }, { status: 401 });
      }
      
      return NextResponse.json({ error: "Error en la verificación del token" }, { status: 500 });
    }
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
