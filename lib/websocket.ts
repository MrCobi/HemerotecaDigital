import { WebSocket, WebSocketServer } from 'ws';
import { inflateSync, deflateSync } from 'zlib';
import jwt from 'jsonwebtoken';
import { Request } from 'express';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
}

interface MessageBatch {
  _timestamp: number;
  [key: string]: unknown;
}

const wss = new WebSocketServer({
  noServer: true,
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: { level: 3 },
    clientNoContextTakeover: true,
    serverMaxWindowBits: 10
  }
});

const connections = new Map<string, WebSocket[]>();
const messageQueues = new Map<string, MessageBatch []>();
const BATCH_INTERVAL = 25;
const HEARTBEAT_INTERVAL = 10000;
const PING_TIMEOUT = 3000;

// Función processMessage faltante
const processMessage = (message: Message) => {
  // Implementar lógica de procesamiento de mensajes aquí
  console.log('Mensaje recibido:', message);
};

// Procesamiento de lotes
setInterval(() => {
  messageQueues.forEach((queue, userId) => {
    if (queue.length > 0) {
      const batch = queue.splice(0, 50);
      const compressed = deflateSync(JSON.stringify(batch));
      
      connections.get(userId)?.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(compressed);
        }
      });
    }
  });
}, BATCH_INTERVAL);

wss.on('connection', async (ws: WebSocket, req: Request) => {
  try {
    const url = new URL(req.url || '', `ws://${req.headers.host}`);
    const token = url.searchParams.get('token');
    const userId = await validateToken(token);

    if (!userId) {
      ws.close(4001, 'Autenticación fallida');
      return;
    }

    let isAlive = true;
    const heartbeat = setInterval(() => {
      if (!isAlive) return ws.terminate();
      isAlive = false;
      ws.ping();
    }, HEARTBEAT_INTERVAL);

    const timeout = setTimeout(() => ws.terminate(), PING_TIMEOUT);

    ws.on('pong', () => {
      isAlive = true;
      clearTimeout(timeout);
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(inflateSync(data).toString());
        processMessage(message);
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    });

    if (!connections.has(userId)) connections.set(userId, []);
    connections.get(userId)?.push(ws);

    ws.on('close', () => {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      connections.set(userId, connections.get(userId)?.filter(conn => conn !== ws) || []);
    });

    ws.on('error', (error) => {
      console.error(`WebSocket error (${userId}):`, error);
      ws.close();
    });

  } catch (error) {
    console.error('Error en conexión WebSocket:', error);
    ws.close();
  }
});

const validateToken = async (token: string | null): Promise<string | null> => {
  if (!token) return null;
  
  try {
    const decoded = jwt.verify(token, process.env.AUTH_SECRET!) as { userId: string };
    return decoded.userId;
  } catch (error) {
    console.error('Token inválido:', error);
    return null;
  }
};

export const broadcastMessage = (receiverId: string, message: Message) => {
  const receivers = [receiverId, message.senderId];
  
  receivers.forEach(id => {
    if (!messageQueues.has(id)) messageQueues.set(id, []);
    messageQueues.get(id)?.push({
      ...message,
      _timestamp: Date.now()
    });
  });
};

export const cleanupConnections = () => {
  connections.forEach((sockets, userId) => {
    connections.set(userId, sockets.filter(ws => ws.readyState === WebSocket.OPEN));
  });
};

setInterval(cleanupConnections, 30000);
setInterval(() => console.log('Conexiones activas:', connections.size), 60000);

export default wss;