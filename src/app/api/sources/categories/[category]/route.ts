// src/app/api/sources/categories/[category]/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";

export async function GET(
  request: Request,
  context: { params: Promise<{ category: string }> }
) {
  try {
    // Await the params object before accessing its properties
    const { category } = await context.params;
    const decodedCategory = decodeURIComponent(category);

    const sources = await prisma.source.findMany({
      where: {
        category: decodedCategory
      },
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        imageUrl: true,
        category: true,
        language: true,
        country: true
      }
    });

    return NextResponse.json(sources);
    
  } catch (error) {
    console.error('Error fetching category sources:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}