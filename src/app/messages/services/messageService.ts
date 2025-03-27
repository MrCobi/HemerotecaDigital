// src/app/messages/services/messageService.ts
import { ConversationData, User } from '../types';

/**
 * Servicio centralizado para operaciones relacionadas con mensajes
 * Proporciona métodos para interactuar con la API de mensajes y gestionar los datos
 */
export class MessageService {
  /**
   * Obtiene la lista de conversaciones del usuario
   * @param limit Número máximo de conversaciones a obtener
   * @returns Lista de conversaciones
   */
  static async fetchConversations(limit = 15): Promise<ConversationData[]> {
    try {
      const response = await fetch(
        `/api/messages/conversations?limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Error al cargar conversaciones: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error fetching conversations:', _e);
      throw _e;
    }
  }

  /**
   * Obtiene una conversación específica por su ID
   * @param conversationId ID de la conversación
   * @returns Datos de la conversación
   */
  static async fetchConversationById(conversationId: string): Promise<ConversationData> {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar la conversación: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error(`Error fetching conversation ${conversationId}:`, _e);
      throw _e;
    }
  }

  /**
   * Obtiene los mensajes de una conversación
   * @param conversationId ID de la conversación
   * @param page Número de página (para paginación)
   * @param limit Número de mensajes por página
   * @returns Lista de mensajes
   */
  static async fetchMessages(
    conversationId: string, 
    page = 1, 
    limit = 20
  ): Promise<{ 
    messages: Array<{
      id: string;
      content: string | null;
      createdAt: string;
      read: boolean;
      senderId: string;
      senderUsername?: string;
      senderImage?: string;
      sender?: {
        id: string;
        username?: string | null;
        name?: string | null;
        image?: string | null;
      };
      messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
      imageUrl?: string;
      status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
    }>; 
    hasMore: boolean;
  }> {
    try {
      const response = await fetch(
        `/api/messages/conversations/${conversationId}/messages?page=${page}&limit=${limit}`
      );
      
      if (!response.ok) {
        throw new Error(`Error cargando mensajes: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error fetching messages:', _e);
      throw _e;
    }
  }

  /**
   * Crea una nueva conversación con otro usuario
   * @param receiverId ID del usuario con quien crear la conversación
   * @returns Datos de la nueva conversación
   */
  static async createConversation(receiverId: string): Promise<ConversationData> {
    try {
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId })
      });
      
      if (!response.ok) {
        throw new Error(`Error creating conversation: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error creating conversation:', _e);
      throw _e;
    }
  }

  /**
   * Marca una conversación como leída
   * @param conversationId ID de la conversación
   */
  static async markConversationAsRead(conversationId: string): Promise<void> {
    try {
      await fetch(`/api/messages/conversations/${conversationId}/read`, {
        method: 'POST'
      });
    } catch (_e) {
      console.error('Error marking conversation as read:', _e);
      throw _e;
    }
  }

  /**
   * Envía un mensaje de texto
   * @param conversationId ID de la conversación
   * @param content Contenido del mensaje
   * @returns Datos del mensaje enviado
   */
  static async sendTextMessage(conversationId: string, content: string): Promise<{
    id: string;
    content: string;
    createdAt: string;
    read: boolean;
    senderId: string;
    senderUsername?: string;
    senderImage?: string;
    sender?: {
      id: string;
      username?: string | null;
      name?: string | null;
      image?: string | null;
    };
    messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
    imageUrl?: string;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  }> {
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, messageType: 'text' })
      });
      
      if (!response.ok) {
        throw new Error(`Error sending message: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error sending message:', _e);
      throw _e;
    }
  }

  /**
   * Sube una imagen como mensaje
   * @param conversationId ID de la conversación
   * @param file Archivo de imagen
   * @param content Contenido opcional de texto
   * @param onProgress Callback para el progreso de la carga
   * @returns Promise que se resuelve cuando la carga se completa
   */
  static uploadImageMessage(
    conversationId: string, 
    file: File, 
    content?: string,
    onProgress?: (progress: number) => void
  ): Promise<{
    id: string;
    content: string | null;
    createdAt: string;
    read: boolean;
    senderId: string;
    senderUsername?: string;
    senderImage?: string;
    sender?: {
      id: string;
      username?: string | null;
      name?: string | null;
      image?: string | null;
    };
    messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
    imageUrl?: string;
    status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  }> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'image');
      
      if (content) {
        formData.append('content', content);
      }
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/messages/conversations/${conversationId}/upload`, true);
      
      xhr.upload.onprogress = (_e) => {
        if (_e.lengthComputable && onProgress) {
          const progress = Math.round((_e.loaded / _e.total) * 100);
          onProgress(progress);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve({
              id: data.id || '',
              content: data.content || null,
              createdAt: data.createdAt || new Date().toISOString(),
              read: data.read || false,
              senderId: data.senderId || '',
              senderUsername: data.senderUsername,
              senderImage: data.senderImage,
              sender: data.sender,
              messageType: data.messageType || 'image',
              imageUrl: data.imageUrl || data.mediaUrl,
              status: data.status || 'sent'
            });
          } catch {
            resolve({
              id: '',
              content: null,
              createdAt: new Date().toISOString(),
              read: false,
              senderId: '',
              messageType: 'image',
              status: 'sent'
            });
          }
        } else {
          reject(new Error(`Error uploading image: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        reject(new Error('Network error during upload'));
      };
      
      xhr.send(formData);
    });
  }

  /**
   * Obtiene el número de mensajes no leídos
   * @returns Contador de mensajes no leídos
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const response = await fetch('/api/messages/unread/count');
      
      if (!response.ok) {
        throw new Error(`Error fetching unread count: ${response.status}`);
      }
      
      const data = await response.json();
      return data.count || 0;
    } catch (_e) {
      console.error('Error fetching unread count:', _e);
      return 0;
    }
  }

  /**
   * Obtiene la lista de seguidores mutuos del usuario actual
   * @returns Lista de usuarios que son seguidores mutuos
   */
  static async fetchMutualFollowers(): Promise<User[]> {
    try {
      const response = await fetch('/api/relationships/mutual');
      
      if (!response.ok) {
        throw new Error(`Error fetching mutual followers: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error fetching mutual followers:', _e);
      return [];
    }
  }

  /**
   * Crea un nuevo grupo de conversación
   * @param groupData Datos del grupo a crear
   * @param onProgress Callback opcional para progreso de carga
   * @returns Promise con los datos del grupo creado
   */
  static async createGroup(
    groupData: {
      name: string;
      description?: string;
      participants: string[];
      image?: File;
    },
    onProgress?: (progress: number) => void
  ): Promise<ConversationData> {
    try {
      // Si hay una imagen, primero la subimos para obtener la URL
      let imageUrl = undefined;
      
      if (groupData.image) {
        if (onProgress) onProgress(10);
        
        // Subir imagen primero (esto requeriría un endpoint separado para subir la imagen)
        const formData = new FormData();
        formData.append('file', groupData.image);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData
        });
        
        if (!uploadResponse.ok) {
          throw new Error(`Error uploading image: ${uploadResponse.status}`);
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url;
        
        if (onProgress) onProgress(50);
      }
      
      // Ahora enviamos los datos como JSON
      const response = await fetch('/api/messages/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: groupData.name,
          description: groupData.description || '',
          participantIds: groupData.participants, // Nombre correcto del campo
          imageUrl: imageUrl
        })
      });
      
      if (onProgress) onProgress(100);
      
      if (!response.ok) {
        throw new Error(`Error creating group: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error creating group:', _e);
      throw _e;
    }
  }

  /**
   * Actualiza la información de un grupo
   * @param groupId ID del grupo
   * @param updates Campos a actualizar
   * @returns Datos actualizados del grupo
   */
  static async updateGroup(groupId: string, updates: Partial<ConversationData>): Promise<ConversationData> {
    try {
      const response = await fetch(`/api/messages/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Error updating group: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error updating group:', _e);
      throw _e;
    }
  }

  /**
   * Elimina un grupo de conversación
   * @param groupId ID del grupo
   * @returns Respuesta de la API
   */
  static async deleteGroup(groupId: string): Promise<{ success?: boolean }> {
    try {
      const response = await fetch(`/api/messages/groups/${groupId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error deleting group: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error deleting group:', _e);
      throw _e;
    }
  }

  /**
   * Permite al usuario abandonar un grupo
   * @param groupId ID del grupo
   * @returns Respuesta de la API
   */
  static async leaveGroup(groupId: string): Promise<{ success?: boolean }> {
    try {
      const response = await fetch(`/api/messages/groups/${groupId}/leave`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`Error leaving group: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error leaving group:', _e);
      throw _e;
    }
  }

  /**
   * Añade participantes a un grupo
   * @param groupId ID del grupo
   * @param participantIds IDs de los usuarios a añadir
   * @returns Respuesta de la API
   */
  static async addGroupParticipants(groupId: string, participantIds: string[]): Promise<{ success?: boolean }> {
    try {
      const response = await fetch(`/api/messages/groups/${groupId}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: participantIds })
      });
      
      if (!response.ok) {
        throw new Error(`Error adding participants: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error adding participants:', _e);
      throw _e;
    }
  }

  /**
   * Elimina un participante de un grupo
   * @param groupId ID del grupo
   * @param participantId ID del participante a eliminar
   * @returns Respuesta de la API
   */
  static async removeGroupParticipant(groupId: string, participantId: string): Promise<{ success?: boolean }> {
    try {
      const response = await fetch(`/api/messages/groups/${groupId}/participants/${participantId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`Error removing participant: ${response.status}`);
      }
      
      return await response.json();
    } catch (_e) {
      console.error('Error removing participant:', _e);
      throw _e;
    }
  }

  /**
   * Actualiza la imagen de un grupo
   * @param groupId ID del grupo
   * @param image Archivo de imagen
   * @param onProgress Función de callback para el progreso de carga
   * @returns Promesa con la respuesta
   */
  static async updateGroupImage(
    groupId: string, 
    image: File,
    onProgress?: (progress: number) => void
  ): Promise<{ success?: boolean; imageUrl?: string }> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('image', image);
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api/messages/groups/${groupId}/image`, true);
      
      xhr.upload.onprogress = (_e) => {
        if (_e.lengthComputable && onProgress) {
          const percentComplete = Math.round((_e.loaded / _e.total) * 100);
          onProgress(percentComplete);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data);
          } catch {
            resolve({ success: true });
          }
        } else {
          reject(new Error(`Error updating group image: ${xhr.status}`));
        }
      };
      
      xhr.onerror = () => {
        if (onProgress) onProgress(0);
        reject(new Error('Error en la conexión'));
      };

      xhr.onabort = () => {
        if (onProgress) onProgress(0);
        reject(new Error('Carga cancelada'));
      };

      xhr.send(formData);
    });
  }
}
