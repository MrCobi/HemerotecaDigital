// src/app/api/messages/sse-messages/message-event-manager.ts

// Clase para gestionar eventos de mensajería
export class MessageEventManager {
  private static instance: MessageEventManager;
  private connectedUsers: Map<string, boolean> = new Map();
  
  private constructor() {}
  
  public static getInstance(): MessageEventManager {
    if (!MessageEventManager.instance) {
      MessageEventManager.instance = new MessageEventManager();
    }
    return MessageEventManager.instance;
  }
  
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
  sendMessage(userId: string, _message: Record<string, unknown>): boolean {
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

// Exportar la instancia singleton para uso interno
export const messageEvents = MessageEventManager.getInstance();
