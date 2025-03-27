"use client";
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Send, Image as ImageIcon, X, ArrowUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import VoiceMessageRecorder from './VoiceMessageRecorder';
import { useToast } from '@/src/app/components/ui/use-toast';
import { Message, ConversationData } from '@/src/app/messages/types';

// Importar el hook personalizado
import { useChatContent } from '@/src/app/messages/hooks/useChatContent';

type OptimizedChatWindowProps = {
  conversation: ConversationData | null;
  conversationId: string | null;
  className?: string;
  currentUserId?: string;
  onUserProfileClick?: (user: any) => void;
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
  showAvatar,
  showDateSeparator,
  currentUserImage,
  currentUserName
}: { 
  message: Message, 
  currentUserId: string,
  otherUser: any,
  showAvatar: boolean,
  showDateSeparator: boolean,
  currentUserImage: string | null | undefined,
  currentUserName: string | null | undefined
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  const messageDate = new Date(message.createdAt);
  
  return (
    <>
      {showDateSeparator && (
        <DateSeparator date={messageDate} />
      )}
      
      <div
        className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} items-end gap-2 mb-2`}
      >
        {!isCurrentUser && showAvatar && (
          <Avatar className="h-8 w-8 flex-shrink-0">
            {otherUser?.image ? (
              <AvatarImage src={otherUser.image} alt={otherUser.username || 'Usuario'} />
            ) : (
              <AvatarFallback>
                {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        
        <div className={`flex flex-col ${!isCurrentUser && showAvatar ? 'ml-0' : !isCurrentUser ? 'ml-10' : ''}`}>
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
                <img 
                  src={message.imageUrl} 
                  alt="Imagen adjunta" 
                  className="max-w-full rounded-lg"
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
                {message.read ? 'Leído' : 'Enviado'}
              </span>
            )}
          </div>
        </div>
        
        {isCurrentUser && showAvatar && (
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
  onUserProfileClick,
}: OptimizedChatWindowProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  
  // Usar el hook personalizado para manejar la lógica del chat
  const {
    messages,
    loading,
    error,
    hasMoreMessages,
    newMessageContent,
    sendingMessage,
    imageToSend,
    imagePreview,
    uploadProgress,
    
    setNewMessageContent,
    handleSendMessage,
    handleImageChange,
    loadMoreMessages,
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

  // Manejar envío con Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Calcular si mostrar avatar y separador de fecha para cada mensaje
  const getMessageRenderProps = (message: Message, index: number, allMessages: Message[]) => {
    // Mostrar avatar solo en el último mensaje de una secuencia del mismo remitente
    const nextMessage = allMessages[index + 1];
    const showAvatar = !nextMessage || nextMessage.senderId !== message.senderId;
    
    // Mostrar separador de fecha cuando cambia el día
    const currentDate = new Date(message.createdAt);
    const prevMessage = allMessages[index - 1];
    const showDateSeparator = !prevMessage || 
      !isSameDay(currentDate, new Date(prevMessage.createdAt));
    
    return { showAvatar, showDateSeparator };
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header con información del otro usuario o grupo */}
      {conversation && (
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <Avatar className="h-10 w-10 mr-3">
            {conversation.isGroup ? (
              <>
                {conversation.imageUrl ? (
                  <AvatarImage src={conversation.imageUrl} alt={conversation.name || 'Grupo'} />
                ) : (
                  <AvatarFallback>
                    {conversation.name?.charAt(0).toUpperCase() || 'G'}
                  </AvatarFallback>
                )}
              </>
            ) : (
              <>
                {conversation.otherUser?.image ? (
                  <AvatarImage src={conversation.otherUser.image} alt={conversation.otherUser.username || 'Usuario'} />
                ) : (
                  <AvatarFallback>
                    {conversation.otherUser?.username?.charAt(0).toUpperCase() || 'U'}
                  </AvatarFallback>
                )}
              </>
            )}
          </Avatar>
          <div>
            <h3 className="font-semibold">
              {conversation.isGroup 
                ? conversation.name
                : conversation.otherUser?.username || 'Usuario'}
            </h3>
            {conversation.isGroup && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {conversation.participants?.length || 0} participantes
              </p>
            )}
          </div>
        </div>
      )}
      
      {/* Contenedor de mensajes */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        onScroll={handleScroll}
      >
        {/* Indicador de carga para más mensajes */}
        {loading && hasMoreMessages && (
          <div className="flex justify-center">
            <LoadingSpinner size="small" />
          </div>
        )}
        
        {/* Mensajes */}
        {messages.map((message, index) => {
          const { showAvatar, showDateSeparator } = 
            getMessageRenderProps(message, index, messages);
          
          // Crear key única basada en id, tempId e índice
          const uniqueKey = message.id 
            ? `msg-${message.id}-${index}` 
            : `temp-${message.tempId || Date.now()}-${index}`;
          
          return (
            <MessageItem
              key={uniqueKey}
              message={message}
              currentUserId={currentUserId || session?.user?.id || ''}
              otherUser={conversation?.otherUser || conversation?.participants?.[0]?.user}
              showAvatar={showAvatar}
              showDateSeparator={showDateSeparator}
              currentUserImage={session?.user?.image}
              currentUserName={session?.user?.name || session?.user?.username}
            />
          );
        })}
        
        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-100 text-red-800 p-2 rounded-md text-center">
            {error}
          </div>
        )}
        
        {/* Sin mensajes */}
        {!loading && messages.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <p>Aún no hay mensajes.</p>
            <p className="text-sm">¡Sé el primero en decir hola!</p>
          </div>
        )}
        
        {/* Referencia al final para scroll */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input para escribir mensajes */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        {/* Previsualización de imagen */}
        {imagePreview && (
          <div className="relative mb-2 inline-block">
            <img 
              src={imagePreview} 
              alt="Vista previa" 
              className="max-h-32 rounded-md"
            />
            <button
              onClick={() => handleImageChange(null)}
              className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 rounded-full p-1"
            >
              <X size={16} className="text-white" />
            </button>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        )}
        
        <div className="flex items-end gap-2">
          <Textarea
            value={newMessageContent}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje..."
            className="min-h-[4rem] resize-none flex-1"
            disabled={sendingMessage}
          />
          
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={openFileSelector}
              disabled={sendingMessage}
              title="Adjuntar imagen"
            >
              <ImageIcon size={20} />
            </Button>
            
            <Button
              type="button"
              size="icon"
              onClick={handleSendMessage}
              disabled={(!newMessageContent.trim() && !imageToSend) || sendingMessage}
              title="Enviar mensaje"
            >
              {sendingMessage ? (
                <LoadingSpinner size="small" />
              ) : (
                <ArrowUp size={20} />
              )}
            </Button>
          </div>
        </div>
        
        {/* Input oculto para seleccionar archivos */}
        <input
          type="file"
          ref={imageInputRef}
          onChange={handleFileSelect}
          accept="image/*"
          className="hidden"
        />
      </div>
    </div>
  );
}
