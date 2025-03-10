// src/app/api/comments/user/count/[userId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;

  try {
    const count = await prisma.comment.count({
      where: { 
        userId,
        isDeleted: false // Excluir comentarios eliminados
      },
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error obteniendo conteo de comentarios del usuario:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}