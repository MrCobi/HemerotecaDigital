"use client";
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
// Importar los iconos directamente desde Lucide React para mejor compatibilidad
import { ArrowLeft, ArrowUp, Image as ImageIcon, Settings, X, Mic, Play, Pause, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import { useToast } from '@/src/app/components/ui/use-toast';
import { Message, User, ConversationData } from '@/src/app/messages/types';
import NextImage from 'next/image';
import { CldImage } from 'next-cloudinary';
import { Dialog, DialogContent, DialogTitle } from "@/src/app/components/ui/dialog";

// Importar el hook personalizado
import { useChatContent } from '@/src/app/messages/hooks/useChatContent';
import useAudioRecorder from '@/src/hooks/useAudioRecorder';
import AudioPlayer from './AudioPlayer';

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
  currentUserName,
  onPlayAudio,
  index
}: {
  message: Message;
  currentUserId: string;
  otherUser: User | null;
  showDateSeparator: boolean;
  currentUserImage: string | null;
  currentUserName: string | null;
  onPlayAudio: (url: string) => void;
  index: number;
}) => {
  const isCurrentUser = message.senderId === currentUserId;
  const messageDate = new Date(message.createdAt);
  
  // Estado para manejar el modal de la imagen
  const [isImageOpen, setIsImageOpen] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [useCloudinary, setUseCloudinary] = React.useState(true);

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
  const isImageMessage = message.messageType === 'image' && message.mediaUrl;

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
              <>
                <div className="mb-2 relative group">
                  <div
                    className={`relative overflow-hidden rounded-lg cursor-pointer ${
                      !imageLoaded ? 'bg-gray-200 dark:bg-gray-700 animate-pulse h-[150px]' : ''
                    }`}
                    onClick={() => setIsImageOpen(true)}
                  >
                    {message.mediaUrl && message.mediaUrl.includes('cloudinary.com') && useCloudinary ? (
                      <CldImage 
                        src={extractCloudinaryId(message.mediaUrl)}
                        alt="Imagen adjunta" 
                        className={`max-w-full rounded-lg transition-all duration-200 ${
                          imageLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                        } group-hover:scale-[1.02] transform`}
                        width={300}
                        height={200}
                        loading="lazy"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => {
                          console.log("Error cargando imagen de Cloudinary, usando fallback");
                          setImageLoaded(true);
                          setUseCloudinary(false);
                        }}
                      />
                    ) : (
                      <NextImage 
                        src={message.mediaUrl!} 
                        alt="Imagen adjunta" 
                        className={`max-w-full rounded-lg transition-all duration-200 ${
                          imageLoaded ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
                        } group-hover:scale-[1.02] transform`}
                        width={300}
                        height={200}
                        loading="lazy"
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageLoaded(true)}
                      />
                    )}
                    {imageLoaded && (
                      <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-200 rounded-lg"></div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <div className="bg-black bg-opacity-50 text-white py-1 px-3 rounded-full text-xs">
                        Ver imagen
                      </div>
                    </div>
                  </div>
                </div>
                
                {isImageOpen && (
                  <Dialog open={isImageOpen} onOpenChange={setIsImageOpen}>
                    <DialogTitle className="sr-only">Ver imagen</DialogTitle>
                    <DialogContent className="p-0 max-w-4xl w-full bg-transparent border-none shadow-none">
                      <div className="relative w-full h-full">
                        {message.mediaUrl && message.mediaUrl.includes('cloudinary.com') && useCloudinary ? (
                          <CldImage
                            src={extractCloudinaryId(message.mediaUrl)}
                            alt="Imagen ampliada"
                            className="object-contain rounded-lg max-h-[80vh]"
                            width={1200}
                            height={900}
                            quality={90}
                            onError={() => setUseCloudinary(false)}
                          />
                        ) : (
                          <NextImage
                            src={message.mediaUrl!}
                            alt="Imagen ampliada"
                            className="object-contain rounded-lg max-h-[80vh]"
                            width={1200}
                            height={900}
                            quality={100}
                          />
                        )}
                        <button
                          onClick={() => setIsImageOpen(false)}
                          className="absolute top-2 right-2 bg-black bg-opacity-50 text-white rounded-full p-2 hover:bg-opacity-70 transition-all"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </>
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
  currentUserId,
  _onUserProfileClick,
  onBackClick,
  onSettingsClick,
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
  const [image, setImage] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = React.useState(0);
  const [previewUseCloudinary, setPreviewUseCloudinary] = React.useState(true);

  // Usar el hook personalizado para manejar la lógica del chat
  const {
    messages,
    loading,
    error,
    hasMoreMessages: _hasMoreMessages,
    newMessageContent,
    sendingMessage,
    imageToSend,
    uploadProgress: _uploadProgress,
    
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

  // Iniciar grabación de voz
  const handleStartVoiceRecording = React.useCallback(() => {
    setShowVoiceRecorder(true);
    startRecording();
  }, [startRecording]);

  // Función para enviar mensajes de voz
  const sendVoiceMessage = async (blob: Blob) => {
    if (!conversationId) return;
    
    // Verificar si es una conversación de grupo o privada
    const isGroup = conversationId.startsWith('group_');
    console.log('Enviando mensaje de voz a:', { conversationId, isGroup });
    
    try {
      // Crear URL para mostrar temporalmente mientras se envía
      const tempUrl = URL.createObjectURL(blob);
      
      // Crear un ID temporal único para este mensaje
      const tempId = `temp-${Date.now()}`;
      
      // Añadir mensaje optimista a la interfaz
      const tempMessage: Message = {
        tempId,
        content: '',
        mediaUrl: tempUrl,
        senderId: currentUserId || '',
        createdAt: new Date(),
        status: 'sending',
        messageType: 'voice'
      };
      
      // Crear FormData para subir el archivo
      const formData = new FormData();
      formData.append('file', blob, 'voice-message.webm');
      
      // 1. Subir el archivo de audio a Cloudinary
      console.log('Subiendo audio a Cloudinary...');
      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Error al cargar el archivo de audio: ${uploadResponse.statusText}`);
      }
      
      const { url: audioUrl } = await uploadResponse.json();
      console.log('Audio subido con éxito:', audioUrl);
      
      if (!audioUrl) {
        throw new Error('No se recibió URL del servidor');
      }
      
      // 2. Construir el payload según el tipo de conversación
      const messagePayload: any = {
        conversationId,
        messageType: 'voice',
        mediaUrl: audioUrl,
        content: 'Mensaje de voz', // Contenido descriptivo para fallbacks
        tempId // Incluir el ID temporal para actualizar el estado optimista
      };
      
      // Para conversaciones privadas, agregar receiverId
      if (!isGroup && otherUser?.id) {
        messagePayload.receiverId = otherUser.id;
      }
      
      console.log('Enviando mensaje con payload:', messagePayload);
      
      // Enviar el mensaje con la URL del audio
      const messageResponse = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(messagePayload),
      });
      
      if (!messageResponse.ok) {
        const errorText = await messageResponse.text();
        throw new Error(`Error al enviar mensaje de voz (${messageResponse.status}): ${errorText}`);
      }
      
      console.log('Mensaje de voz enviado con éxito');
      
      // Aquí podríamos actualizar el estado del mensaje con la respuesta del servidor
      
    } catch (error) {
      console.error('Error al enviar mensaje de voz:', error);
      _toast?.({
        title: "Error",
        description: "No se pudo enviar el mensaje de voz",
        variant: "destructive"
      });
    }
  };

  // Detener grabación de voz y enviar
  const handleStopVoiceRecording = React.useCallback(async () => {
    if (!isRecording) return;
    
    const blob = await stopRecording();
    if (!blob) return;
    
    // Enviar el mensaje de voz
    await sendVoiceMessage(blob);
    
    setShowVoiceRecorder(false);
  }, [isRecording, stopRecording]);

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
        {onSettingsClick && (
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSettingsClick}
            className="ml-auto"
            aria-label="Configuración"
          >
            <Settings className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
                key={message.id || message.tempId || index}
                message={message}
                currentUserId={currentUserId || ''}
                otherUser={otherUser}
                showDateSeparator={showDateSeparator}
                currentUserImage={session?.user?.image || null}
                currentUserName={session?.user?.name || null}
                onPlayAudio={handlePlayAudio}
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
              />
            )}
            <button
              onClick={() => handleImageChange(null)}
              className="absolute top-1 right-1 bg-gray-800 bg-opacity-70 rounded-full p-1 text-white"
            >
              <X size={16} className="text-white" />
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
      
      {/* Formulario para enviar mensajes */}
      <div className="p-3 border-t flex flex-col">
        {/* Vista previa de imagen seleccionada */}
        {imagePreview && (
          <div className="mb-2">
            <div className="relative w-24 h-24 rounded overflow-hidden">
              {imagePreview && imagePreview.includes('cloudinary.com') && previewUseCloudinary ? (
                <CldImage
                  src={extractCloudinaryId(imagePreview)}
                  alt="Preview"
                  fill
                  style={{ objectFit: 'cover' }}
                  onError={() => {
                    console.log("Error cargando imagen de Cloudinary, usando fallback");
                    setPreviewUseCloudinary(false);
                  }}
                />
              ) : (
                <NextImage
                  src={imagePreview}
                  alt="Preview"
                  fill
                  style={{ objectFit: 'cover' }}
                />
              )}
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
            disabled={sendingMessage || showVoiceRecorder}
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
            disabled={sendingMessage || showVoiceRecorder}
          >
            <Mic className="h-5 w-5 text-blue-600 dark:text-blue-400" />
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
              disabled={sendingMessage || showVoiceRecorder}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleSendMessage}
              className="absolute right-2 bottom-1 h-8 w-8"
              disabled={(!newMessageContent.trim() && !imageToSend) || sendingMessage || showVoiceRecorder}
            >
              {sendingMessage ? (
                <LoadingSpinner className="h-4 w-4" />
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
