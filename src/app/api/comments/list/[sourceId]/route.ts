// src/app/api/comments/list/[sourceId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ sourceId: string }> }
) {
  const { sourceId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    
    // 1. Validar y parsear parámetros
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "5")));

    // 2. Validar sourceId
    if (!sourceId.trim()) {
      return NextResponse.json(
        { message: "ID de fuente requerido" },
        { status: 400 }
      );
    }

    // 3. Contar SOLO comentarios principales
    const totalComments = await prisma.comment.count({
      where: {
        sourceId,
        parentId: null
      }
    });

    // 4. Calcular total de páginas
    const totalPages = Math.ceil(totalComments / limit) || 1;

    // 5. Obtener comentarios paginados
    const comments = await prisma.comment.findMany({
      where: {
        sourceId,
        parentId: null,
      },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: { select: { id: true, username: true, image: true } },
        replies: {
          include: {
            user: { select: { id: true, username: true, image: true } },
            replies: {
              include: {
                user: { select: { id: true, username: true, image: true } },
                replies: {
                  include: {
                    user: { select: { id: true, username: true, image: true } },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      comments,
      total: totalComments,
      totalPages,
      currentPage: page // ← Enviar página actual para debug
    });

  } catch (error) {
    console.error("Error en API:", error);
    return NextResponse.json(
      { message: "Error interno" },
      { status: 500 }
    );
  }
}