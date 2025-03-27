import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

/**
 * API para verificar la contraseña actual de un usuario
 * 
 * Esta API es utilizada principalmente en el proceso de edición de perfil
 * para validar que la contraseña actual proporcionada sea correcta antes
 * de permitir cambios en datos sensibles.
 */
export async function POST(req: NextRequest): Promise<NextResponse>  {
  try {
    console.log("Iniciando verificación de contraseña");
    // Verificar la autenticación del usuario que hace la solicitud
    const session = await auth();
    
    if (!session || !session.user) {
      console.log("No hay sesión de usuario activa");
      return NextResponse.json(
        { error: "No autenticado" },
        { status: 401 }
      );
    }
    
    // Obtener los datos de la solicitud
    const body = await req.json();
    const { userId, password } = body;
    console.log("Solicitud de verificación para usuario:", userId);
    
    // Verificar que los datos necesarios estén presentes
    if (!userId || !password) {
      console.log("Faltan datos requeridos: userId o password");
      return NextResponse.json(
        { error: "Faltan datos requeridos" },
        { status: 400 }
      );
    }
    
    // Verificar que el usuario autenticado sea el mismo que se intenta modificar
    if (session.user.id !== userId) {
      console.log("Verificación rechazada: intento de modificar otro usuario");
      console.log("ID de sesión:", session.user.id);
      console.log("ID solicitado:", userId);
      return NextResponse.json(
        { error: "No tienes permiso para realizar esta acción" },
        { status: 403 }
      );
    }
    
    // Buscar al usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
      },
    });
    
    // Verificar que el usuario exista
    if (!user || !user.password) {
      console.log("Usuario no encontrado o sin contraseña:", userId);
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }
    
    console.log("Usuario encontrado, verificando contraseña...");
    
    // Verificar que la contraseña sea correcta
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    console.log("Resultado de verificación:", isPasswordValid ? "Correcta" : "Incorrecta");
    
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "La contraseña actual es incorrecta" },
        { status: 400 }
      );
    }
    
    // Si llegamos aquí, la contraseña es válida
    console.log("Verificación exitosa para el usuario:", userId);
    return NextResponse.json({ success: true });
    
  } catch (error) {
    console.error("Error al verificar contraseña:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

