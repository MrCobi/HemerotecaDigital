"use client";
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
// Importamos y renombramos con prefijo '_' para indicar que no se utilizan
import { es as _es } from 'date-fns/locale';
import { default as _Image } from 'next/image';
import { CldImage } from 'next-cloudinary';
import { useRef as _useRef, useState, useEffect as _useEffect, useCallback as _useCallback } from 'react';
// Importar los iconos necesarios
import { ArrowLeft, ArrowUp, ImageIcon, Settings, X, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import { useToast } from '@/src/app/components/ui/use-toast';
import { Message, User, ConversationData, FilterType } from '@/src/app/messages/types';
import NextImage from 'next/image';
import useAudioRecorder from '@/src/hooks/useAudioRecorder';
import AudioPlayer from './AudioPlayer';
import PrivateChatManagementModal from './PrivateChatManagementModal';

// Importar el hook personalizado
import { useChatContent } from '@/src/app/messages/hooks/useChatContent';

// Función para extraer el ID de Cloudinary de una URL completa
const extractCloudinaryId = (url: string): string => {
  // Ejemplo: https://res.cloudinary.com/dlg8j3g5k/image/upload/v1/path/to/image.jpg
  const regex = /\/image\/upload\/(?:v\d+\/)?(.+)$/;
  const match = url.match(regex);
  if (match && match[1]) {
    return match[1];
  }
  // Fallback: devolver la última parte de la URL
  const parts = url.split('/');
  return parts[parts.length - 1];
};

type PrivateChatWindowProps = {
  conversation: ConversationData;
  conversationId: string | null;
  className?: string;
  currentUserId?: string;
  _userId?: string;
  _isOpen?: boolean;
  _onUserProfileClick?: (user: User) => void;
  onBackClick?: () => void;
  onSettingsClick?: () => void;
  _onPlayAudio?: (url: string) => void;
  fetchConversations?: (forceRefresh?: boolean, resetToPage1?: boolean, explicitFilter?: FilterType) => Promise<void>;
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
    // Formato más natural: "20 de abril" o "20 de abril de 2024" si no es el año actual
    const currentYear = new Date().getFullYear();
    const messageYear = dateObj.getFullYear();
    const day = dateObj.getDate();
    const month = dateObj.toLocaleString('es-ES', { month: 'long' });
    
    if (currentYear === messageYear) {
      displayDate = `${day} de ${month}`;
    } else {
      displayDate = `${day} de ${month} de ${messageYear}`;
    }
  }
  
  return (
    <div className="flex items-center justify-center my-3">
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
  currentUserName,
  _onPlayAudio,
  index
}: {
  message: Message;
  currentUserId: string;
  otherUser: User | null;
  showDateSeparator: boolean;
  currentUserImage: string | null;
  currentUserName: string | null;
  _onPlayAudio: (url: string) => void;
  index: number;
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  const messageDate = new Date(message.createdAt);
  
  // Estado para manejar la carga de imágenes
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [useCloudinary, setUseCloudinary] = React.useState(true);

  // Verificar si el mensaje tiene una URL de medios válida
  const hasValidMediaUrl = React.useMemo(() => {
    if (!message.mediaUrl) return false;
    
    // Si es un Data URL o blob URL (mensaje temporal), considerarlo válido
    if (message.mediaUrl.startsWith('data:') || message.mediaUrl.startsWith('blob:')) return true;
    
    // Para URLs normales, comprobar que sea una string no vacía
    return message.mediaUrl.trim().length > 0;
  }, [message.mediaUrl]);

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
  
  // Determinar si es un mensaje de voz
  const isVoiceMessage = message.messageType === 'voice';
  const isImageMessage = message.messageType === 'image' && hasValidMediaUrl;

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
            {otherUser?.image ? (
              <AvatarImage src={otherUser.image} alt={otherUser?.username || 'Usuario'} />
            ) : (
              <AvatarFallback>
                {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        )}
        
        <div className={`flex flex-col ${!isCurrentUser ? 'ml-0' : ''}`}>
          <div
            className={cn(
              'max-w-xs md:max-w-md p-3 rounded-lg',
              isCurrentUser
                ? 'bg-blue-500 text-white rounded-br-none'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-none'
            )}
          >
            {/* Contenido del mensaje según su tipo */}
            {isVoiceMessage ? (
              <div className="voice-message min-w-[200px]">
                <AudioPlayer 
                  audioUrl={message.mediaUrl || ''}
                  messageId={message.id || message.tempId || `msg-${index}`}
                  isSender={isCurrentUser}
                />
              </div>
            ) : isImageMessage ? (
              <div
                className={`relative overflow-hidden rounded-lg ${
                  !imageLoaded ? 'bg-gray-200 dark:bg-gray-700 animate-pulse h-[150px]' : ''
                }`}
              >
                {message.mediaUrl && message.mediaUrl.includes('cloudinary.com') && useCloudinary ? (
                  <CldImage 
                    src={extractCloudinaryId(message.mediaUrl)}
                    alt="Imagen adjunta" 
                    className="rounded-lg object-cover w-full h-full"
                    width={400}
                    height={300}
                    quality={100}
                    onError={() => {
                      console.log("Error cargando imagen de Cloudinary, usando fallback");
                      setImageLoaded(true);
                      setUseCloudinary(false);
                    }}
                    onLoad={() => setImageLoaded(true)}
                  />
                ) : message.mediaUrl && (message.mediaUrl.startsWith('data:') || message.mediaUrl.startsWith('blob:')) ? (
                  <CldImage 
                    src={message.mediaUrl}
                    alt="Imagen adjunta"
                    className="rounded-lg object-cover w-full h-auto max-h-[400px]"
                    width={400}
                    height={300}
                    quality={100}
                    onError={() => setImageLoaded(true)}
                    onLoad={() => setImageLoaded(true)}
                  />
                ) : (
                  <NextImage 
                    src={message.mediaUrl!} 
                    alt="Imagen adjunta"
                    className="rounded-lg object-cover w-full h-full"
                    width={400}
                    height={300}
                    quality={100}
                    unoptimized={true}
                    onLoad={() => setImageLoaded(true)}
                    onError={() => setImageLoaded(true)}
                  />
                )}
              </div>
            ) : (
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
  currentUserId = '',
  _userId,
  _isOpen,
  _onUserProfileClick,
  onBackClick,
  _onPlayAudio,
  fetchConversations,
}: PrivateChatWindowProps) => {
  const { data: session } = useSession();
  const { toast: _toast } = useToast();
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  
  // Estados y referencias para mensajes de voz
  const [showVoiceRecorder, setShowVoiceRecorder] = React.useState(false);
  const [recordingTime, setRecordingTime] = React.useState(0);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);
  const [currentPlayingAudio, setCurrentPlayingAudio] = React.useState<string | null>(null);

  // Hook de grabación de audio
  const { 
    isRecording, 
    startRecording, 
    stopRecording, 
    recordingTime: hookRecordingTime 
  } = useAudioRecorder();

  // Estado para manejar la imagen seleccionada
  const [_image, _setImage] = useState<File | null>(null);
  const [imagePreview, _setImagePreview] = useState<string | null>(null);
  const [_uploadProgress, _setUploadProgress] = useState(0);
  const [previewUseCloudinary, setPreviewUseCloudinary] = useState(true);

  // Usar el hook personalizado para manejar la lógica del chat
  const {
    messages,
    loading,
    error,
    hasMoreMessages: _hasMoreMessages,
    newMessageContent,
    sendingMessage,
    hasMutualFollow,
    imageToSend,
    uploadProgress: _uploadProgressChat,
    
    setNewMessageContent,
    handleSendMessage,
    handleImageChange,
    loadMoreMessages: _loadMoreMessages,
    handleScroll,
    
    messagesEndRef,
    messagesContainerRef,
    markNewMessageAsRead,
  } = useChatContent(conversation, conversationId);

  // Estado para controlar la carga de mensajes más antiguos
  const [loadingOlderMessages, setLoadingOlderMessages] = React.useState(false);

  // Estado para controlar la visibilidad del modal de gestión de chat privado
  const [isManagementModalOpen, setIsManagementModalOpen] = React.useState(false);

  // Función para cargar mensajes más antiguos
  const handleLoadMoreMessages = React.useCallback(async () => {
    setLoadingOlderMessages(true);
    try {
      // Guardar la posición de scroll actual para mantenerla después de cargar nuevos mensajes
      const scrollContainer = messagesContainerRef.current;
      const scrollHeight = scrollContainer?.scrollHeight || 0;
      const scrollTop = scrollContainer?.scrollTop || 0;
      
      // Llamar a la función de cargar más mensajes del hook
      await _loadMoreMessages();
      
      // Restaurar la posición de scroll (con un pequeño retraso para permitir el renderizado)
      setTimeout(() => {
        if (scrollContainer) {
          const newScrollHeight = scrollContainer.scrollHeight;
          const heightDifference = newScrollHeight - scrollHeight;
          scrollContainer.scrollTop = scrollTop + heightDifference;
        }
      }, 100);
    } catch (error) {
      console.error('Error al cargar mensajes más antiguos:', error);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [_loadMoreMessages, messagesContainerRef]);

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

  // Iniciar grabación de voz
  const handleStartVoiceRecording = React.useCallback(() => {
    setShowVoiceRecorder(true);
    startRecording();
  }, [startRecording]);

  // Función para enviar mensajes de voz
  const sendVoiceMessage = React.useCallback(async (blob: Blob) => {
    if (!conversationId || !otherUser?.id) {
      console.error('No se puede enviar mensaje: datos insuficientes', { conversationId, otherUserId: otherUser?.id });
      return { success: false, error: 'Datos insuficientes' };
    }
    
    try {
      // Crear URL para previsualización temporal
      const tempUrl = URL.createObjectURL(blob);
      
      // Crear ID temporal para el mensaje
      const tempId = `temp-${Date.now()}`;
      
      // Añadir mensaje temporal (optimista)
      const _tempMessage: Message = {
        id: tempId,
        tempId,
        conversationId,
        senderId: currentUserId,
        content: '',
        mediaUrl: tempUrl,
        messageType: 'voice',
        createdAt: new Date(),
        status: 'sending',
      };
      
      // Añadir a la UI de forma optimista
      
      // Subir el archivo
      const formData = new FormData();
      formData.append('file', blob, `voice-message-${Date.now()}.webm`);
      formData.append('type', 'audio');
      
      const uploadRes = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadRes.ok) {
        throw new Error('Error al subir el archivo de audio');
      }
      
      const { url: audioUrl } = await uploadRes.json();
      
      if (!audioUrl) {
        throw new Error('No se obtuvo URL del audio');
      }
      
      // Enviar el mensaje con la URL real
      const payload = {
        conversationId,
        content: '',
        mediaUrl: audioUrl,
        messageType: 'voice',
        receiverId: otherUser.id,
      };
      
      const result = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      if (!result.ok) {
        throw new Error(`Error al enviar mensaje: ${result.status}`);
      }
      
      return { success: true, messageId: tempId, finalUrl: audioUrl };
      
    } catch (error) {
      console.error('Error al enviar mensaje de voz:', error);
      _toast?.({
        title: "Error",
        description: "No se pudo enviar el mensaje de voz",
        variant: "destructive"
      });
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }, [conversationId, otherUser?.id, _toast, currentUserId]);

  // Detener grabación de voz y enviar
  const handleStopVoiceRecording = React.useCallback(async () => {
    if (!isRecording) return;
    
    const blob = await stopRecording();
    if (!blob) return;
    
    // Enviar el mensaje de voz
    await sendVoiceMessage(blob);
    
    setShowVoiceRecorder(false);
  }, [isRecording, stopRecording, sendVoiceMessage]);

  // Cancelar grabación de voz
  const handleCancelVoiceRecording = React.useCallback(() => {
    stopRecording();
    setShowVoiceRecorder(false);
  }, [stopRecording]);

  // Reproducir audio
  const handlePlayAudio = React.useCallback((audioUrl: string) => {
    if (!audioUrl) {
      console.error('URL de audio no válida');
      _toast?.({
        title: "Error",
        description: "No se puede reproducir este mensaje de voz",
        variant: "destructive"
      });
      return;
    }
    
    if (currentPlayingAudio === audioUrl) {
      // Detener reproducción actual
      if (audioRef.current) {
        audioRef.current.pause();
        setCurrentPlayingAudio(null);
      }
    } else {
      // Detener reproducción anterior
      if (audioRef.current) {
        audioRef.current.pause();
      }
      
      // Crear nuevo reproductor
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      
      // Configurar evento para cuando termine
      audio.onended = () => {
        setCurrentPlayingAudio(null);
      };
      
      // Iniciar reproducción
      audio.play().catch(error => {
        console.error('Error reproduciendo audio:', error);
        setCurrentPlayingAudio(null);
        _toast?.({
          title: "Error",
          description: "No se pudo reproducir el mensaje de voz",
          variant: "destructive"
        });
      });
      
      // Actualizar estado
      setCurrentPlayingAudio(audioUrl);
    }
  }, [currentPlayingAudio, _toast]);

  // Actualizar tiempo de grabación desde el hook
  React.useEffect(() => {
    setRecordingTime(hookRecordingTime);
  }, [hookRecordingTime]);

  // Efecto para marcar mensajes como leídos cuando se abren o llegan nuevos
  React.useEffect(() => {
    // Solo marcar mensajes si hay mensajes y no están en carga
    if (messages.length > 0 && !loading) {
      // Marcar todos los mensajes que no son del usuario actual
      const unreadMessages = messages.filter(
        msg => !msg.read && msg.senderId !== session?.user?.id && msg.id
      );
      
      // Marcar cada mensaje no leído
      unreadMessages.forEach(msg => {
        if (msg.id) {
          markNewMessageAsRead(msg.id, msg.senderId);
        }
      });
    }
  }, [messages, loading, session?.user?.id, markNewMessageAsRead]);

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
        <LoadingSpinner className="h-8 w-8" />
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
            className="mr-1" // Siempre visible (como en grupos)
            aria-label="Volver"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setIsManagementModalOpen(true)}
          className="ml-auto"
          aria-label="Configuración"
        >
          <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </Button>
      </div>

      {/* Modal de gestión de chat privado */}
      <PrivateChatManagementModal 
        isOpen={isManagementModalOpen}
        onClose={() => setIsManagementModalOpen(false)}
        conversationData={conversation}
        currentUserId={currentUserId || session?.user?.id || ''}
        onConversationDeleted={onBackClick}
        fetchConversations={fetchConversations}
      />
      
      {/* Contenedor de mensajes */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-white dark:bg-gray-900 px-4 pb-4"
        onScroll={handleScroll}
      >
        {/* Botón de cargar mensajes más antiguos */}
        {!loading && (
          <div className="sticky top-0 z-10 flex justify-center py-2 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            {loadingOlderMessages ? (
              <div className="flex justify-center p-2">
                <LoadingSpinner className="h-5 w-5" />
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLoadMoreMessages}
                className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Cargar mensajes anteriores
              </Button>
            )}
          </div>
        )}
        
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center">
            <div className="max-w-md p-4">
              <p className="text-gray-500 dark:text-gray-400">
                No hay mensajes aún. ¡Envía el primero!
              </p>
            </div>
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
                key={`${message.id || message.tempId || 'msg'}-${index}`}
                message={message}
                currentUserId={currentUserId || ''}
                otherUser={otherUser}
                showDateSeparator={showDateSeparator}
                currentUserImage={session?.user?.image || null}
                currentUserName={session?.user?.name || null}
                _onPlayAudio={_onPlayAudio ?? handlePlayAudio}
                index={index}
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
            {imagePreview && imagePreview.includes('cloudinary.com') && previewUseCloudinary ? (
              <CldImage 
                src={extractCloudinaryId(imagePreview)}
                alt="Vista previa" 
                className="max-h-40 max-w-full rounded-lg"
                width={150}
                height={150}
                quality={100}
                onError={() => {
                  console.log("Error cargando imagen de Cloudinary, usando fallback");
                  setPreviewUseCloudinary(false);
                }}
              />
            ) : imagePreview && (imagePreview.startsWith('data:') || imagePreview.startsWith('blob:')) ? (
              <CldImage 
                src={extractCloudinaryId(imagePreview)}
                alt="Vista previa" 
                className="max-h-40 max-w-full rounded-lg"
                width={150}
                height={150}
                quality={100}
                onError={() => {
                  console.log("Error cargando imagen de Cloudinary, usando fallback");
                  setPreviewUseCloudinary(false);
                }}
              />
            ) : (
              <NextImage 
                src={imagePreview} 
                alt="Vista previa" 
                className="max-h-40 max-w-full rounded-lg"
                width={150}
                height={150}
                quality={100}
                unoptimized={true}
              />
            )}
            <button
              onClick={() => handleImageChange(null)}
              className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white"
            >
              <X size={16} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* Reproductor de audio oculto */}
      <audio ref={audioRef} className="hidden" />
      
      {/* Grabación de voz (visible cuando showVoiceRecorder es true) */}
      {showVoiceRecorder && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-sm">Grabando: {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}</span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancelVoiceRecording}
                className="text-red-500"
              >
                Cancelar
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleStopVoiceRecording}
              >
                Enviar
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Mensaje de advertencia cuando no hay seguimiento mutuo */}
      {hasMutualFollow === false && (
        <div className="bg-amber-50 text-amber-800 p-3 rounded-lg mb-3 text-sm">
          <p>No puedes enviar mensajes a este usuario porque no os seguís mutuamente.</p>
        </div>
      )}

      {/* Formulario para enviar mensajes */}
      <div className="p-3 border-t flex flex-col">

        {/* Input y botones para enviar mensajes */}
        <div className="flex items-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={openFileSelector}
            className="h-10 w-10 flex-shrink-0"
            disabled={sendingMessage || showVoiceRecorder || hasMutualFollow === false}
          >
            <ImageIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </Button>
          
          {/* Botón de micrófono */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleStartVoiceRecording}
            className="h-10 w-10 flex-shrink-0"
            disabled={sendingMessage || showVoiceRecorder || hasMutualFollow === false}
          >
            <Mic className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </Button>
          
          <div className="flex-1 relative">
            <Textarea
              value={newMessageContent}
              onChange={handleTextChange}
              placeholder={hasMutualFollow === false ? "No podéis enviaros mensajes si no os seguís mutuamente" : "Escribe un mensaje..."}
              className="resize-none min-h-[40px] max-h-[120px] py-2 pr-10"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={sendingMessage || showVoiceRecorder || hasMutualFollow === false}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSendMessage}
              className="absolute right-2 bottom-1 h-8 w-8"
              disabled={(!newMessageContent.trim() && !imageToSend) || sendingMessage || showVoiceRecorder || hasMutualFollow === false}
            >
              {sendingMessage ? (
                <LoadingSpinner className="h-4 w-4" showText={false} />
              ) : (
                <ArrowUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
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
