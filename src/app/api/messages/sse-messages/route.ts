// src/app/api/messages/sse-messages/route.ts

import { NextResponse } from 'next/server';

// Clase para gestionar eventos de mensajería
class MessageEventManager {
  private connectedUsers: Map<string, boolean> = new Map();
  
  // Comprobar si un usuario está conectado
  isUserConnected(userId: string): boolean {
    return this.connectedUsers.has(userId) && this.connectedUsers.get(userId) === true;
  }
  
  // Registrar un usuario como conectado
  setUserConnected(userId: string, connected: boolean = true): void {
    this.connectedUsers.set(userId, connected);
    console.log(`Usuario ${userId} ${connected ? 'conectado' : 'desconectado'} al servidor SSE`);
  }
  
  // Enviar un mensaje a un usuario
  sendMessage(userId: string, message: any): boolean {
    // Esta función ya no hace nada real porque hemos migrado a Socket.io
    // Sin embargo, la mantenemos para compatibilidad con el código existente
    console.log(`[DEPRECATED] Intentando enviar mensaje a ${userId} a través de SSE (usado Socket.io en su lugar)`);
    return this.isUserConnected(userId);
  }
  
  // Desconectar a un usuario
  disconnectUser(userId: string): void {
    this.connectedUsers.delete(userId);
    console.log(`Usuario ${userId} eliminado de la lista de conectados SSE`);
  }
}

// Singleton para gestionar los eventos de mensajería
export const messageEvents = new MessageEventManager();

// Esta ruta ya no se utiliza activamente, pero mantenemos la compatibilidad
export async function GET() {
  return new NextResponse(
    JSON.stringify({ message: 'Esta API ha sido reemplazada por Socket.io' }),
    {
      status: 410, // Gone
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
