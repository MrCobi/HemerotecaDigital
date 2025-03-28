"use client";
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Image as ImageIcon, X, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import { useToast } from '@/src/app/components/ui/use-toast';
import { Message, User, ConversationData } from '@/src/app/messages/types';
import Image from 'next/image';

// Importar el hook personalizado
import { useChatContent } from '@/src/app/messages/hooks/useChatContent';

type OptimizedChatWindowProps = {
  conversation: ConversationData | null;
  conversationId: string | null;
  className?: string;
  currentUserId?: string;
  _onUserProfileClick?: (user: User) => void;
};

// Componente para mostrar separadores de fecha entre mensajes
const DateSeparator = React.memo(({ date }: { date: Date | string }) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  let displayDate;
  
  if (isToday(dateObj)) {
    displayDate = 'Hoy';
  } else if (isYesterday(dateObj)) {
    displayDate = 'Ayer';
  } else {
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('es-ES', { month: 'long' });
    const year = dateObj.getFullYear();
    displayDate = `${day} ${month} ${year}`;
  }
  
  return (
    <div className="flex items-center justify-center my-4">
      <div className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
        {displayDate}
      </div>
    </div>
  );
});

DateSeparator.displayName = 'DateSeparator';

// Componente para mostrar cada mensaje individual
const MessageItem = React.memo(({ 
  message, 
  currentUserId, 
  otherUser, 
  conversation,
  showDateSeparator,
  currentUserImage,
  currentUserName
}: {
  message: Message;
  currentUserId: string;
  otherUser: User | null;
  conversation: ConversationData | null;
  showDateSeparator: boolean;
  currentUserImage: string | null;
  currentUserName: string | null;
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  const messageDate = new Date(message.createdAt);
  
  // Obtener los datos del remitente para mensajes de grupo
  const isGroupMessage = conversation?.isGroup === true;
  
  // Si es un mensaje de grupo y no es del usuario actual, buscar el participante
  let messageSender = null;
  if (isGroupMessage && !isCurrentUser && message.senderId) {
    // Buscar el participante por su ID
    const participant = conversation?.participants?.find(p => p.userId === message.senderId);
    if (participant) {
      messageSender = participant.user;
    } else if (message.sender) {
      // Usar la información del remitente directamente del mensaje si está disponible
      messageSender = message.sender;
    }
  }
  
  // Función para determinar el texto de estado del mensaje
  const getMessageStatusText = () => {
    if (!isCurrentUser) return null;
    
    // Usar propiedad 'status' si está disponible, o 'read' como fallback
    if (message.status) {
      switch (message.status) {
        case 'sending': return 'Enviando...';
        case 'sent': return 'Enviado';
        case 'delivered': return 'Entregado';
        case 'read': return 'Leído';
        case 'failed': return 'Error';
        default: return 'Enviado';
      }
    } else {
      return message.read ? 'Leído' : 'Enviado';
    }
  };
  
  return (
    <>
      {showDateSeparator && (
        <DateSeparator date={messageDate} />
      )}
      
      <div
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end gap-2 mb-2`}
      >
        {!isCurrentUser && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            {messageSender?.image ? (
              <AvatarImage src={messageSender.image} alt={messageSender.username || 'Usuario'} />
            ) : otherUser?.image ? (
              <AvatarImage src={otherUser.image} alt={otherUser?.username || 'Usuario'} />
            ) : (
              <AvatarFallback>
                {messageSender?.username?.charAt(0).toUpperCase() || 
                 otherUser?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        
        <div className={`flex flex-col ${!isCurrentUser ? 'ml-0' : ''}`}>
          {/* Nombre del remitente para mensajes de grupo (que no sean del usuario actual) */}
          {!isCurrentUser && isGroupMessage && messageSender && (
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 ml-1">
              {messageSender.username || messageSender.name || 'Usuario'}
            </span>
          )}
          
          <div
            className={cn(
              'max-w-xs md:max-w-md p-3 rounded-lg',
              isCurrentUser
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
            )}
          >
            {message.messageType === 'image' && message.imageUrl && (
              <div className="mb-2">
                <Image 
                  src={message.imageUrl} 
                  alt="Imagen adjunta" 
                  className="max-w-full rounded-lg"
                  width={300}
                  height={200}
                  loading="lazy"
                />
              </div>
            )}
            
            {message.content && (
              <div className="whitespace-pre-wrap break-words">{message.content}</div>
            )}
          </div>
          
          <div className={`flex items-center mt-1 text-xs text-gray-500 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
            <span>
              {format(messageDate, 'HH:mm')}
            </span>
            
            {isCurrentUser && (
              <span className="ml-2">
                {getMessageStatusText()}
              </span>
            )}
          </div>
        </div>
        
        {isCurrentUser && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            {currentUserImage ? (
              <AvatarImage src={currentUserImage} alt={currentUserName || 'Usuario'} />
            ) : (
              <AvatarFallback>
                {currentUserName?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        )}
      </div>
    </>
  );
});

MessageItem.displayName = 'MessageItem';

// Componente principal de la ventana de chat
export default function OptimizedChatWindow({
  conversation,
  conversationId,
  className,
  currentUserId,
  _onUserProfileClick,
}: OptimizedChatWindowProps) {
  const { data: session } = useSession();
  const { toast: _toast } = useToast();
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  
  // Usar el hook personalizado para manejar la lógica del chat
  const {
    messages,
    loading,
    error,
    hasMoreMessages: _hasMoreMessages,
    newMessageContent,
    sendingMessage,
    imageToSend,
    imagePreview,
    uploadProgress,
    
    setNewMessageContent,
    handleSendMessage,
    handleImageChange,
    loadMoreMessages: _loadMoreMessages,
    handleScroll,
    
    messagesEndRef,
    messagesContainerRef,
  } = useChatContent(conversation, conversationId);

  // Manejar cambio de texto en el input
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessageContent(e.target.value);
  };

  // Manejar selección de archivo
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleImageChange(file);
  };

  // Abrir selector de archivos
  const openFileSelector = () => {
    imageInputRef.current?.click();
  };

  // Obtener el otro usuario de la conversación
  const otherUser = React.useMemo(() => {
    if (!conversation || !conversation.participants) return null;
    const participant = conversation.participants.find(user => user.id !== currentUserId);
    if (!participant) return null;
    return participant as unknown as User; // Type cast to match the expected User type
  }, [conversation, currentUserId]);

  // Mostrar un mensaje si no hay conversación seleccionada
  if (!conversationId || !conversation) {
    return (
      <div className={cn("flex flex-col h-full justify-center items-center p-4 text-gray-500", className)}>
        <div className="text-center space-y-2">
          <p>Selecciona una conversación para comenzar a chatear</p>
        </div>
      </div>
    );
  }

  // Mostrar un mensaje de error si hay uno
  if (error) {
    return (
      <div className={cn("flex flex-col h-full justify-center items-center p-4", className)}>
        <div className="text-center space-y-2 text-red-500">
          <p>Error: {error}</p>
          <Button
            onClick={() => window.location.reload()}
            variant="outline"
          >
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Mostrar un indicador de carga si está cargando
  if (loading && !messages.length) {
    return (
      <div className={cn("flex flex-col h-full justify-center items-center p-4", className)}>
        <LoadingSpinner className="h-8 w-8 mb-2" />
        <p>Cargando mensajes...</p>
      </div>
    );
  }

  // Renderizar la interfaz principal de chat
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Cabecera de la conversación */}
      <div className="flex items-center p-3 border-b dark:border-gray-700 bg-white dark:bg-gray-800">
        <Avatar className="h-10 w-10 mr-3">
          {conversation?.isGroup ? (
            <AvatarImage src={conversation.imageUrl || "/images/AvatarPredeterminado.webp"} alt={conversation.name || 'Grupo'} />
          ) : otherUser?.image ? (
            <AvatarImage src={otherUser.image} alt={otherUser?.username || 'Usuario'} />
          ) : (
            <AvatarFallback>
              {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex flex-col">
          <span className="font-medium">
            {conversation?.isGroup 
              ? conversation.name 
              : otherUser?.username || 'Usuario'}
          </span>
          {conversation?.isGroup && (
            <span className="text-xs text-gray-500">
              {conversation.participants?.length || 0} participantes
            </span>
          )}
        </div>
      </div>

      {/* Contenedor de mensajes */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-3 space-y-2"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col justify-center items-center text-gray-500">
            <p>No hay mensajes. Comienza la conversación ahora!</p>
          </div>
        ) : (
          messages.map((message, index) => {
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const sameDay = previousMessage 
              ? isSameDay(new Date(message.createdAt), new Date(previousMessage.createdAt))
              : false;
            const showDateSeparator = !sameDay;
            
            // Determinar si debemos mostrar el avatar (último mensaje de una secuencia)
            const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
            const _isLastInSequence = !nextMessage || nextMessage.senderId !== message.senderId;
            
            return (
              <MessageItem
                key={`${message.id || message.tempId}-${index}`}
                message={message}
                currentUserId={currentUserId || ''}
                otherUser={otherUser}
                conversation={conversation}
                showDateSeparator={showDateSeparator}
                currentUserImage={session?.user?.image || null}
                currentUserName={session?.user?.name || null}
              />
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Previsualización de imagen */}
      {imagePreview && (
        <div className="p-2 border-t dark:border-gray-700">
          <div className="relative inline-block">
            <Image 
              src={imagePreview} 
              alt="Vista previa" 
              className="max-h-40 max-w-full rounded-lg"
              width={150}
              height={150}
            />
            <button
              className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white"
              onClick={() => handleImageChange(null)}
            >
              <X size={16} />
            </button>
          </div>
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="mt-1">
              <div className="h-1 bg-gray-200 rounded">
                <div 
                  className="h-1 bg-blue-500 rounded" 
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="text-xs text-gray-500">{uploadProgress}%</span>
            </div>
          )}
        </div>
      )}

      {/* Área de entrada de mensaje */}
      <div className="p-3 border-t dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openFileSelector}
            disabled={sendingMessage}
          >
            <ImageIcon size={20} />
          </Button>
          
          <input
            type="file"
            ref={imageInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={sendingMessage}
          />
          
          <Textarea
            value={newMessageContent}
            onChange={handleTextChange}
            placeholder="Escribe un mensaje..."
            className="flex-1 min-h-[40px] max-h-[160px]"
            disabled={sendingMessage}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (newMessageContent.trim() || imageToSend) {
                  handleSendMessage();
                }
              }
            }}
          />
          
          <Button
            type="button"
            size="icon"
            disabled={(!newMessageContent.trim() && !imageToSend) || sendingMessage}
            onClick={() => handleSendMessage()}
          >
            {sendingMessage ? <LoadingSpinner className="h-5 w-5" /> : <ArrowUp size={20} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
