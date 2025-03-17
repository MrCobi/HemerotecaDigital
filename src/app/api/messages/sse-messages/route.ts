// src/app/api/messages/sse-messages/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/auth";

// Message queue for each user
const messageQueues = new Map<string, Array<Record<string, unknown>>>();

// Store connected clients
const connectedClients = new Map<string, Set<{
  id: string;
  writer: WritableStreamDefaultWriter<Uint8Array>;
}>>();

// Send messages to user
export const messageEvents = {
  sendMessage: (targetUserId: string, message: Record<string, unknown>) => {
    console.log(`Sending message to user ${targetUserId}:`, message);
    
    // Store message in queue
    if (!messageQueues.has(targetUserId)) {
      messageQueues.set(targetUserId, []);
    }
    messageQueues.get(targetUserId)!.push(message);
    
    // Send to all connected clients for this user
    const userClients = connectedClients.get(targetUserId);
    if (userClients) {
      const encoder = new TextEncoder();
      const data = encoder.encode(`data: ${JSON.stringify(message)}\n\n`);
      
      for (const client of userClients) {
        try {
          client.writer.write(data).catch(err => {
            console.error(`Failed to write to client ${client.id}:`, err);
          });
        } catch (err) {
          console.error(`Failed to send message to client ${client.id}:`, err);
        }
      }
    }
  }
};

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response('Unauthorized', { status: 401 });
    }
    
    const userId = session.user.id;
    const clientId = crypto.randomUUID();
    console.log(`SSE Connection established for user ${userId} (client ${clientId})`);
    
    // Create stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();
    
    // Send initial connection message
    writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'connected', userId })}\n\n`));
    
    // Register this client
    if (!connectedClients.has(userId)) {
      connectedClients.set(userId, new Set());
    }
    
    const clientConnection = { id: clientId, writer };
    connectedClients.get(userId)!.add(clientConnection);
    
    // Send any queued messages
    const queuedMessages = messageQueues.get(userId) || [];
    if (queuedMessages.length > 0) {
      console.log(`Sending ${queuedMessages.length} queued messages to user ${userId}`);
      for (const message of queuedMessages) {
        try {
          writer.write(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        } catch (err) {
          console.error('Error sending queued message:', err);
        }
      }
      // Clear queue after sending
      messageQueues.set(userId, []);
    }
    
    // Handle disconnection
    req.signal.addEventListener('abort', () => {
      console.log(`User ${userId} disconnected from SSE (client ${clientId})`);
      const clients = connectedClients.get(userId);
      if (clients) {
        clients.delete(clientConnection);
        if (clients.size === 0) {
          connectedClients.delete(userId);
        }
      }
    });
    
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive'
      }
    });
  } catch (error) {
    console.error('SSE connection error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}
