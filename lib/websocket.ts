import { WebSocket, WebSocketServer } from 'ws';

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
}

const wss = new WebSocketServer({ 
  noServer: true,
  clientTracking: true
});

const connections = new Map<string, WebSocket[]>();
const HEARTBEAT_INTERVAL = 15000; // 25 segundos
const PING_TIMEOUT = 3000; // 5 segundos

wss.on('connection', (ws: WebSocket, request: { url: string }) => {
  const urlParams = new URL(request.url, 'ws://192.168.1.97:3000').searchParams;
  const userId = urlParams.get('userId');
  
  if (!userId) {
    ws.close(4001, 'User ID required');
    return;
  }

  let isAlive = true;
  const heartbeat = setInterval(() => {
    if (!isAlive) return ws.terminate();
    isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  const timeout = setTimeout(() => {
    ws.terminate();
  }, PING_TIMEOUT);

  ws.on('pong', () => {
    isAlive = true;
    clearTimeout(timeout);
  });

  if (!connections.has(userId)) connections.set(userId, []);
  connections.get(userId)?.push(ws);

  ws.on('close', () => {
    clearInterval(heartbeat);
    clearTimeout(timeout);
    const remaining = connections.get(userId)?.filter(conn => conn !== ws) || [];
    if (remaining.length === 0) connections.delete(userId);
    else connections.set(userId, remaining);
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error (${userId}):`, error);
    ws.close();
  });
});

export const broadcastMessage = (receiverId: string, message: Message) => {
  const receivers = [receiverId, message.senderId];
  
  receivers.forEach(id => {
    connections.get(id)?.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          ...message,
          _timestamp: Date.now() // Para debugging de latencia
        }));
      }
    });
  });
};

export const cleanupConnections = () => {
  connections.forEach((sockets, userId) => {
    connections.set(userId, sockets.filter(ws => ws.readyState === WebSocket.OPEN));
  });
};

setInterval(cleanupConnections, 60000); // Limpieza cada minuto

export default wss;