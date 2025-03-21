import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// GET: Obtener detalles de un registro de actividad por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: activityId } = await params;

    const activity = await prisma.activityHistory.findUnique({
      where: { id: activityId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
            image: true,
            role: true,
          }
        }
      }
    });

    if (!activity) {
      return NextResponse.json({ error: "Registro de actividad no encontrado" }, { status: 404 });
    }

    return NextResponse.json(activity);
  } catch (error) {
    console.error("Error al obtener registro de actividad:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos del registro de actividad" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un registro de actividad específico
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: activityId } = await params;

    // Verificar que el registro existe
    const activity = await prisma.activityHistory.findUnique({
      where: { id: activityId }
    });

    if (!activity) {
      return NextResponse.json({ error: "Registro de actividad no encontrado" }, { status: 404 });
    }

    // Eliminar el registro
    await prisma.activityHistory.delete({
      where: { id: activityId },
    });

    return NextResponse.json({ message: "Registro de actividad eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar registro de actividad:", error);
    return NextResponse.json(
      { error: "Error al eliminar el registro de actividad" },
      { status: 500 }
    );
  }
}
