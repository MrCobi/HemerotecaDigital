import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de un usuario por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            comments: true,
            ratings: true,
            favoriteSources: true,
            sentMessages: true,
            receivedMessages: true,
            accounts: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos del usuario" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar información de un usuario
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;
    const body = await req.json();

    // Validar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar si el email ya existe (si se está actualizando)
    if (body.email && body.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: body.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "El correo electrónico ya está en uso" },
          { status: 400 }
        );
      }
    }

    // Verificar si el username ya existe (si se está actualizando)
    if (body.username && body.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: body.username },
      });

      if (usernameExists) {
        return NextResponse.json(
          { error: "El nombre de usuario ya está en uso" },
          { status: 400 }
        );
      }
    }

    // Actualizar el usuario
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: body.name,
        username: body.username,
        email: body.email,
        image: body.image,
        role: body.role,
        bio: body.bio,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un usuario y todos sus datos asociados
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Eliminar todas las entidades relacionadas con el usuario
    await prisma.$transaction([
      // Eliminar comentarios
      prisma.comment.deleteMany({ where: { userId } }),
      
      // Eliminar valoraciones
      prisma.rating.deleteMany({ where: { userId } }),
      
      // Eliminar fuentes favoritas
      prisma.favoriteSource.deleteMany({ where: { userId } }),
      
      // Eliminar mensajes enviados y recibidos
      prisma.directMessage.deleteMany({ 
        where: { OR: [{ senderId: userId }, { receiverId: userId }] } 
      }),
      
      // Eliminar cuentas asociadas (OAuth)
      prisma.account.deleteMany({ where: { userId } }),
      
      // Eliminar tokens de verificación
      prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
      
      // Finalmente, eliminar el usuario
      prisma.user.delete({ where: { id: userId } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 }
    );
  }
}
