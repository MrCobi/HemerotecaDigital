import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// GET para obtener el número de mensajes no leídos
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Contar todos los mensajes no leídos donde el usuario actual es el receptor
    const count = await prisma.directMessage.count({
      where: {
        receiverId: session.user.id,
        read: false
      }
    });

    return NextResponse.json({ count });
  } catch (error) {
    console.error("Error al contar mensajes no leídos:", error);
    return NextResponse.json(
      { error: "Error al contar mensajes no leídos" },
      { status: 500 }
    );
  }
}
