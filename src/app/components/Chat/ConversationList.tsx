"use client";

import React, { useMemo } from 'react';
import { Avatar } from "@/src/app/components/ui/avatar";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { MessageSquarePlus, Users } from "lucide-react";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Importamos los tipos
import { User, Conversation, CombinedItem } from '@/src/app/messages/types';

interface ConversationListProps {
  loading: boolean;
  combinedList: CombinedItem[];
  selectedConversation: string | null;
  onConversationSelect: (conversation: Conversation) => void;
  onUserSelect: (user: User) => void;
  onNewMessage: () => void;
  onNewGroup: () => void;
  onRefresh: () => void;
  onFilterChange: (filter: 'all' | 'private' | 'group') => void;
  selectedFilter: 'all' | 'private' | 'group';
  generalSearchTerm: string;
  onSearchChange: (term: string) => void;
  session: Record<string, any>;
  showHeader?: boolean;
  showFilters?: boolean;
}

interface ConversationItemProps {
  item: CombinedItem;
  isSelected: boolean;
  onSelect: (item: Conversation | User) => void;
  _currentUserId: string;
}

const ConversationItem = ({ item, isSelected, onSelect, _currentUserId }: ConversationItemProps) => {
  const isGroup = item.isConversation ? (item.data as Conversation).isGroup : false;
  const isConversation = item.isConversation;
  const user = isConversation ? (item.data as Conversation).otherUser : item.data as User;
  const conversation = isConversation ? item.data as Conversation : null;

  const formatLastMessageDate = (date: string | Date | undefined) => {
    if (!date) return '';
    
    const messageDate = new Date(date);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const isToday = messageDate.getDate() === now.getDate() && 
                     messageDate.getMonth() === now.getMonth() && 
                     messageDate.getFullYear() === now.getFullYear();
                     
    const isYesterday = messageDate.getDate() === yesterday.getDate() && 
                        messageDate.getMonth() === yesterday.getMonth() && 
                        messageDate.getFullYear() === yesterday.getFullYear();
    
    if (isToday) {
      return format(messageDate, 'HH:mm', { locale: es });
    } else if (isYesterday) {
      return 'Ayer';
    } else if (now.getFullYear() === messageDate.getFullYear()) {
      return format(messageDate, 'd MMM', { locale: es });
    } else {
      return format(messageDate, 'd MMM yyyy', { locale: es });
    }
  };

  const handleClick = () => {
    if (isConversation && conversation) {
      onSelect(conversation);
    } else if (!isConversation && user) {
      onSelect(user);
    }
  };

  return (
    <div
      className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-start space-x-3 ${isSelected && "bg-blue-50 dark:bg-gray-700"}`}
      onClick={handleClick}
    >
      {/* Avatar */}
      <Avatar className="h-12 w-12 border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
        {isGroup ? (
          // Avatar para grupos
          conversation?.imageUrl && conversation.imageUrl.includes('cloudinary') ? (
            <CldImage
              src={conversation.imageUrl}
              alt={conversation.name || "Grupo"}
              width={48}
              height={48}
              crop="fill"
              gravity="face"
              className="h-full w-full object-cover"
              priority
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          ) : conversation?.imageUrl && !conversation.imageUrl.startsWith('/') && !conversation.imageUrl.startsWith('http') ? (
            <CldImage
              src={conversation.imageUrl}
              alt={conversation.name || "Grupo"}
              width={48}
              height={48}
              crop="fill"
              gravity="face"
              className="h-full w-full object-cover"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          ) : (
            <Image 
              src={conversation?.imageUrl || "/images/AvatarPredeterminado.webp"}
              width={48}
              height={48}
              alt={conversation?.name || "Grupo"}
              className="h-full w-full object-cover"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          )
        ) : (
          // Avatar para conversaciones individuales
          user.image && user.image.includes('cloudinary') ? (
            <CldImage
              src={user.image}
              alt={user.username || "Usuario"}
              width={48}
              height={48}
              crop="fill"
              gravity="face"
              className="h-full w-full object-cover"
              priority
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          ) : user.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
            <CldImage
              src={user.image}
              alt={user.username || "Usuario"}
              width={48}
              height={48}
              crop="fill"
              gravity="face"
              className="h-full w-full object-cover"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          ) : (
            <Image
              src={user.image || "/images/AvatarPredeterminado.webp"} 
              alt={user.username || "Usuario"}
              width={48}
              height={48}
              className="h-full w-full object-cover"
              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          )
        )}
      </Avatar>
      
      {/* Información de la conversación */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h4 className="font-medium truncate">
            {isGroup 
              ? conversation?.name || "Grupo sin nombre" 
              : user.username || user.name || "Usuario"}
          </h4>
          {conversation?.lastMessage && (
            <span className="text-xs text-gray-500">
              {formatLastMessageDate(conversation.lastMessage.createdAt)}
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {isGroup && conversation ? (
            <>
              <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                {conversation.participants ? conversation.participants.length : 0} participantes
              </span>
              {conversation.description && (
                <span className="mx-1 text-xs text-gray-500">•</span>
              )}
              {conversation.description && (
                <span className="text-xs italic text-gray-500">{conversation.description}</span>
              )}
            </>
          ) : conversation?.lastMessage ? (
            conversation.lastMessage.messageType === 'voice' ? (
              <span className="flex items-center">
                🎤 Mensaje de voz
              </span>
            ) : conversation.lastMessage.content
          ) : (
            <span className="italic">Sin mensajes</span>
          )}
        </p>
        
        {/* Contador de mensajes no leídos */}
        {conversation?.unreadCount && conversation.unreadCount > 0 && (
          <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs mt-1 inline-block">
            {conversation.unreadCount}
          </span>
        )}
      </div>
    </div>
  );
};

const ConversationList = React.memo(({
  loading,
  combinedList,
  selectedConversation,
  onConversationSelect,
  onUserSelect,
  onNewMessage,
  onNewGroup,
  onRefresh,
  onFilterChange,
  selectedFilter,
  generalSearchTerm,
  onSearchChange,
  session,
  showHeader = true,
  showFilters = true
}: ConversationListProps) => {
  
  // Filtrar las conversaciones según los criterios seleccionados
  const filteredConversations = useMemo(() => {
    // Primero filtramos por tipo (todo, privado, grupo)
    let filtered = combinedList.filter(item => {
      if (selectedFilter === 'all') return true;
      
      if (item.isConversation) {
        const conv = item.data as Conversation;
        if (selectedFilter === 'private') return !conv.isGroup;
        if (selectedFilter === 'group') return Boolean(conv.isGroup);
      } else {
        // Si no es una conversación (es un usuario)
        return selectedFilter === 'private'; // Los usuarios solo aparecen en modo privado
      }
      
      return true;
    });
    
    // Luego filtramos por texto de búsqueda con criterios específicos según el tipo
    if (generalSearchTerm.trim()) {
      const searchTermLower = generalSearchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(item => {
        if (item.isConversation) {
          const conv = item.data as Conversation;
          
          if (conv.isGroup) {
            // Criterios específicos para grupos
            const name = conv.name || '';
            const participants = conv.participants || [];
            const lastMessageContent = conv.lastMessage?.content || '';
            
            // Buscar en nombre del grupo, participantes o último mensaje
            return (
              name.toLowerCase().includes(searchTermLower) ||
              lastMessageContent.toLowerCase().includes(searchTermLower) ||
              participants.some(p => 
                (p.user?.username || '').toLowerCase().includes(searchTermLower) ||
                (p.user?.name || '').toLowerCase().includes(searchTermLower)
              )
            );
          } else {
            // Criterios específicos para conversaciones privadas
            const otherUser = conv.otherUser || {};
            const lastMessageContent = conv.lastMessage?.content || '';
            
            return (
              (otherUser.username || '').toLowerCase().includes(searchTermLower) ||
              (otherUser.name || '').toLowerCase().includes(searchTermLower) ||
              lastMessageContent.toLowerCase().includes(searchTermLower)
            );
          }
        } else {
          // Criterios específicos para usuarios (no conversaciones)
          const user = item.data as User;
          return (
            (user.username || '').toLowerCase().includes(searchTermLower) ||
            (user.name || '').toLowerCase().includes(searchTermLower)
          );
        }
      });
    }
    
    return filtered;
  }, [combinedList, selectedFilter, generalSearchTerm]);

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-gray-800">
      {/* Ocultamos el encabezado cuando se usa el proporcionado en la página principal */}
      {showHeader && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Mensajes</h1>
          
          <div className="flex items-center space-x-2">
            {/* Botones de acción */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRefresh}
              title="Actualizar conversaciones"
              aria-label="Actualizar conversaciones"
              className="rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 21h5v-5"></path>
              </svg>
            </Button>
            {/* Botón para nuevo grupo */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNewGroup}
              title="Nuevo grupo"
              aria-label="Nuevo grupo"
              className="rounded-full"
            >
              <Users size={20} />
            </Button>
            {/* Botón para nuevo mensaje */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onNewMessage}
              title="Nuevo mensaje"
              aria-label="Nuevo mensaje"
              className="rounded-full"
            >
              <MessageSquarePlus size={20} />
            </Button>
          </div>
        </div>
      )}
      
      {/* Mostrar filtros solo si showFilters es verdadero */}
      {showFilters && (
        <div className="flex space-x-1 border-b border-gray-200 p-2 dark:border-gray-700">
          <Button
            variant={selectedFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => onFilterChange('all')}
          >
            Todos
          </Button>
          
          <Button
            variant={selectedFilter === 'private' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => onFilterChange('private')}
          >
            Privados
          </Button>
          
          <Button
            variant={selectedFilter === 'group' ? 'default' : 'ghost'}
            size="sm"
            className="flex-1"
            onClick={() => onFilterChange('group')}
          >
            Grupos
          </Button>
        </div>
      )}

      {/* Entrada de búsqueda */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <Input
          value={generalSearchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar..."
          className="w-full"
        />
      </div>

      {/* Lista de conversaciones */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <LoadingSpinner size="medium" />
          </div>
        ) : filteredConversations.length > 0 ? (
          filteredConversations.map((item) => (
            <ConversationItem
              key={item.id}
              item={item}
              isSelected={selectedConversation === item.id}
              onSelect={(itemData: Conversation | User) => {
                if (item.isConversation) {
                  onConversationSelect(itemData as Conversation);
                } else {
                  onUserSelect(itemData as User);
                }
              }}
              _currentUserId={session?.user?.id || ''}
            />
          ))
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="mb-2">No hay conversaciones disponibles</p>
              <Button variant="outline" onClick={onNewMessage}>
                <MessageSquarePlus className="mr-2 h-4 w-4" /> 
                Iniciar nueva conversación
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ConversationList.displayName = 'ConversationList';

export default ConversationList;
