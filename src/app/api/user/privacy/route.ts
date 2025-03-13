import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { auth } from "@/auth";

// GET para obtener la configuración de privacidad
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
    console.error("Error al obtener configuración de privacidad:", error);
    return NextResponse.json(
      { error: "Error al obtener configuración" },
      { status: 500 }
    );
  }
}

// PATCH para actualizar la configuración de privacidad
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
    const { showFavorites, showActivity } = data;
    
    // Prepara un objeto con solo los campos que se están actualizando
    const updateData: { 
      showFavorites?: boolean;
      showActivity?: boolean;
    } = {};
    
    if (showFavorites !== undefined) updateData.showFavorites = showFavorites;
    if (showActivity !== undefined) updateData.showActivity = showActivity;

    await prisma.user.update({
      where: { id: session.user.id },
      data: updateData
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al actualizar configuración de privacidad:", error);
    return NextResponse.json(
      { error: "Error al actualizar configuración" },
      { status: 500 }
    );
  }
}
