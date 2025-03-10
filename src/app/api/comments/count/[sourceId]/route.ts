// src/app/api/comments/count/[sourceId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _: Request,
  context: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await context.params;

  try {
    const count = await prisma.comment.count({
      where: { sourceId },
    });

    const headers = new Headers();
    headers.set("Cache-Control", "no-store, max-age=0");
    
    return new NextResponse(JSON.stringify({ count }), { headers });
  } catch (error) {
    console.error("Error obteniendo conteo de comentarios:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
