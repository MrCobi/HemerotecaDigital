import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../../lib/auth-utils";

// GET para obtener el número de mensajes no leídos
export const GET = withAuth(async (_request: Request, { userId }: { userId: string }) => {
  try {
    // Contar todos los mensajes no leídos donde el usuario actual es el receptor
    const count = await prisma.directMessage.count({
      where: {
        receiverId: userId,
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
});
