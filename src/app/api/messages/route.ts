// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";
import { messageEvents } from "./sse-messages/route";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  try {
    const { receiverId, content, priority, tempId } = await request.json();
    
    // Validar contenido del mensaje
    if (!content || content.trim() === '') {
      return new Response(JSON.stringify({ error: 'Contenido del mensaje no puede estar vacío' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validar ID del receptor
    if (!receiverId) {
      return new Response(JSON.stringify({ error: 'ID del receptor es requerido' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Generar ID temporal único si no se proporciona
    const messageId = tempId || `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Ultra-fast path: Enviar mensaje a ambos clientes inmediatamente, antes de guardar en DB
    console.log(`ULTRA-FAST PATH: Broadcasting temporary message to sender ${session.user.id} and receiver ${receiverId}`);
    
    // Mensaje temporal con estructura completa para mostrar en UI inmediatamente
    const tempMessage = {
      id: messageId,
      content,
      senderId: session.user.id,
      receiverId,
      read: false,
      createdAt: new Date().toISOString(),
      isTemp: true,
      priority: priority || 'normal',
      tempId: messageId, // Incluir el ID temporal para reconciliación posterior
      sender: {
        id: session.user.id,
        username: session.user.username || null,
        image: session.user.image || null
      },
      receiver: {
        id: receiverId
        // El receptor se completará en el cliente si es necesario
      }
    };
    
    // SOLO USAR SSE SI ESTA ACTIVADO, DE LO CONTRARIO USAMOS SOCKET.IO 
    let senderConnected = false;
    let receiverConnected = false;
    
    try {
      // Verificar si los clientes están conectados y emitir mensaje temporal
      senderConnected = messageEvents.isUserConnected(session.user.id);
      receiverConnected = messageEvents.isUserConnected(receiverId);
      
      // Registrar el estado de conexión para diagnóstico
      console.log(`Sender ${session.user.id} connected via SSE: ${senderConnected}`);
      console.log(`Receiver ${receiverId} connected via SSE: ${receiverConnected}`);
      
      // Emitir mensaje temporal inmediatamente si están conectados por SSE
      if (senderConnected) messageEvents.sendMessage(session.user.id, tempMessage);
      if (receiverConnected) messageEvents.sendMessage(receiverId, tempMessage);
    } catch (sseError) {
      console.warn('SSE not available or error occurred, relying on Socket.io:', sseError);
    }
    
    // Crear promesa para el proceso de base de datos
    const dbPromise = prisma.directMessage.create({
      data: {
        content,
        senderId: session.user.id,
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
    
    // Para mensajes de alta prioridad, no esperamos a la base de datos
    if (priority === 'high') {
      // Iniciar escritura en DB pero no esperar
      dbPromise.then(message => {
        // Cuando finalice, enviar mensaje con ID real para reconciliación
        const finalMessage = {
          ...message,
          createdAt: message.createdAt.toISOString(),
          tempId: messageId, // Para reconciliación con el mensaje temporal
          priority: 'high',
          sender: {
            id: session.user.id,
            username: session.user.username || null,
            image: session.user.image || null
          },
          receiver: {
            id: receiverId
          }
        };
        
        // Registrar éxito para diagnóstico
        console.log(`DB save success for high priority message. Real ID: ${message.id}, replacing temp: ${messageId}`);
        
        // Emitir el mensaje final con ID real (para actualizar referencias)
        try {
          if (senderConnected) messageEvents.sendMessage(session.user.id, finalMessage);
          if (receiverConnected) messageEvents.sendMessage(receiverId, finalMessage);
        } catch (sseError) {
          console.warn('SSE notification failed for final message, relying on Socket.io:', sseError);
        }
      }).catch(error => {
        console.error('Error al guardar mensaje en base de datos:', error);
        // Notificar al cliente del error
        const errorMessage = {
          id: messageId,
          tempId: messageId,
          error: true,
          errorType: 'db_save_failed',
          message: 'Error al guardar mensaje'
        };
        try {
          if (senderConnected) messageEvents.sendMessage(session.user.id, errorMessage);
        } catch (sseError) {
          console.warn('SSE error notification failed, relying on Socket.io for error delivery:', sseError);
        }
      });
      
      // Responder inmediatamente con un mensaje temporal
      return new Response(JSON.stringify({
        ...tempMessage,
        status: 'pending', // Indicar que está pendiente de confirmación en DB
      }), { 
        status: 202, // Accepted
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      });
    }
    
    // Para mensajes de prioridad normal, esperar a la confirmación de la DB
    try {
      const message = await dbPromise;
      
      // Mensaje definitivo con el ID real de la base de datos
      const finalMessage = {
        ...message,
        createdAt: message.createdAt.toISOString(),
        tempId: messageId, // Incluir el ID temporal para que el cliente pueda reemplazar el mensaje temporal
        sender: {
          id: session.user.id,
          username: session.user.username || null,
          image: session.user.image || null
        },
        receiver: {
          id: receiverId
        }
      };
      
      // Emitir el mensaje final con ID real de DB (para sustituir al temporal en la UI)
      console.log(`Broadcasting final message with ID ${message.id} (replaces temp ${messageId})`);
      try {
        if (senderConnected) messageEvents.sendMessage(session.user.id, finalMessage);
        if (receiverConnected) messageEvents.sendMessage(receiverId, finalMessage);
      } catch (sseError) {
        console.warn('SSE notification failed for final message, relying on Socket.io for delivery:', sseError);
      }
      
      // Responder con el mensaje completo
      return new Response(JSON.stringify(finalMessage), { 
        status: 201,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (dbError) {
      console.error("Error saving message to database:", dbError);
      
      // Notificar al cliente del error
      const errorMessage = {
        id: messageId,
        tempId: messageId,
        error: true,
        errorType: 'db_save_failed',
        message: 'Error al guardar mensaje en la base de datos'
      };
      try {
        if (senderConnected) messageEvents.sendMessage(session.user.id, errorMessage);
      } catch (sseError) {
        console.warn('SSE error notification failed, relying on Socket.io for error delivery:', sseError);
      }
      
      return new Response(JSON.stringify({
        error: 'Database Error',
        message: 'Error saving message to database',
        tempId: messageId
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(JSON.stringify({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get('userId');
    
    if (!otherUserId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const messages = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id }
        ]
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        content: true,
        senderId: true,
        receiverId: true,
        read: true,
        createdAt: true,
        sender: { select: { id: true, username: true, image: true } },
        receiver: { select: { id: true, username: true, image: true } }
      }
    });

    const optimizedMessages = messages.map(message => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
      sender: {
        ...message.sender,
        username: message.sender.username || null,
        image: message.sender.image || null
      },
      receiver: {
        ...message.receiver,
        username: message.receiver.username || null,
        image: message.receiver.image || null
      }
    }));

    return NextResponse.json(optimizedMessages, { 
      headers: { 
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}