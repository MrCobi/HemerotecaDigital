import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    );
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        showFavorites: true,
        showActivity: true
      }
    });

    return NextResponse.json({
      showFavorites: user?.showFavorites ?? true,
      showActivity: user?.showActivity ?? true
    });
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "No autenticado" },
      { status: 401 }
    );
  }

  try {
    const data = await request.json();
    const updateData: { 
      showFavorites?: boolean;
      showActivity?: boolean;
    } = {};
    
    if (typeof data.showFavorites === 'boolean') updateData.showFavorites = data.showFavorites;
    if (typeof data.showActivity === 'boolean') updateData.showActivity = data.showActivity;

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}