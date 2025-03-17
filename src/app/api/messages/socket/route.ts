// src/app/api/messages/socket/route.ts
import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { messageEvents } from "../sse-messages/route";

// Clave de autorización para peticiones desde el servidor de socket
const SOCKET_API_KEY = 'Socket-Internal-Auth-00123';

export async function POST(request: Request) {
  // Verificación de autorización para el servidor de socket
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== SOCKET_API_KEY) {
    console.error('Acceso no autorizado a la API de socket');
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const { senderId, receiverId, content, tempId } = await request.json();
    
    // Validaciones básicas
    if (!content || content.trim() === '') {
      return new Response(JSON.stringify({ error: 'Contenido del mensaje no puede estar vacío' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!senderId || !receiverId) {
      return new Response(JSON.stringify({ error: 'IDs de emisor y receptor son requeridos' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`API Socket: Guardando mensaje de ${senderId} para ${receiverId}`);
    
    // Guardar el mensaje en la base de datos
    const message = await prisma.directMessage.create({
      data: {
        content,
        senderId,
        receiverId,
      },
      select: {
        id: true,
        content: true,
        createdAt: true, 
        read: true,
        senderId: true,
        receiverId: true
      }
    });
    
    // Convertir a formato para la respuesta
    const formattedMessage = {
      ...message,
      createdAt: message.createdAt.toISOString(),
      tempId: tempId || null, // Para reconciliación con mensaje temporal
      sender: {
        id: senderId
      },
      receiver: {
        id: receiverId
      }
    };
    
    console.log(`Mensaje guardado en DB con ID: ${message.id}`);
    
    return NextResponse.json(formattedMessage, { status: 201 });
  } catch (error) {
    console.error('Error al procesar mensaje desde socket:', error);
    return new Response(JSON.stringify({ error: 'Error interno al procesar mensaje' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
