// src/app/api/comments/user/[userId]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  _: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await context.params;
    const comments = await prisma.comment.findMany({
      where: {
        userId: userId,
        isDeleted: false
      },
      include: {
        source: {
          select: {
            name: true,
            url: true
          }
        },
        user: {
          select: {
            username: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    });

    return NextResponse.json({
      comments: comments.map(comment => ({
        ...comment,
        sourceName: comment.source.name,
        sourceUrl: comment.source.url,
        userImage: comment.user.image,
        username: comment.user.username
      }))
    });

  } catch (error) {
    console.error("Error obteniendo comentarios:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}