import { auth } from "@/auth";
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { type User as _User } from "@prisma/client";

/**
 * Interfaz para parámetros de autenticación pasados a las rutas API
 */
export interface AuthParams {
  userId: string;
  user: any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

/**
 * Verifica la sesión del usuario y devuelve información útil.
 * @returns Objeto con información de autenticación y respuesta en caso de error
 */
export async function verifySession() {
  try {
    // Obtener la sesión usando NextAuth
    const session = await auth();
    
    // Verificar si el usuario está autenticado
    if (!session?.user?.id) {
      return { 
        authenticated: false, 
        response: NextResponse.json({ error: "No autorizado" }, { status: 401 }) 
      };
    }
    
    // Verificar si el correo electrónico está verificado
    if (!session.user.emailVerified) {
      return { 
        authenticated: false, 
        response: NextResponse.json({ error: "Email no verificado", redirectTo: "/auth/verification-pending" }, { status: 403 }) 
      };
    }
    
    // Si todas las verificaciones pasan, devolver información de sesión
    return { 
      authenticated: true, 
      userId: session.user.id, 
      user: session.user,
      session 
    };
  } catch (error) {
    console.error("Error al verificar sesión:", error);
    return { 
      authenticated: false, 
      response: NextResponse.json({ error: "Error al verificar autenticación" }, { status: 500 }) 
    };
  }
}

/**
 * Verifica si el usuario tiene permisos de administrador
 * @param userId ID del usuario a verificar
 * @returns Objeto con información de autorización y respuesta en caso de error
 */
export async function verifyAdminRole(userId: string) {
  try {
    // Aquí iría la lógica para verificar si el usuario es administrador
    // Esto es solo un ejemplo, deberías adaptarlo según tu modelo de datos
    // Por ejemplo, podrías consultar la base de datos para verificar el rol
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    if (!user || user.role !== "admin") {
      return { 
        isAdmin: false, 
        response: NextResponse.json({ error: "Acceso denegado" }, { status: 403 }) 
      };
    }
    
    return { isAdmin: true };
  } catch (error) {
    console.error("Error al verificar rol de administrador:", error);
    return { 
      isAdmin: false, 
      response: NextResponse.json({ error: "Error al verificar permisos" }, { status: 500 }) 
    };
  }
}

/**
 * Función de orden superior para proteger rutas API
 * @param handler Función manejadora de la ruta API
 * @param options Opciones de configuración
 * @returns Función manejadora protegida
 */
export function withAuth(
  handler: (req: Request, auth: AuthParams, ...args: any[]) => Promise<Response>, // eslint-disable-line @typescript-eslint/no-explicit-any
  options: { requireAdmin?: boolean } = {}
) {
  return async (req: Request, ...args: any[]) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    // Verificar autenticación
    const { authenticated, response, userId, user } = await verifySession();
    
    if (!authenticated || !userId) {
      return response;
    }
    
    // Si se requiere rol de administrador, verificarlo
    if (options.requireAdmin) {
      const { isAdmin, response: adminResponse } = await verifyAdminRole(userId);
      
      if (!isAdmin) {
        return adminResponse;
      }
    }
    
    // Si todas las verificaciones pasan, llamar al manejador original
    return handler(req, { userId, user }, ...args);
  };
}
