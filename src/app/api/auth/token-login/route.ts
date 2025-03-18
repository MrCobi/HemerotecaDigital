import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import jwt from "jsonwebtoken";

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();
    
    if (!token) {
      return NextResponse.json({ error: "Token no proporcionado" }, { status: 400 });
    }

    try {
      // Verify the token
      const payload = jwt.verify(token, process.env.AUTH_SECRET!) as { 
        userId: string;
        email: string;
        exp: number;
      };

      // Verificar que el usuario existe y está verificado
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          emailVerified: true
        }
      });

      if (!user) {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }

      if (!user.emailVerified) {
        return NextResponse.json({ error: "Email no verificado" }, { status: 401 });
      }

      // Si llegamos aquí, el usuario está verificado y el token es válido
      return NextResponse.json({ 
        success: true, 
        user: {
          id: user.id,
          email: user.email
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
    console.error("Token login error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
