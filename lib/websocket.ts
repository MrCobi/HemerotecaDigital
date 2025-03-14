import { WebSocket, WebSocketServer } from 'ws';

// Definir interfaz para el mensaje
interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
}

const wss = new WebSocketServer({ noServer: true });
const connections = new Map<string, WebSocket[]>();

wss.on('connection', (ws: WebSocket, request: { url: string }) => {
  const userId = new URL(request.url, 'http://localhost').searchParams.get('userId');
  
  if (!userId) {
    ws.close();
    return;
  }

  if (!connections.has(userId)) {
    connections.set(userId, []);
  }
  connections.get(userId)?.push(ws);

  ws.on('close', () => {
    const remaining = connections.get(userId)?.filter(conn => conn !== ws) || [];
    connections.set(userId, remaining);
  });
});

// Usar la interfaz Message en lugar de any
export const broadcastMessage = async (receiverId: string, message: Message) => {
  const receivers = [receiverId, message.senderId];
  
  receivers.forEach(id => {
    connections.get(id)?.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  });
};

export default wss;