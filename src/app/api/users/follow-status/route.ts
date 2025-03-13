// src/app/api/users/follow-status/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const idsParam = searchParams.get("ids");
    
    if (!idsParam) {
      return NextResponse.json({ message: "Parámetro 'ids' requerido" }, { status: 400 });
    }
    
    const userIds = idsParam.split(",");
    
    // Buscar todas las relaciones de seguimiento donde el usuario actual sigue a alguno de los IDs proporcionados
    const follows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: {
          in: userIds
        }
      },
      select: {
        followingId: true
      }
    });
    
    // Crear un mapa de estado de seguimiento para cada ID proporcionado
    const followingMap: Record<string, boolean> = {};
    
    // Inicializar todos los IDs como no seguidos
    userIds.forEach(id => {
      followingMap[id] = false;
    });
    
    // Marcar los IDs que el usuario sí está siguiendo
    follows.forEach(follow => {
      followingMap[follow.followingId] = true;
    });
    
    return NextResponse.json(followingMap);
  } catch (error) {
    console.error("Error al verificar estado de seguimiento:", error);
    return NextResponse.json(
      { message: "Error interno" },
      { status: 500 }
    );
  }
}
