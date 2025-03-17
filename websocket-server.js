// websocket-server.js
require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const url = require('url');

// Create HTTP server
const server = http.createServer();
const PORT = process.env.WS_PORT || 8081;

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Store client connections
const clients = new Map();

// Handle WebSocket connections
wss.on('connection', (ws, req) => {
  const parsedUrl = url.parse(req.url, true);
  const userId = parsedUrl.query.userId;
  
  if (!userId) {
    console.log('Connection rejected: Missing userId');
    ws.close(4001, 'Missing userId');
    return;
  }
  
  console.log(`User ${userId} connected`);
  
  // Add to clients map
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId).push(ws);
  
  // Handle messages
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Received message from ${userId}:`, data);
      
      if (data.receiverId) {
        const receivers = [data.receiverId, data.senderId];
        
        receivers.forEach(id => {
          const userConnections = clients.get(id);
          if (userConnections) {
            userConnections.forEach(client => {
              if (client.readyState === ws.OPEN) {
                client.send(JSON.stringify(data));
              }
            });
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  // Handle connection close
  ws.on('close', () => {
    console.log(`User ${userId} disconnected`);
    clients.set(userId, clients.get(userId).filter(client => client !== ws));
  });
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ type: 'connected', userId }));
});

// Start server
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});
