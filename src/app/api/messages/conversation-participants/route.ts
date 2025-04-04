// src/app/api/messages/conversation-participants/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET(request: Request) {
  try {
    // Verificar autenticación
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener el ID de la conversación desde los query params
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get("conversationId");

    if (!conversationId) {
      return NextResponse.json(
        { error: "Se requiere el ID de la conversación" },
        { status: 400 }
      );
    }

    // Obtener los participantes de la conversación
    const participants = await prisma.conversationParticipant.findMany({
      where: {
        conversationId: conversationId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true,
          },
        },
      },
    });

    console.log(`[API] Participantes encontrados para conversación ${conversationId}:`, participants.length);

    // Verificar si el usuario actual es parte de esta conversación
    const isUserParticipant = participants.some(
      (participant) => participant.userId === session.user.id
    );

    if (!isUserParticipant) {
      return NextResponse.json(
        { error: "No tienes acceso a esta conversación" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      participants: participants,
      conversationId
    });
  } catch (error) {
    console.error("Error al obtener participantes de la conversación:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
