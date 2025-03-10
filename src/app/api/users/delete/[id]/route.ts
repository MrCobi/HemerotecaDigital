// src/app/api/users/delete/[id]/route.ts
import { NextResponse } from "next/server";
import  prisma  from "@/lib/db";

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;

    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ message: "Usuario eliminado" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "Error al eliminar usuario" }, { status: 500 });
  }
}
