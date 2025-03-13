import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// POST para marcar mensajes como leídos
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  
  // Obtener el ID del remitente de los mensajes que queremos marcar como leídos
  const { searchParams } = new URL(req.url);
  const senderId = searchParams.get("senderId");
  
  if (!senderId) {
    return NextResponse.json({ error: "Es necesario especificar el ID del remitente" }, { status: 400 });
  }
  
  try {
    // Marcar como leídos todos los mensajes enviados por el remitente al usuario actual
    const result = await prisma.directMessage.updateMany({
      where: {
        senderId: senderId,
        receiverId: session.user.id,
        read: false
      },
      data: {
        read: true
      }
    });
    
    return NextResponse.json({ 
      success: true,
      messagesRead: result.count
    });
  } catch (error) {
    console.error("Error al marcar mensajes como leídos:", error);
    return NextResponse.json(
      { error: "Error al marcar mensajes como leídos" },
      { status: 500 }
    );
  }
}
