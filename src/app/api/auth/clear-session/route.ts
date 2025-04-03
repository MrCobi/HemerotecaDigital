import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    // Verificar la autenticación
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    // Preparar respuesta para redirigir y limpiar cookies de sesión
    const response = NextResponse.redirect(new URL('/home', request.url));
    
    // Establecer cookie de sesión con un valor vacío y tiempo de expiración en el pasado
    // Esto forzará al navegador a eliminar la cookie y solicitar una nueva sesión
    response.cookies.set("next-auth.session-token", "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
    });
    
    // También limpiar la versión segura de la cookie si existe
    response.cookies.set("__Secure-next-auth.session-token", "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
      httpOnly: true,
      secure: true,
    });
    
    return response;
  } catch (error) {
    console.error("Error al limpiar la sesión:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
