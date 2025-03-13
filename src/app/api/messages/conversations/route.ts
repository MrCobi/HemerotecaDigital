import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// GET para obtener todas las conversaciones del usuario
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // Obtener usuarios con los que ha habido mensajes
    const userWithMessages = await prisma.$queryRaw`
      SELECT DISTINCT
        CASE
          WHEN dm.sender_id = ${session.user.id} THEN dm.receiver_id
          ELSE dm.sender_id
        END as userId,
        CASE
          WHEN dm.sender_id = ${session.user.id} THEN receiver.username
          ELSE sender.username
        END as username,
        CASE
          WHEN dm.sender_id = ${session.user.id} THEN receiver.name
          ELSE sender.name
        END as name,
        CASE
          WHEN dm.sender_id = ${session.user.id} THEN receiver.image
          ELSE sender.image
        END as image,
        MIN(dm.created_at) as firstMessageAt
      FROM direct_messages dm
      JOIN users sender ON sender.id = dm.sender_id
      JOIN users receiver ON receiver.id = dm.receiver_id
      WHERE dm.sender_id = ${session.user.id} OR dm.receiver_id = ${session.user.id}
      GROUP BY userId, username, name, image
      ORDER BY firstMessageAt DESC
    `;

    // Formatear los datos para el cliente
    const formattedConversations = await Promise.all(
      (userWithMessages as any[]).map(async (user) => {
        // Obtener último mensaje de esta conversación
        const lastMessage = await prisma.directMessage.findFirst({
          where: {
            OR: [
              {
                senderId: session.user.id,
                receiverId: user.userId,
              },
              {
                senderId: user.userId,
                receiverId: session.user.id,
              },
            ],
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
            content: true,
            senderId: true,
            receiverId: true,
            read: true,
            createdAt: true,
          },
        });
        
        // Contar mensajes no leídos
        const unreadCount = await prisma.directMessage.count({
          where: {
            senderId: user.userId,
            receiverId: session.user.id,
            read: false,
          },
        });

        // Crear objeto de conversación con información adicional
        return {
          id: `${session.user.id}-${user.userId}`,
          senderId: session.user.id,
          receiverId: user.userId,
          createdAt: user.firstMessageAt,
          sender: {
            id: session.user.id,
            username: session.user.username,
            image: session.user.image,
          },
          receiver: {
            id: user.userId,
            username: user.username,
            name: user.name,
            image: user.image,
          },
          lastMessage: lastMessage,
          unreadCount: unreadCount,
        };
      })
    );

    return NextResponse.json(formattedConversations);
  } catch (error) {
    console.error("Error al obtener conversaciones:", error);
    return NextResponse.json(
      { error: "Error al obtener conversaciones" },
      { status: 500 }
    );
  }
}
