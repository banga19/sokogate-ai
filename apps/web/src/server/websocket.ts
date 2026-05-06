import { createServer } from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';

let wss: WebSocketServer | null = null;
let httpServer: any = null;

export function initializeWebSocket(server: any) {
  httpServer = server;

  // Create WebSocket server on the same port
  wss = new WebSocketServer({ 
    server,
    path: '/api/ws', // Only accept WebSocket upgrades on /api/ws
  });

  wss.on('connection', (ws: WebSocket, req: any) => {
    // Verify the request path matches
    if (req.url !== '/api/ws') {
      ws.close(1008, 'Invalid path');
      return;
    }

    console.log('[WebSocket] Client connected from:', req.socket.remoteAddress);

    // Send welcome message
    ws.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }));

    ws.on('close', () => {
      console.log('[WebSocket] Client disconnected');
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Client error:', error);
    });
  });

  console.log('[WebSocket] Server initialized on ws://<host>:<port>/api/ws');
}

export function broadcastToClients(payload: string) {
  if (!wss) {
    console.warn('[WebSocket] Server not initialized — cannot broadcast');
    return;
  }
  wss.clients.forEach((client: WebSocket) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}
