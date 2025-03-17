import { NextRequest } from 'next/server';
import { auth } from "@/auth";
import prisma from '@/lib/db';
import { NextResponse } from "next/server";

// Map to track active connections with their controllers
const activeConnections = new Map<string, {
  controller: ReadableStreamDefaultController;
  lastActivity: number;
  lastPollTime: number;
  userId: string;
}>();

// Map to track when we last saw a message for a user
const lastSeenMessageTime = new Map<string, Date>();

// Clean up inactive connections every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, connection] of activeConnections.entries()) {
    if (now - connection.lastActivity > 10 * 60 * 1000) { // 10 minutes
      console.log(`Closing inactive global SSE connection: ${id}`);
      try {
        connection.controller.close();
      } catch (error) {
        console.error(`Error closing connection ${id}:`, error);
      }
      activeConnections.delete(id);
    }
  }
}, 60 * 1000);

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const connectionId = `${userId}-${Date.now()}`;
    
    console.log(`Global SSE connection from ${userId} (${connectionId})`);
    
    // Set initial last seen time if not set
    if (!lastSeenMessageTime.has(userId)) {
      lastSeenMessageTime.set(userId, new Date(Date.now() - 1000)); // Start 1 second ago
    }
    
    const stream = new ReadableStream({
      start: (controller) => {
        // Close existing connection for this user if it exists
        for (const [id, connection] of activeConnections.entries()) {
          if (connection.userId === userId) {
            console.log(`Closing previous connection for user ${userId}`);
            try {
              connection.controller.close();
            } catch (err) {
              console.error(`Error closing previous connection:`, err);
            }
            activeConnections.delete(id);
            break;
          }
        }
        
        // Register new connection
        activeConnections.set(connectionId, {
          controller,
          lastActivity: Date.now(),
          lastPollTime: Date.now(),
          userId
        });
        
        // Send initial connected message
        controller.enqueue(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
        
        // Set up polling function with dynamic interval
        let pollingInterval = 1000; // Start with 1 second
        const MAX_POLLING_INTERVAL = 2000; // Max 2 seconds between polls
        
        const pollMessages = async () => {
          try {
            if (!activeConnections.has(connectionId)) return;
            
            const connection = activeConnections.get(connectionId)!;
            connection.lastPollTime = Date.now();
            
            // Get last seen time for this user
            const lastSeen = lastSeenMessageTime.get(userId) || new Date(0);
            
            // Find new messages using raw query to avoid model issues
            const newMessages = await prisma.$queryRaw`
              SELECT 
                dm.id,
                dm.content,
                dm.sender_id as "senderId",
                dm.receiver_id as "receiverId",
                dm.read,
                dm.created_at as "createdAt",
                CONCAT(LEAST(dm.sender_id, dm.receiver_id), '-', GREATEST(dm.sender_id, dm.receiver_id)) as "conversationId"
              FROM direct_messages dm
              WHERE 
                (dm.sender_id = ${userId} OR dm.receiver_id = ${userId})
                AND dm.created_at > ${lastSeen}
              ORDER BY dm.created_at DESC
              LIMIT 20
            `;
            
            // Update activity timestamp
            connection.lastActivity = Date.now();
            
            // Process new messages
            if (Array.isArray(newMessages) && newMessages.length > 0) {
              console.log(`Found ${newMessages.length} new messages for ${userId}`);
              
              // Reset polling interval to minimum when messages are found
              pollingInterval = 1000;
              
              // Map to track latest message per conversation
              const latestMessageByConversation = new Map();
              
              // Group messages by conversation
              for (const message of newMessages) {
                // Track the latest message for each conversation
                if (!latestMessageByConversation.has(message.conversationId) || 
                    new Date(message.createdAt) > new Date(latestMessageByConversation.get(message.conversationId).createdAt)) {
                  latestMessageByConversation.set(message.conversationId, message);
                }
                
                // Track the latest overall message timestamp
                const messageTime = new Date(message.createdAt);
                if (!lastSeenMessageTime.has(userId) || messageTime > lastSeenMessageTime.get(userId)!) {
                  lastSeenMessageTime.set(userId, messageTime);
                }
              }
              
              // Send a notification for each conversation with a new message
              for (const [conversationId, message] of latestMessageByConversation.entries()) {
                // Format the message for SSE
                const messageData = {
                  conversationId,
                  message: {
                    id: message.id,
                    content: message.content,
                    createdAt: new Date(message.createdAt).toISOString(),
                    senderId: message.senderId,
                    receiverId: message.receiverId,
                    read: message.read
                  }
                };
                
                // Send message to client
                try {
                  controller.enqueue(`data: ${JSON.stringify(messageData)}\n\n`);
                } catch (error) {
                  console.error(`Error sending message to client ${connectionId}:`, error);
                }
              }
            } else {
              // Gradually increase polling interval when no messages are found
              pollingInterval = Math.min(pollingInterval * 1.2, MAX_POLLING_INTERVAL);
            }
            
            // Send heartbeat every 30 seconds to keep connection alive
            const timeSinceLastActivity = Date.now() - connection.lastActivity;
            if (timeSinceLastActivity > 30000) {
              try {
                controller.enqueue(`: heartbeat\n\n`);
                connection.lastActivity = Date.now();
              } catch (error) {
                console.error(`Error sending heartbeat to ${connectionId}:`, error);
                activeConnections.delete(connectionId);
                return;
              }
            }
            
            // Schedule next poll with dynamic interval
            setTimeout(pollMessages, pollingInterval);
          } catch (error) {
            console.error(`Polling error for ${userId}:`, error);
            
            // Try to recover
            if (activeConnections.has(connectionId)) {
              setTimeout(pollMessages, 2000); // Retry after 2 seconds on error
            }
          }
        };
        
        // Start polling
        pollMessages();
      },
      
      cancel: () => {
        console.log(`Global SSE connection closed: ${connectionId}`);
        activeConnections.delete(connectionId);
      }
    });
    
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // For Nginx
      }
    });
  } catch (error) {
    console.error("Global SSE error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}