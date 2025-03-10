// src/app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import  prisma  from "@/lib/db";

export async function GET(req: Request, context: { params: Promise<{ id?: string }> }) {
  try {
    const { id } = await context.params;// ✅ Extraemos el id de forma segura

    if (!id) {
      return NextResponse.json({ error: "ID no proporcionado" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("Error en GET /api/users/[id]:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
