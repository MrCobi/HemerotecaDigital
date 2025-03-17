// src/app/api/messages/sse-messages/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";

// Manejo de conexiones y mensajes
type ConnectedClient = {
  controller: ReadableStreamDefaultController;
  userId: string;
  lastActivity: number;
};

// Mapa para almacenar las conexiones activas
const connectedClients = new Map<string, ConnectedClient>();
// Cola para mensajes pendientes, para cada usuario
const messageQueues = new Map<string, any[]>();
// Máximo de mensajes en cola por usuario
const MAX_QUEUE_SIZE = 100;
// Tiempo máximo de inactividad (10 minutos) antes de cerrar la conexión
const MAX_INACTIVE_TIME = 10 * 60 * 1000;

// Exportar messageEvents para ser utilizado por otras rutas
export const messageEvents = {
  // Enviar mensaje a un usuario específico
  sendMessage: (targetUserId: string, message: any) => {
    console.log(`Sending message to ${targetUserId}, connected clients: ${connectedClients.size}`);

    // Guardar mensaje en cola si el usuario no está conectado o si hay algún error al enviar
    let messageQueue = messageQueues.get(targetUserId) || [];
    if (messageQueue.length >= MAX_QUEUE_SIZE) {
      // Limitar tamaño de cola eliminando mensajes más antiguos
      messageQueue = messageQueue.slice(messageQueue.length - MAX_QUEUE_SIZE + 1);
    }
    messageQueue.push(message);
    messageQueues.set(targetUserId, messageQueue);

    // Enviar mensaje inmediatamente si el cliente está conectado
    const client = connectedClients.get(targetUserId);
    if (client) {
      try {
        const data = `data: ${JSON.stringify(message)}\n\n`;
        client.controller.enqueue(data);
        client.lastActivity = Date.now();
        
        // Mensaje enviado con éxito, eliminarlo de la cola
        const queue = messageQueues.get(targetUserId) || [];
        messageQueues.set(
          targetUserId, 
          queue.filter(m => m.id !== message.id && (!m.tempId || m.tempId !== message.tempId))
        );
      } catch (error) {
        console.error(`Error sending message to client ${targetUserId}:`, error);
      }
    } else {
      console.log(`Client ${targetUserId} not connected, message queued`);
    }
  },
  
  // Limpiar mensajes de la cola para un usuario
  clearQueue: (userId: string) => {
    messageQueues.delete(userId);
  },
  
  // Obtener el número de clientes conectados
  getConnectedCount: () => {
    return connectedClients.size;
  }
};

// Limpieza periódica de conexiones inactivas
setInterval(() => {
  const now = Date.now();
  connectedClients.forEach((client, id) => {
    if (now - client.lastActivity > MAX_INACTIVE_TIME) {
      console.log(`Closing inactive connection for user ${id}`);
      client.controller.close();
      connectedClients.delete(id);
    }
  });
}, 60 * 1000); // Verificar cada minuto

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const userId = session.user.id;
    const clientId = crypto.randomUUID();
    console.log(`SSE connection from user ${userId} at ${Date.now()}`);
    
    // Crear una transmisión de eventos
    const stream = new ReadableStream({
      start: (controller) => {
        // Cerrar cualquier conexión existente para este usuario
        const existingClient = connectedClients.get(userId);
        if (existingClient) {
          try {
            existingClient.controller.close();
          } catch (error) {
            console.error("Error closing existing connection:", error);
          }
        }
        
        // Registrar el nuevo cliente
        connectedClients.set(userId, {
          controller,
          userId,
          lastActivity: Date.now()
        });
        
        // Enviar un mensaje de confirmación de conexión
        const connectMessage = `data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`;
        controller.enqueue(connectMessage);
        
        // Enviar mensajes en cola para este usuario
        const queuedMessages = messageQueues.get(userId) || [];
        if (queuedMessages.length > 0) {
          console.log(`Sending ${queuedMessages.length} queued messages to user ${userId}`);
          queuedMessages.forEach((message) => {
            const data = `data: ${JSON.stringify(message)}\n\n`;
            controller.enqueue(data);
          });
          // Limpiar la cola después de enviar
          messageQueues.delete(userId);
        }
        
        // Configurar un heartbeat para mantener la conexión viva
        const heartbeatInterval = setInterval(() => {
          try {
            controller.enqueue(": heartbeat\n\n");
            // Actualizar timestamp de actividad
            const client = connectedClients.get(userId);
            if (client) {
              client.lastActivity = Date.now();
            }
          } catch (error) {
            // Error al enviar heartbeat, cerrar la conexión
            console.error(`Heartbeat error for ${userId}:`, error);
            clearInterval(heartbeatInterval);
            connectedClients.delete(userId);
          }
        }, 30 * 1000); // Heartbeat cada 30 segundos
      },
      cancel: () => {
        console.log(`SSE connection closed for user ${userId}`);
        connectedClients.delete(userId);
      }
    });
    
    // Configurar los encabezados de respuesta para SSE
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Para nginx
      },
    });
  } catch (error) {
    console.error("SSE error:", error);
    return new Response('Server error', { status: 500 });
  }
}
