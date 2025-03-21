import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener todos los usuarios con sus conteos de relaciones
export async function GET() {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    // Obtener usuarios directamente desde la base de datos con conteos de relaciones
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        emailVerified: true,
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
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    return NextResponse.json(
      { error: "Error al obtener la lista de usuarios" },
      { status: 500 }
    );
  }
}

// POST: Crear un nuevo usuario
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Validar datos requeridos
    if (!body.email || !body.password || !body.username || !body.name) {
      return NextResponse.json(
        { error: "Nombre, nombre de usuario, email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    // Verificar si el email ya existe
    const emailExists = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (emailExists) {
      return NextResponse.json(
        { error: "El correo electrónico ya está registrado" },
        { status: 400 }
      );
    }

    // Verificar si el username ya existe
    const usernameExists = await prisma.user.findUnique({
      where: { username: body.username },
    });

    if (usernameExists) {
      return NextResponse.json(
        { error: "El nombre de usuario ya está en uso" },
        { status: 400 }
      );
    }

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(body.password, 10);

    // Crear el nuevo usuario
    const newUser = await prisma.user.create({
      data: {
        name: body.name,
        username: body.username,
        email: body.email,
        password: hashedPassword,
        image: body.image || "/images/AvatarPredeterminado.webp",
        role: body.role || "user",
        bio: body.bio,
      },
    });

    // Excluir la contraseña del resultado
    const { password, ...userWithoutPassword } = newUser;

    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error) {
    console.error("Error al crear usuario:", error);
    return NextResponse.json(
      { error: "Error al crear el usuario" },
      { status: 500 }
    );
  }
}
