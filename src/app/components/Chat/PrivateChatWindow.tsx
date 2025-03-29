"use client";
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
// Importar los iconos directamente desde Lucide React para mejor compatibilidad
import { ArrowLeft, ArrowUp, Image as ImageIcon, Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import { useToast } from '@/src/app/components/ui/use-toast';
import { Message, User, ConversationData } from '@/src/app/messages/types';
import Image from 'next/image';

// Importar el hook personalizado
import { useChatContent } from '@/src/app/messages/hooks/useChatContent';

type PrivateChatWindowProps = {
  conversation: ConversationData | null;
  conversationId: string | null;
  className?: string;
  currentUserId?: string;
  _onUserProfileClick?: (user: User) => void;
  onBackClick?: () => void;
  onSettingsClick?: () => void;
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
const PrivateMessageItem = React.memo(({ 
  message, 
  currentUserId, 
  otherUser,
  showDateSeparator,
  currentUserImage,
  currentUserName
}: {
  message: Message;
  currentUserId: string;
  otherUser: User | null;
  showDateSeparator: boolean;
  currentUserImage: string | null;
  currentUserName: string | null;
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  const messageDate = new Date(message.createdAt);
  
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
            {otherUser && 'image' in otherUser && otherUser.image ? (
              <AvatarImage src={otherUser.image} alt={
                (otherUser && 'username' in otherUser && otherUser.username) || 
                (otherUser && 'name' in otherUser && otherUser.name) || 
                'Usuario'
              } />
            ) : (
              <AvatarFallback>
                {(otherUser && 'username' in otherUser && otherUser.username?.charAt(0).toUpperCase()) || 
                 (otherUser && 'name' in otherUser && otherUser.name?.charAt(0).toUpperCase()) || 
                 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        
        <div className={`flex flex-col ${!isCurrentUser ? 'ml-0' : ''}`}>
          {/* Nombre del remitente (para chats privados solo se muestra en la cabecera) */}
          
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

PrivateMessageItem.displayName = 'PrivateMessageItem';

// Componente principal de la ventana de chat privado
const PrivateChatWindow = ({
  conversation,
  conversationId,
  className,
  currentUserId,
  _onUserProfileClick,
  onBackClick,
  onSettingsClick,
}: PrivateChatWindowProps) => {
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

  // Obtener el otro usuario de la conversación (para chats privados)
  const otherUser = React.useMemo(() => {
    if (!conversation || !conversation.participants) return null;
    
    // Para conversaciones privadas, intentamos varias estrategias para obtener al otro usuario
    
    // 1. Verificar si la conversación ya tiene un otherUser precalculado
    if (conversation.otherUser) {
      console.log('Usando otherUser precalculado:', conversation.otherUser);
      return conversation.otherUser;
    }
    
    // 2. Buscar en los participantes
    console.log('Participantes de la conversación:', conversation.participants);
    
    // Intentar encontrar al participante que no es el usuario actual
    for (const participant of conversation.participants) {
      // Varias formas de verificar la identidad del participante
      if (participant.userId && participant.userId !== currentUserId) {
        console.log('Encontrado otro usuario por userId:', participant.user);
        return participant.user;
      } else if (participant.id && participant.id !== currentUserId) {
        console.log('Encontrado otro usuario por id:', participant);
        return participant as unknown as User;
      } else if (typeof participant === 'object' && 'user' in participant && 
                participant.user && participant.user.id !== currentUserId) {
        console.log('Encontrado otro usuario en propiedad user:', participant.user);
        return participant.user;
      }
    }
    
    // 3. Como último recurso, verificar si hay información en el último mensaje
    const lastMessage = conversation.lastMessage;
    if (lastMessage && lastMessage.sender && lastMessage.sender.id !== currentUserId) {
      console.log('Usando información del remitente del último mensaje:', lastMessage.sender);
      return lastMessage.sender;
    }
    
    console.log('No se pudo encontrar información del otro usuario en los participantes', {
      conversationId: conversation.id,
      participantsCount: conversation.participants.length
    });
    
    // Si llegamos hasta aquí, no pudimos encontrar al otro usuario
    return null;
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

  // Renderizar la interfaz principal de chat privado
  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-950", className)}>
      {/* Cabecera del chat con información del usuario */}
      <div className="p-3 border-b flex items-center justify-between gap-3 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Botón de volver */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onBackClick}
            className="mr-1 md:hidden" // Solo visible en móviles
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <Avatar className="h-10 w-10" onClick={() => _onUserProfileClick?.(otherUser as User)}>
            {otherUser?.image ? (
              <AvatarImage src={otherUser.image} alt={otherUser?.username || 'Usuario'} />
            ) : (
              <AvatarFallback>
                {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium truncate">
              {otherUser?.username || 'Usuario'}
            </span>
            <span className="text-xs text-gray-500 truncate">
              {otherUser?.name || 'Sin nombre'}
            </span>
          </div>
        </div>
        
        {/* Botón de configuración */}
        {onSettingsClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSettingsClick}
            className="ml-auto"
            aria-label="Configuración"
          >
            <Settings className="h-5 w-5" />
          </Button>
        )}
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
            
            return (
              <PrivateMessageItem
                key={`${message.id || message.tempId}-${index}`}
                message={message}
                currentUserId={currentUserId || ''}
                otherUser={otherUser}
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
      <div className="p-3 border-t flex flex-col">
        {/* Vista previa de imagen seleccionada */}
        {imagePreview && (
          <div className="mb-2 relative">
            <div className="relative w-24 h-24 overflow-hidden rounded-md border border-gray-300 dark:border-gray-700">
              <Image
                src={imagePreview}
                alt="Preview"
                fill
                style={{ objectFit: 'cover' }}
              />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-0 right-0 h-6 w-6 rounded-full"
                onClick={() => handleImageChange(null)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mt-1 w-24">
                <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{uploadProgress}%</span>
              </div>
            )}
          </div>
        )}
        
        {/* Input y botones para enviar mensajes */}
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openFileSelector}
            className="h-10 w-10 flex-shrink-0"
            disabled={sendingMessage}
          >
            <ImageIcon className="h-5 w-5" />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              value={newMessageContent}
              onChange={handleTextChange}
              placeholder="Escribe un mensaje..."
              className="resize-none min-h-[40px] max-h-[120px] py-2 pr-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sendingMessage}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSendMessage}
              className="absolute right-2 bottom-1 h-8 w-8"
              disabled={(!newMessageContent.trim() && !imageToSend) || sendingMessage}
            >
              {sendingMessage ? (
                <LoadingSpinner className="h-4 w-4" />
              ) : (
                <ArrowUp className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

PrivateChatWindow.displayName = 'PrivateChatWindow';

export default PrivateChatWindow;
