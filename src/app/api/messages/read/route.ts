import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../lib/auth-utils";

// POST para marcar mensajes como leídos
export const POST = withAuth(async (req: Request, { userId }: { userId: string }) => {
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
        receiverId: userId,
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
});
