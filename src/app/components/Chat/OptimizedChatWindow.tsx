"use client";
import * as React from 'react';
import { useSession } from 'next-auth/react';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Button } from '@/src/app/components/ui/button';
import { Textarea } from '@/src/app/components/ui/textarea';
// Importar los iconos directamente desde Lucide React para mejor compatibilidad
import { ArrowLeft, ArrowUp, Image as ImageIcon, Settings, X, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';
import { Message, User, ConversationData } from '@/src/app/messages/types';
import NextImage from 'next/image';
import { CldImage } from 'next-cloudinary';
// Importar el hook personalizado
import { useChatContent } from '@/src/app/messages/hooks/useChatContent';
import useAudioRecorder from '@/src/hooks/useAudioRecorder';
import AudioPlayer from './AudioPlayer';

type OptimizedChatWindowProps = {
  conversation: ConversationData | null;
  conversationId: string | null;
  className?: string;
  currentUserId?: string;
  _userId?: string;
  _isOpen?: boolean;
  _onUserProfileClick?: (user: User) => void;
  onBackClick?: () => void;
  onSettingsClick?: () => void;
  _onPlayAudio?: (url: string) => void;
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
const MessageItem = React.memo(({ 
  message, 
  currentUserId, 
  otherUser, 
  conversation,
  currentUserImage,
  currentUserName,
  _onPlayAudio,
  index
}: {
  message: Message;
  currentUserId: string;
  otherUser: User | null;
  conversation: ConversationData | null;
  showDateSeparator: boolean;
  currentUserImage: string | null;
  currentUserName: string | null;
  _onPlayAudio: (url: string) => void;
  index: number;
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
  
  // Determinar si es un mensaje de voz o imagen
  const isVoiceMessage = message.messageType === 'voice';
  const _isImageMessage = message.messageType === 'image';
  
  // Verificar si realmente tenemos una URL de imagen
  const hasValidMediaUrl = React.useMemo(() => {
    if (!message.mediaUrl) return false;
    
    // Si es un Data URL (mensaje temporal), considerarlo válido
    if (message.mediaUrl.startsWith('data:') || message.mediaUrl.startsWith('blob:')) return true;
    
    // Para URLs normales, comprobar que sea una string no vacía
    return message.mediaUrl.trim().length > 0;
  }, [message.mediaUrl]);

  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  
  // Función auxiliar para extraer ID de Cloudinary si es necesario
  const getCloudinaryId = (url: string): string => {
    if (!url) return '';
    
    // Verificar si es una URL de Cloudinary
    if (url.includes('cloudinary.com')) {
      const match = url.match(/\/upload\/(?:v\d+\/)?(.+)$/);
      return match ? match[1] : '';
    }
    return '';
  };
  
  // Determinar si usar Cloudinary para renderizado
  const isCloudinaryUrl = message.mediaUrl?.includes('cloudinary.com');
  const [useCloudinary, setUseCloudinary] = React.useState(isCloudinaryUrl);
  
  // Determinar si es una URL relativa o absoluta
  const getImageUrl = (url: string): string => {
    if (!url) return '';
    
    // Si ya es una URL completa (http/https o data:)
    if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    
    // Si es una ruta relativa, convertirla en absoluta
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };
  
  return (
    <>
      <div
        key={`${message.id || message.tempId || 'msg'}-${index}`}
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
            {/* Contenido del mensaje según su tipo */}
            {isVoiceMessage ? (
              <div className="voice-message min-w-[200px]">
                <AudioPlayer 
                  audioUrl={message.mediaUrl || ''}
                  messageId={message.id || message.tempId || `msg-${index}`}
                  isSender={isCurrentUser}
                  className={isCurrentUser ? 'text-white' : ''}
                />
              </div>
            ) : hasValidMediaUrl ? (
              <div className="relative rounded-lg overflow-hidden max-w-[300px] min-w-[150px] max-h-[400px]">
                {!imageLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800">
                    <LoadingSpinner className="h-6 w-6 animate-spin text-gray-500" />
                  </div>
                )}
                
                {message.mediaUrl && message.mediaUrl.includes('cloudinary.com') && useCloudinary ? (
                  <CldImage 
                    src={getCloudinaryId(message.mediaUrl)}
                    alt="Imagen adjunta" 
                    className="rounded-lg object-cover w-full h-full"
                    width={400}
                    height={400}
                    crop="limit"
                    onLoad={() => setImageLoaded(true)}
                    onError={() => {
                      console.error('Error loading Cloudinary image, falling back to standard image');
                      setUseCloudinary(false);
                      setImageError(true);
                    }}
                  />
                ) : (
                  <div className="relative rounded-lg overflow-hidden max-w-[300px] min-h-[150px]">
                    {/* Usar img nativa para blob URLs y NextImage para URLs regulares */}
                    {message.mediaUrl && (message.mediaUrl.startsWith('data:') || message.mediaUrl.startsWith('blob:')) ? (
                      <NextImage 
                        src={message.mediaUrl}
                        alt="Imagen adjunta" 
                        className="rounded-lg object-cover w-full h-auto max-h-[400px]"
                        width={400}
                        height={400}
                        quality={100}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => {
                          console.error('Error loading image:', message.mediaUrl);
                          setImageLoaded(false);
                          setImageError(true);
                        }}
                      />
                    ) : (
                      <NextImage 
                        src={getImageUrl(message.mediaUrl ?? '')}
                        alt="Imagen adjunta" 
                        className="rounded-lg object-cover"
                        width={400}
                        height={400}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => {
                          console.error('Error loading image:', message.mediaUrl);
                          setImageLoaded(false);
                          setImageError(true);
                        }}
                      />
                    )}
                    {imageError && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-800 p-2 text-center">
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          No se pudo cargar la imagen
                        </span>
                      </div>
                    )}
                  </div>
                )}
                
                {message.status === 'sending' && (
                  <div className="absolute bottom-2 right-2 bg-black/50 rounded-full p-1">
                    <LoadingSpinner className="h-4 w-4 animate-spin text-white" />
                  </div>
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

MessageItem.displayName = 'MessageItem';

// Componente principal de la ventana de chat
const OptimizedChatWindow = ({
  conversation,
  conversationId,
  className,
  currentUserId = '',
  _userId,
  _isOpen,
  _onUserProfileClick,
  onBackClick,
  onSettingsClick,
  _onPlayAudio,
}: OptimizedChatWindowProps) => {
  const { data: session } = useSession();
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
    
    setNewMessageContent,
    handleSendMessage: originalHandleSendMessage,
    handleImageChange,
    loadMoreMessages: _loadMoreMessages,
    handleScroll: _handleScroll,
    
    messagesEndRef,
    messagesContainerRef,
    markAllMessagesAsRead,
  } = useChatContent(conversation, conversationId);

  // Extraer el otherUser del conversation
  const otherUser = conversation?.participants.find(p => p.userId !== currentUserId)?.user || null;

  // Referencia para controlar si es la primera carga
  const isFirstLoadRef = React.useRef(true);
  
  // Estado local para la información de la conversación actual
  const [localConversationData, setLocalConversationData] = React.useState<ConversationData | null>(conversation);
  
  // Estado para forzar actualizaciones específicas en la UI
  const [_forceUpdate, setForceUpdate] = React.useState(0);
  
  // Referencia para almacenar el último ID de conversación procesado
  const lastProcessedConversationRef = React.useRef<string | null>(null);
  
  // Efecto para mantener sincronizada la información de la conversación actual
  React.useEffect(() => {
    if (conversation) {
      // Forzar una actualización completa del estado con un nuevo objeto
      setLocalConversationData(prevData => {
        // Si los datos son iguales, no actualizar para evitar renderizados innecesarios
        if (prevData?.id === conversation.id && 
            prevData?.name === conversation.name && 
            prevData?.description === conversation.description) {
          return prevData;
        }
        
        // Crear un nuevo objeto para forzar la re-renderización
        const updatedData = {...conversation};
        console.log("[OptimizedChatWindow] Datos de conversación actualizados:", updatedData);
        return updatedData;
      });
    }
  }, [conversation]);
  
  // Forzar un scroll suave al final (para conversaciones de grupo)
  const forceMultipleScrollAttempts = React.useCallback((targetConversationId: string | undefined) => {
    if (!targetConversationId?.startsWith('group_')) return;
    
    // Primer intento: scrollIntoView con behavior smooth
    setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
    
    // Segundo intento: scrollTo con animación
    setTimeout(() => {
      if (messagesContainerRef.current) {
        const container = messagesContainerRef.current;
        const targetScrollTop = container.scrollHeight - container.clientHeight;
        
        // Implementar scroll suave manual para mayor control
        const startPosition = container.scrollTop;
        const distance = targetScrollTop - startPosition;
        const duration = 300; // duración en ms
        let startTime: number | null = null;
        
        // Función de animación de scroll
        const scrollAnimation = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const elapsed = timestamp - startTime;
          const progress = Math.min(elapsed / duration, 1);
          
          // Función de easing para movimiento más natural
          const easeInOutQuad = (t: number) => 
            t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          
          if (container) {
            container.scrollTop = startPosition + distance * easeInOutQuad(progress);
            
            if (progress < 1) {
              requestAnimationFrame(scrollAnimation);
            }
          }
        };
        
        // Iniciar animación
        requestAnimationFrame(scrollAnimation);
      }
    }, 350);
  }, [messagesEndRef, messagesContainerRef]);
  
  // Escuchar eventos de actualización de grupo en tiempo real
  React.useEffect(() => {
    if (!conversationId || !conversationId.startsWith('group_')) return;
    
    const handleGroupUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { conversationId: updatedGroupId, updateType, data } = customEvent.detail;
      
      // Solo actualizar si es este grupo
      if (updatedGroupId !== conversationId) return;
      
      console.log(`[OptimizedChatWindow] Recibido evento de grupo: ${updateType}`, data);
      
      // Para cambios importantes, forzar una actualización completa desde el servidor
      if (updateType === 'group_updated' || updateType === 'participants_added' || 
          updateType === 'participant_removed' || updateType === 'participant_left') {
        
        // Primero actualizamos el estado local para una respuesta inmediata
        setLocalConversationData(prevData => {
          if (!prevData) return prevData;
          
          // Crear copia para modificar
          const updatedData = {...prevData};
          
          // Actualizar según el tipo de evento
          if (updateType === 'group_updated') {
            // Actualizar propiedades básicas del grupo
            if (data.name) updatedData.name = data.name;
            if (data.description) updatedData.description = data.description;
            if (data.imageUrl) updatedData.imageUrl = data.imageUrl;
            console.log('[OptimizedChatWindow] Grupo actualizado localmente:', {
              nombre: updatedData.name,
              descripcion: updatedData.description?.substring(0, 20) + '...',
              imagen: updatedData.imageUrl ? 'Presente' : 'No disponible'
            });
          } 
          else if (updateType === 'participants_added') {
            // Procesamiento existente para añadir participantes...
            if (Array.isArray(data)) {
              const existingParticipantIds = new Set(updatedData.participants.map(p => p.userId));
              
              const newParticipantsToAdd = data
                .filter(userId => !existingParticipantIds.has(userId))
                .map(userId => ({
                  id: `temp_participant_${userId}`,
                  userId,
                  user: { 
                    id: userId,
                    name: 'Usuario Añadido',
                    email: '',
                    emailVerified: null,
                    image: null
                  },
                  role: 'member' as const
                }));
              
              if (newParticipantsToAdd.length > 0) {
                updatedData.participants = [...updatedData.participants, ...newParticipantsToAdd];
                console.log(`[OptimizedChatWindow] ${newParticipantsToAdd.length} participantes añadidos localmente, total: ${updatedData.participants.length}`);
              }
            } 
            else if (data.participants && Array.isArray(data.participants)) {
              const existingParticipantIds = new Set(updatedData.participants.map(p => p.userId));
              const newParticipants = data.participants.filter((p: { userId: string }) => 
                !existingParticipantIds.has(p.userId)
              );
              
              if (newParticipants.length > 0) {
                updatedData.participants = [...updatedData.participants, ...newParticipants];
              }
            }
          } 
          else if (updateType === 'participant_removed' || updateType === 'participant_left') {
            const participantIdToRemove = data.userId;
            
            const participantExists = updatedData.participants.some(p => p.userId === participantIdToRemove);
            
            if (participantExists) {
              updatedData.participants = updatedData.participants.filter(
                p => p.userId !== participantIdToRemove
              );
              console.log(`[OptimizedChatWindow] Participante eliminado localmente, total: ${updatedData.participants.length}`);
            }
          }
          
          return updatedData;
        });
        
        // Después de la actualización local, forzar una actualización desde el servidor
        if (conversationId.startsWith('group_')) {
          const groupId = conversationId.replace('group_', '');
          console.log(`[OptimizedChatWindow] Forzando actualización desde servidor para grupo: ${groupId}`);
          
          // Actualizar directamente desde la API para obtener datos completos y actualizados
          fetch(`/api/messages/group/${groupId}`)
            .then(response => {
              if (response.ok) return response.json();
              throw new Error('Error fetching updated group data');
            })
            .then(updatedGroupData => {
              // Asegurar que tiene el prefijo correcto
              if (updatedGroupData && !updatedGroupData.id.startsWith('group_')) {
                updatedGroupData.id = `group_${updatedGroupData.id}`;
              }
              
              console.log('[OptimizedChatWindow] Datos actualizados recibidos del servidor:', {
                nombre: updatedGroupData.name,
                descripcion: updatedGroupData.description?.substring(0, 20) + '...',
                participantes: updatedGroupData.participants?.length || 0
              });
              
              // IMPORTANTE: Usar un setTimeout para asegurar que esta actualización tenga prioridad
              // sobre cualquier otra actualización pendiente
              setTimeout(() => {
                // Forzar actualización de la UI con los datos del servidor
                setLocalConversationData(updatedGroupData);
                // Forzar renderizado (clave React)
                setForceUpdate(prev => prev + 1);
              }, 50);
            })
            .catch(error => {
              console.error('[OptimizedChatWindow] Error al actualizar desde servidor:', error);
            });
        }
      }
      else if (updateType === 'group_deleted') {
        console.log('[OptimizedChatWindow] El grupo ha sido eliminado');
        // Opcional: redireccionar al usuario
      }
    };
    
    // Escuchar el evento personalizado
    window.addEventListener('group-data-updated', handleGroupUpdate);
    
    return () => {
      window.removeEventListener('group-data-updated', handleGroupUpdate);
    };
  }, [conversationId]);
  
  // Función para desplazarse al final del chat
  const scrollToBottom = React.useCallback((behavior: ScrollBehavior = 'auto') => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior });
    }
  }, [messagesEndRef]);

  // Aplicar forzado de scroll después de enviar un mensaje
  const _handleAfterSendMessage = React.useCallback(() => {
    if (conversationId?.startsWith('group_')) {
      setTimeout(() => forceMultipleScrollAttempts(conversationId), 100);
    }
  }, [conversationId, forceMultipleScrollAttempts]);

  // Modificar la función de envío original para incluir el scroll forzado
  const _originalHandleSendMessage = originalHandleSendMessage;
  const handleSendMessage = React.useCallback(() => {
    _originalHandleSendMessage();
    _handleAfterSendMessage();
  }, [_originalHandleSendMessage, _handleAfterSendMessage]);

  // Efecto para asegurar scroll al último mensaje al abrir la conversación o cambiar de conversación
  React.useEffect(() => {
    if (messages.length > 0) {
      // Scroll sin importar si es primera carga o no
      setTimeout(() => {
        scrollToBottom('auto');
        // Ya no es la primera carga después del primer scroll
        isFirstLoadRef.current = false;
      }, 300); // Aumentar a 300ms para dar más tiempo
    }
  }, [conversationId, messages.length, scrollToBottom]);

  // Efecto para manejar nuevos mensajes y hacer scroll automático
  React.useEffect(() => {
    if (!messagesContainerRef.current || messages.length === 0) return;
    
    // Determinar si es una conversación grupal por el ID
    const isGroupConversation = conversationId?.startsWith('group_');
    
    // Para conversaciones de grupo, siempre hacer scroll al final
    if (isGroupConversation) {
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 300);
      return;
    }
    
    // Para conversaciones privadas, solo hacer scroll si estaba cerca del final
    const container = messagesContainerRef.current;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
    
    if (isNearBottom || isFirstLoadRef.current) {
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 300);
    }
  }, [messages, conversationId, messagesContainerRef, scrollToBottom]);

  // Efecto para hacer scroll forzado en conversaciones de grupo
  React.useEffect(() => {
    if (conversationId?.startsWith('group_') && messages.length > 0) {
      forceMultipleScrollAttempts(conversationId);
    }
  }, [conversationId, messages.length, forceMultipleScrollAttempts]);

  // Resetear la referencia de primera carga cuando cambia la conversación
  React.useEffect(() => {
    isFirstLoadRef.current = true;
  }, [conversationId]);

  // Efecto para marcar mensajes como leídos inmediatamente al montar el componente
  React.useEffect(() => {
    // Solo ejecutar si hay un ID de conversación, no estamos cargando y hay mensajes
    if (conversationId && !loading && messages.length > 0) {
      // Verificar si ya procesamos esta conversación
      const isSameConversation = lastProcessedConversationRef.current === conversationId;
      
      // Solo continuar si es la carga inicial o una nueva conversación
      if (isFirstLoadRef.current || !isSameConversation) {
        console.log(`[OptimizedChatWindow] Procesando nueva conversación: ${conversationId}, isInitial=${isFirstLoadRef.current}`);
        
        // Actualizar el estado de inicialización y la última conversación procesada
        isFirstLoadRef.current = false;
        lastProcessedConversationRef.current = conversationId;
        
        // Usar markAllMessagesAsRead en lugar de procesar cada mensaje individualmente
        // Esto evita la sobrecarga de peticiones HTTP que causa el error "net::ERR_INSUFFICIENT_RESOURCES"
        markAllMessagesAsRead();
        
        // Notificar a través de un evento que se ha leído la conversación
        const event = new CustomEvent('conversation-read', {
          detail: { conversationId }
        });
        window.dispatchEvent(event);
        
        console.log(`[OptimizedChatWindow] Primera carga completada para conversación: ${conversationId}`);
      } else {
        console.log(`[OptimizedChatWindow] Evitando procesamiento duplicado para conversación: ${conversationId}`);
      }
    }
    
    // Limpieza del efecto - solo reiniciar cuando cambia realmente la conversación
    return () => {
      if (conversationId && conversationId !== lastProcessedConversationRef.current) {
        console.log(`[OptimizedChatWindow] Limpiando efecto para nueva conversación: ${conversationId} (anterior: ${lastProcessedConversationRef.current})`);
        isFirstLoadRef.current = true;
      }
    };
  }, [conversationId, loading, messages, markAllMessagesAsRead]);
  
  // Efecto adicional para manejar actualizaciones de unreadCount
  React.useEffect(() => {
    // Función para actualizar la lista de conversaciones cuando se marca como leída
    const handleConversationRead = (event: CustomEvent) => {
      const { conversationId: readConversationId } = event.detail;
      if (readConversationId === conversationId) {
        // Podemos disparar un evento para recargar la lista de conversaciones si es necesario
        // O implementar alguna lógica específica del componente
        console.log('[OptimizedChatWindow] Conversación marcada como leída:', readConversationId);
      }
    };

    // Registrar listener para el evento conversation-read
    window.addEventListener('conversation-read', handleConversationRead as EventListener);
    
    return () => {
      window.removeEventListener('conversation-read', handleConversationRead as EventListener);
    };
  }, [conversationId]);

  // Iniciar grabación de voz
  const handleStartVoiceRecording = React.useCallback(() => {
    setShowVoiceRecorder(true);
    startRecording();
  }, [startRecording]);

  // Función para enviar mensajes de voz
  const sendVoiceMessage = React.useCallback(async (blob: Blob) => {
    if (!conversationId) return;
    
    // Crear un ID temporal único para este mensaje
    const tempId = `temp-${Date.now()}`;
    let tempUrl: string | null = null;
    
    try {
      // Crear URL para mostrar temporalmente mientras se envía
      tempUrl = URL.createObjectURL(blob);
      
      // Añadir mensaje optimista a la interfaz
      const tempMessage: Message = {
        id: tempId,
        tempId,
        content: '',
        mediaUrl: tempUrl,
        senderId: currentUserId,
        createdAt: new Date(),
        status: 'sending',
        messageType: 'voice',
        // Añadir información del remitente para mostrar correctamente en la UI
        sender: {
          id: currentUserId,
          name: session?.user?.name || '',
          username: session?.user?.username || '',
          image: session?.user?.image || null
        }
      };
      
      // IMPORTANTE: Añadir el mensaje a la lista de mensajes antes de enviarlo
      // Esto hará que aparezca inmediatamente en la interfaz
      const messagesContainer = document.querySelector('.messages-container');
      if (messagesContainer) {
        // Crear nueva entrada para el mensaje
        const messageDiv = document.createElement('div');
        messageDiv.className = `flex mb-4 ${currentUserId === tempMessage.senderId ? 'justify-end' : 'justify-start'}`;
        messageDiv.dataset.messageId = tempId;
        
        // Crear el contenido del mensaje según sea un remitente o un receptor
        messageDiv.innerHTML = `
          <div class="flex-shrink-0 ml-auto">
            <div class="bg-blue-500 text-white rounded-l-lg rounded-tr-lg p-2 max-w-[240px]">
              <div class="voice-message min-w-[200px]">
                <audio src="${tempUrl}" controls class="max-w-[200px] voice-message-player"></audio>
              </div>
            </div>
          </div>
        `;
        
        // Añadir al contenedor de mensajes y hacer scroll
        messagesContainer.appendChild(messageDiv);
        setTimeout(() => scrollToBottom('smooth'), 50);
      }
      
      // Crear FormData para subir el archivo
      const formData = new FormData();
      formData.append('file', blob, 'voice-message.webm');
      formData.append('type', 'audio');
      
      // 1. Subir el archivo de audio a Cloudinary
      const uploadResponse = await fetch('/api/messages/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error(`Error al cargar el archivo de audio: ${uploadResponse.statusText}`);
      }
      
      const { url: audioUrl } = await uploadResponse.json();
      
      if (!audioUrl) {
        throw new Error('No se recibió URL del servidor');
      }
      
      // 2. Construir el payload según el tipo de conversación
      const messagePayload: {
        conversationId: string | null;
        content?: string;
        mediaUrl?: string;
        messageType: 'voice';
        tempId?: string;
        receiverId?: string;
      } = {
        conversationId,
        messageType: 'voice',
        mediaUrl: audioUrl,
        tempId: tempId,
      };
      
      // Si es conversación privada, agregar el receiverId
      if (otherUser?.id) {
        messagePayload.receiverId = otherUser.id;
      }
      
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
      
      // Actualizar el mensaje temporal con la URL real
      const audioElement = document.querySelector(`[data-message-id="${tempId}"] audio`) as HTMLAudioElement | null;
      if (audioElement && audioUrl) {
        // Guardar la posición de reproducción actual
        const currentTime = audioElement.currentTime;
        const wasPlaying = !audioElement.paused;
        
        // Actualizar la fuente del audio
        audioElement.src = audioUrl;
        
        // Restaurar la posición de reproducción
        audioElement.currentTime = currentTime;
        
        // Si estaba reproduciéndose, continuar la reproducción
        if (wasPlaying) {
          audioElement.play().catch(err => console.error('Error al reanudar reproducción:', err));
        }
        
        // Actualizar la clase para mostrar que ya no está en estado "enviando"
        const messageContainer = document.querySelector(`[data-message-id="${tempId}"]`);
        if (messageContainer) {
          messageContainer.classList.remove('sending');
          messageContainer.classList.add('sent');
        }
      }
    } catch (error) {
      console.error('Error al enviar mensaje de voz:', error);
      
      // Manejo de errores - asegurándonos de que tempId está disponible
      const messageElement = document.querySelector(`[data-message-id="${tempId}"]`);
      if (messageElement) {
        messageElement.classList.add('error');
        // Opcional: añadir icono de error o mensaje
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-xs text-red-500 mt-1';
        errorDiv.textContent = 'Error al enviar. Inténtalo de nuevo.';
        messageElement.appendChild(errorDiv);
      }
      
      // Liberar recursos si hay error
      if (tempUrl) {
        URL.revokeObjectURL(tempUrl);
      }
    }
  }, [conversationId, currentUserId, otherUser, session, scrollToBottom]);

  // Detener grabación de voz y enviar
  const handleStopVoiceRecording = React.useCallback(async () => {
    if (!isRecording) return;
    
    const blob = await stopRecording();
    if (!blob) return;
    
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
      });
      
      // Actualizar estado
      setCurrentPlayingAudio(audioUrl);
    }
  }, [currentPlayingAudio]);

  // Actualizar tiempo de grabación desde el hook
  React.useEffect(() => {
    setRecordingTime(hookRecordingTime);
  }, [hookRecordingTime]);

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
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

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
        </div>
      </div>
    );
  }

  // Mostrar un indicador de carga si está cargando y no hay mensajes
  if (loading && !messages.length) {
    return (
      <div className={cn("flex flex-col h-full justify-center items-center p-4", className)}>
        <LoadingSpinner className="h-8 w-8" />

      </div>
    );
  }

  // Renderizar la interfaz principal de chat
  return (
    <div className={cn("flex flex-col h-full bg-white dark:bg-gray-950", className)}>
      {/* Cabecera del chat con información del usuario/grupo */}
      <div className="p-3 border-b flex items-center justify-between gap-3 bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-center space-x-3">
          {onBackClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onBackClick}
              className="mr-1"
              aria-label="Volver"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Button>
          )}
          <Avatar className="h-10 w-10">
            {localConversationData?.isGroup ? (
              localConversationData?.imageUrl ? (
                <AvatarImage src={localConversationData.imageUrl} alt={localConversationData.name || 'Grupo'} />
              ) : (
                <AvatarImage src="/images/group-chat.svg" alt={localConversationData.name || 'Grupo'} />
              )
            ) : otherUser?.image ? (
              <AvatarImage src={otherUser.image} alt={otherUser.username || 'Usuario'} />
            ) : (
              <AvatarFallback>
                {otherUser?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="font-medium truncate">
              {localConversationData?.isGroup 
                ? localConversationData.name 
                : otherUser?.username || 'Usuario'}
            </span>
            {localConversationData?.isGroup && (
              <span className="text-xs text-gray-500">
                {localConversationData.participants?.length || 0} participantes
              </span>
            )}
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
        className="flex-1 overflow-y-auto p-3 flex flex-col"
        ref={messagesContainerRef}
        onScroll={_handleScroll}
      >
        {loading && !messages.length ? (
          <div className="flex h-full items-center justify-center">
            <LoadingSpinner className="h-8 w-8" />
          </div>
        ) : error ? (
          <div className="flex h-full items-center justify-center text-center text-red-500">
            <p>{error}</p>
          </div>
        ) : messages.length === 0 ? (
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
              <React.Fragment key={`${message.id || message.tempId || 'msg'}-${index}`}>
                {showDateSeparator && (
                  <DateSeparator date={new Date(message.createdAt)} />
                )}
                <div 
                  className={`flex ${message.senderId === session?.user?.id ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <MessageItem
                    message={message}
                    currentUserId={currentUserId}
                    otherUser={otherUser}
                    conversation={localConversationData}
                    showDateSeparator={false} /* Ya lo manejamos arriba */
                    currentUserImage={session?.user?.image || null}
                    currentUserName={session?.user?.name || null}
                    _onPlayAudio={_onPlayAudio ?? handlePlayAudio}
                    index={index}
                  />
                </div>
              </React.Fragment>
            );
          })
        )}
        {/* Elemento final para el scroll */}
        {messages.length > 0 && (
          <div 
            ref={messagesEndRef} 
            className="h-10 flex items-center justify-center" 
            id="scroll-target"
          >
            {/* Marcador invisible para asegurar que el elemento sea visible */}
            <div className="invisible text-xs">Fin de la conversación</div>
          </div>
        )}
      </div>
      
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
          <div className="p-2 border-t dark:border-gray-700">
            <div className="relative inline-block">
              {imagePreview.includes('cloudinary.com') ? (
                <CldImage 
                  src={extractCloudinaryId(imagePreview)}
                  alt="Vista previa" 
                  width={150}
                  height={150}
                  quality={80}
                  className="max-h-40 rounded-md"
                />
              ) : (
                <NextImage 
                  src={imagePreview} 
                  alt="Vista previa" 
                  className="max-h-40 max-w-full rounded-md"
                  width={150}
                  height={150}
                />
              )}
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-0 right-0 h-7 w-7 rounded-full bg-red-500 hover:bg-red-600 p-1 text-white shadow-md transform transition-transform duration-200 hover:scale-110 border-2 border-white"
                onClick={() => handleImageChange(null)}
                aria-label="Eliminar imagen"
                title="Eliminar imagen"
              >
                <X className="h-4 w-4" strokeWidth={2.5} />
              </Button>
            </div>
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
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
              ref={imageInputRef}
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

OptimizedChatWindow.displayName = 'OptimizedChatWindow';

// Función para extraer el ID de Cloudinary de una URL completa
function extractCloudinaryId(url: string): string {
  if (!url) return '';
  
  if (url.includes('cloudinary.com')) {
    // Intentar extraer el ID basado en el formato de URL de Cloudinary
    const match = url.match(/\/v\d+\/([^/]+)\.\w+$/);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  // Si no se puede extraer, devolver la URL original
  return url;
}

export default OptimizedChatWindow;
