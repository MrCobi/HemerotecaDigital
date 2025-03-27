// src/app/messages/types.ts
// Definición de tipos para el módulo de mensajes

export interface User {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
}

export interface Participant {
  id: string;
  userId: string;
  role: 'admin' | 'member' | 'moderator' | 'owner';
  user: User;
}

// Utiliza un tipo de índice más amplio para ser compatible con GroupManagementModal
export interface ConversationData {
  id: string;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isGroup: boolean;
  participants: Participant[];
  lastMessage?: Message;
  createdAt?: string;
  updatedAt?: string;
  unreadCount?: number;
  otherUser?: User;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Necesario para compatibilidad con GroupManagementModal
}

export interface Message {
  id?: string;
  tempId?: string;
  content: string | null;
  createdAt: Date | string;
  read?: boolean;
  senderId: string;
  sender?: {
    id: string;
    username: string | null;
    name?: string | null;
    image?: string | null;
  };
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
  mediaUrl?: string;
  imageUrl?: string; // URL para imágenes adjuntas
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  conversationId?: string;
  receiverId?: string;
}

export interface Conversation {
  id: string;
  otherUser: User;
  lastMessage: Message | null;
  createdAt?: string;
  updatedAt: string;
  senderId?: string;
  receiverId?: string;
  sender?: {
    id: string;
    username: string | null;
    image: string | null;
  };
  receiver?: {
    id: string;
    username: string | null;
    image: string | null;
  };
  unreadCount?: number;
  lastInteraction?: Date;
  isEmpty?: boolean;
  isGroup?: boolean;
  name?: string;
  imageUrl?: string;
  participants?: Participant[];
  participantsCount?: number;
  description?: string;
}

export interface CombinedItem {
  id: string;
  isConversation: boolean;
  data: Conversation | User;
  lastInteraction?: Date;
}

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export type FilterType = 'all' | 'private' | 'group';

export interface ConversationState {
  conversations: Conversation[];
  mutualFollowers: User[];
  mutualFollowersForGroups: User[];
  combinedList: CombinedItem[];
  loading: boolean;
  selectedConversation: string | null;
  selectedConversationData: ConversationData | null;
}

export interface GroupCreationState {
  name: string;
  description: string;
  participants: Participant[];
  isCreating: boolean;
  image: File | null;
  imagePreview: string | null;
}

export interface GroupManagementState {
  showModal: boolean;
  isAdmin: boolean;
  nameEdit: string;
  descriptionEdit: string;
  showAddParticipantsModal: boolean;
  possibleParticipants: User[];
  selectedNewParticipants: string[];
  isUpdating: boolean;
}
