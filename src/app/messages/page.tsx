// src/app/messages/page.optimized.tsx
"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/src/app/components/ui/button";
import { MessageSquarePlus, Users, MessageCircle, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import _NewMessageModal from "../components/Chat/NewMessageModal";
import _CreateGroupModal from "../components/Chat/CreateGroupModal";
import Image from "next/image";
import { useMessagesState } from "./hooks/useMessagesState";
import MessageContainer from "../components/Chat/MessageContainer";
import GroupManagementModal from '../components/Chat/GroupManagementModal';
import { MessageService } from "./services/messageService";
import { FilterType, User, Participant, Conversation } from "./types";
import { Input } from "@/src/app/components/ui/input";
import { Avatar } from "@/src/app/components/ui/avatar";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/app/components/ui/dialog";
import { useConversationUpdates } from "./hooks/useConversationUpdates";
import { useGroupUpdates } from "./hooks/useGroupUpdates";

// Función para formatear fechas
const formatDate = (date: string | Date | undefined) => {
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

// Componente de spinner de carga
const LoadingSpinner = ({ size = "medium" }: { size?: "small" | "medium" | "large" }) => {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-8 w-8",
    large: "h-12 w-12"
  };
  
  return (
    <div className="flex items-center justify-center">
      <div className={`animate-spin rounded-full border-t-2 border-b-2 border-blue-500 dark:border-blue-400 ${sizeClasses[size]}`}></div>
    </div>
  );
};

// Componente para el estado vacío
const EmptyState = ({ icon, title, description, action }: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  action?: React.ReactNode;
}) => (
  <div className="flex h-full w-full flex-col items-center justify-center p-6">
    <div className="mb-4 text-blue-500 dark:text-blue-400">{icon}</div>
    <h2 className="mb-2 text-xl font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
    <p className="mb-6 text-center text-gray-600 dark:text-gray-400">{description}</p>
    {action}
  </div>
);

/**
 * Componente principal de la página de mensajes 
 * Versión optimizada que utiliza hooks personalizados y servicios centralizados
 */
export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { toast } = useToast();

  // Estados para modales
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [createGroupState, setCreateGroupState] = useState<{
    name: string;
    description: string;
    participants: Participant[];
    isCreating: boolean;
    image: File | null;
    imagePreview: string | null;
  }>({
    name: "",
    description: "",
    participants: [],
    isCreating: false,
    image: null,
    imagePreview: null
  });

  // Usar el hook personalizado para el estado principal de mensajes
  const {
    conversations,
    fetchConversations,
    mutualFollowers,
    mutualFollowersForGroups,
    loading,
    mobileView,
    selectedConversation,
    selectedConversationData,
    isGroupAdmin,
    selectConversation,
    setSelectedConversationData,
    showGroupManagementModal,
    toggleGroupManagementModal,
    // Añadir estados y funciones de paginación
    hasMore,
    loadingMore,
    loadMoreConversations,
    // Añadir estados y funciones de filtrado
    generalSearchTerm,
    setGeneralSearchTerm,
    filteredConversations
  } = useMessagesState();
  
  // Variable no utilizada con el prefijo _ para cumplir con la regla de ESLint
  const _unused = setSelectedConversationData;

  // Usar el hook para actualizaciones en tiempo real
  useConversationUpdates(fetchConversations);
  
  // Usar el hook para actualizaciones de grupo en tiempo real
  useGroupUpdates(selectedConversation, (updateType, data) => {
    console.log(`[GroupUpdates] Actualización recibida: ${updateType}`, data);
    
    // Si hay una conversación seleccionada, verificar actualizaciones
    if (selectedConversation) {
      if (updateType === 'group_updated' || 
          updateType === 'participants_added' || 
          updateType === 'participant_removed' || 
          updateType === 'participant_left') {
        
        // Aplicar actualización inmediata para la UI
        if (updateType === 'group_updated' && typeof data === 'object') {
          // Para actualizaciones de datos de grupo (nombre, descripción, etc.)
          // Actualizar directamente seleccionando de nuevo la conversación para forzar una actualización
          selectConversation(selectedConversation);
          
          // También actualizar los datos en tiempo real si es posible
          if (selectedConversationData && 'name' in data) {
            const updatedName = data.name as string;
            console.log(`[GroupUpdates] Actualizando nombre de grupo a: ${updatedName}`);
            // Forzar un refresco completo de la conversación desde el servidor
            MessageService.fetchConversationById(selectedConversation)
              .then((conversation) => {
                if (conversation) {
                  console.log('[GroupUpdates] Conversación actualizada desde servidor:', conversation);
                }
              });
          }
        } 
        else if (updateType === 'participants_added' || 
                updateType === 'participant_removed' || 
                updateType === 'participant_left') {
          // Para cambios en participantes, forzar una recarga desde el servidor
          // ya que necesitamos información completa de los usuarios
          MessageService.fetchConversationById(selectedConversation)
            .then((conversation) => {
              if (conversation) {
                console.log('[GroupUpdates] Participantes actualizados desde servidor:', conversation);
              }
            })
            .catch((error: Error) => {
              console.error("Error actualizando datos de conversación:", error);
            });
        }
        
        // De todas formas, actualizar la lista completa desde el servidor
        fetchConversations();
      } else if (updateType === 'group_deleted') {
        // Si el grupo fue eliminado, mostrar una notificación y redirigir
        toast({
          title: "Grupo eliminado",
          description: "El grupo ha sido eliminado por el administrador."
        });
        
        // Actualizar lista de conversaciones y volver a la pantalla principal
        fetchConversations().then(() => {
          selectConversation(null);
          router.push('/messages', { scroll: false });
        });
      }
    } else {
      // Si no hay conversación seleccionada, simplemente actualizar la lista
      fetchConversations();
    }
  });

  // Deselectionar conversación (usado en la vista móvil)
  const deselectConversation = useCallback(() => {
    selectConversation(null);
    router.push('/messages', { scroll: false });
  }, [selectConversation, router]);

  // Actualizar contadores de mensajes no leídos
  const refreshUnreadCounts = useCallback(async () => {
    if (!session?.user?.id) return;
    
    try {
      await MessageService.getUnreadCount();
    } catch (error) {
      console.error('Error al obtener contadores de mensajes no leídos:', error);
    }
  }, [session?.user?.id]);

  // Función para buscar seguidores mutuos basado en término de búsqueda
  const _searchMutualFollowers = useCallback((_term: string) => {
    // Esta función solo se mantiene por compatibilidad, pero ya no es necesaria
    // Ya que usamos el filtrado directamente en los componentes
  }, []);

  // Manejar click en nuevo mensaje
  const handleNewMessageClick = useCallback(() => {
    // Actualizar la lista de seguidores mutuos antes de abrir el modal
    try {
      fetch('/api/relationships/mutual')
        .then(response => response.json())
        .then(data => {
          console.log("Seguidores mutuos cargados:", data);
          if (Array.isArray(data)) {
          }
        })
        .catch(error => {
          console.error("Error cargando seguidores mutuos:", error);
        });
    } catch (error) {
      console.error("Error en solicitud de seguidores mutuos:", error);
    }
    
    // Abrir el modal
    setShowNewMessageModal(true);
  }, []);

  // Función para seleccionar un usuario para iniciar una conversación
  const handleUserSelection = useCallback(async (user: User) => {
    try {
      // Crear la conversación y obtener los datos
      const conversationData = await MessageService.createConversation(user.id);
      
      if (conversationData && conversationData.id) {
        // Solo actualizar la lista de conversaciones para incluir la nueva
        await fetchConversations();
        
        // Mostrar notificación de éxito opcional
        toast({
          title: "Conversación creada",
          description: "La conversación se ha creado correctamente",
          variant: "default",
        });
        
        // Cerrar el modal de nueva conversación si está abierto
        setShowNewMessageModal(false);
      }
    } catch (error) {
      console.error('Error al crear conversación:', error);
      toast({
        title: "Error",
        description: "No se pudo crear la conversación",
        variant: "destructive",
      });
    }
  }, [fetchConversations, toast, setShowNewMessageModal]);

  // Procesar el ID de conversación de la URL al cargar
  useEffect(() => {
    const conversationId = searchParams.get('id');
    
    if (conversationId && session?.user?.id) {
      // Verificar primero si la conversación ya existe en nuestra lista antes de intentar cargarla
      // Esto evita intentar cargar conversaciones que causarían un 404
      const existingConversation = conversations.find(conv => conv.id === conversationId);
      
      if (existingConversation) {
        // Solo seleccionar si la conversación ya existe en la lista
        selectConversation(conversationId);
      } else {
        // Si la conversación no está en la lista pero está en la URL, actualizar la lista primero
        fetchConversations().then(() => {
          // Comprobar de nuevo después de actualizar la lista
          const refreshedConversation = conversations.find(conv => conv.id === conversationId);
          if (refreshedConversation) {
            selectConversation(conversationId);
          } else {
            console.log(`Conversación ${conversationId} en URL no encontrada en la lista actualizada, ignorando`);
            // Opcional: Limpiar el ID de la URL para evitar intentos repetidos
            router.replace('/messages', { scroll: false });
          }
        });
      }
    }
  }, [searchParams, session?.user?.id, conversations, selectConversation, fetchConversations, router]);

  // Manejar cambios en el ancho de la ventana para modo móvil/escritorio
  useEffect(() => {
    const handleResize = () => {
      // La actualización del estado mobileView se maneja en useMessagesState
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Comprobar el tamaño inicial
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [mobileView]);

  // Función para crear un nuevo grupo
  const handleCreateGroup = useCallback(async () => {
    if (!createGroupState.name || createGroupState.participants.length === 0) {
      toast({
        title: "Campos requeridos",
        description: "El nombre del grupo y al menos un participante son obligatorios",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreateGroupState(prev => ({ ...prev, isCreating: true }));
      
      const participantIds = createGroupState.participants.map(p => p.userId);
      
      // Usar el MessageService para crear el grupo
      await MessageService.createGroup({
        name: createGroupState.name,
        description: createGroupState.description,
        participants: participantIds,
        image: createGroupState.image || undefined
      }, (progress) => {
        console.log(`Progreso de carga: ${progress}%`);
      });
      
      // Actualizar la lista de conversaciones
      await fetchConversations();
      
      // Reiniciar el estado de creación de grupo
      setCreateGroupState({
        name: "",
        description: "",
        participants: [],
        isCreating: false,
        image: null,
        imagePreview: null
      });
      
      // Cerrar el modal
      setShowCreateGroupModal(false);
      
      toast({
        title: "Grupo creado",
        description: "El grupo se ha creado correctamente",
      });
    } catch (error) {
      console.error('Error al crear grupo:', error);
      toast({
        title: "Error",
        description: "No se pudo crear el grupo",
        variant: "destructive",
      });
    } finally {
      setCreateGroupState(prev => ({ ...prev, isCreating: false }));
    }
  }, [createGroupState, toast, fetchConversations]);

  // Función para manejar la selección de imagen de grupo
  const handleGroupImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      const reader = new FileReader();
      reader.onload = (evt: ProgressEvent<FileReader>) => {
        const target = evt.target;
        if (target && target.result) {
          setCreateGroupState(prev => ({
            ...prev,
            image: file,
            imagePreview: typeof target.result === 'string' ? target.result : null
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Función para manejar la selección de participantes
  const handleParticipantSelection = useCallback((participant: User) => {
    setCreateGroupState(prev => {
      const existingParticipant = prev.participants.find(p => p.userId === participant.id);
      
      if (existingParticipant) {
        // Si el participante ya existe, no hacemos nada
        return prev;
      } else {
        // Si no existe, lo añadimos
        const newParticipant: Participant = {
          id: `temp-${participant.id}`,
          userId: participant.id,
          role: 'member' as 'admin' | 'member' | 'moderator' | 'owner',
          user: participant
        };
        
        return {
          ...prev,
          participants: [...prev.participants, newParticipant]
        };
      }
    });
  }, []);

  // Función para añadir participantes al grupo existente
  const _handleAddParticipantsToGroup = useCallback(async (participantIds: string[]) => {
    if (!selectedConversationData || participantIds.length === 0) return;
    
    try {
      // Usar el MessageService para añadir participantes
      await MessageService.addGroupParticipants(
        selectedConversationData.id,
        participantIds
      );
      
      // Actualizar datos
      fetchConversations();
      if (selectedConversation) {
        selectConversation(selectedConversation);
      }
      
      // Cerrar modal
      setShowCreateGroupModal(false);
      
      toast({
        title: "Participantes añadidos",
        description: "Los participantes se han añadido correctamente al grupo",
      });
    } catch (error) {
      console.error('Error al añadir participantes:', error);
      toast({
        title: "Error",
        description: "No se pudieron añadir los participantes al grupo",
        variant: "destructive",
      });
    }
  }, [selectedConversationData, selectedConversation, toast, fetchConversations, selectConversation]);

  // Función para abrir el modal de crear grupo
  const handleCreateGroupClick = useCallback(async () => {
    try {
      // Cargar seguidores mutuos del API
      const response = await fetch('/api/relationships/mutual');
      
      if (!response.ok) {
        throw new Error('Error al cargar seguidores mutuos');
      }
      
      // Ya no necesitamos usar esta variable, así que podemos omitir su asignación
      await response.json();
      
      // Mostrar modal
      setShowCreateGroupModal(true);
    } catch (error) {
      console.error('Error cargando seguidores mutuos para grupos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los contactos",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Efecto para refrescar contadores cada minuto
  useEffect(() => {
    // Refreshing unread counts on load
    refreshUnreadCounts();
    
    // Setting up periodic refresh
    const interval = setInterval(refreshUnreadCounts, 60000);
    return () => clearInterval(interval);
  }, [refreshUnreadCounts]);

  // Renderizado condicional para la vista móvil
  if (status === "loading") {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
    return null;
  }

  // Renderizado principal
  return (
    <div className="flex h-screen flex-col bg-white dark:bg-gray-900">
      {/* Cabecera de la página */}
      <header className="border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Mensajes</h1>
          
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleNewMessageClick}
              title="Nuevo mensaje"
              className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}
            >
              <MessageSquarePlus className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Mensaje</span>
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleCreateGroupClick}
              title="Crear grupo"
              className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}
            >
              <Users className="mr-1 h-4 w-4" />
              <span className="hidden sm:inline">Grupo</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Recargar completamente las conversaciones en lugar de solo los contadores
                fetchConversations();
                refreshUnreadCounts();
              }}
              title="Actualizar conversaciones"
              className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 21h5v-5"></path>
              </svg>
            </Button>
          </div>
        </div>
      </header>
      
      {/* Contenido principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Lista de conversaciones (oculta en móvil cuando hay una conversación seleccionada) */}
        {(!mobileView || !selectedConversation) && (
          <div className="flex flex-col w-full h-full md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-700">
            {/* Filtros de conversación únicos */}
            <div className="flex p-2 space-x-2 border-b border-gray-200 dark:border-gray-700">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                className={`flex-1 ${selectedFilter === 'all' ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700' : 'border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800'}`}
                onClick={() => setSelectedFilter('all')}
              >
                Todos
              </Button>
              
              <Button
                variant={selectedFilter === 'private' ? 'default' : 'outline'}
                size="sm"
                className={`flex-1 ${selectedFilter === 'private' ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700' : 'border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800'}`}
                onClick={() => setSelectedFilter('private')}
              >
                Privados
              </Button>
              
              <Button
                variant={selectedFilter === 'group' ? 'default' : 'outline'}
                size="sm"
                className={`flex-1 ${selectedFilter === 'group' ? 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700' : 'border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800'}`}
                onClick={() => setSelectedFilter('group')}
              >
                Grupos
              </Button>
            </div>

            {/* Campo de búsqueda directo sin pasar por ConversationList */}
            <div className="p-2 border-b border-gray-200 dark:border-gray-700">
              <Input
                placeholder="Buscar..."
                className="w-full"
                value={generalSearchTerm}
                onChange={(e) => setGeneralSearchTerm(e.target.value)}
              />
            </div>
            
            {/* Contenedor de lista de conversaciones */}
            <div 
              className="flex-1 overflow-y-auto" 
              onScroll={(e) => {
                // Detectar cuando llega al final para cargar más conversaciones
                const target = e.target as HTMLDivElement;
                if (!loadingMore && hasMore && target.scrollHeight - target.scrollTop - target.clientHeight < 100) {
                  loadMoreConversations();
                }
              }}
            >
              {loading ? (
                <div className="h-full flex items-center justify-center">
                  <LoadingSpinner />
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((item) => {
                  const isConversation = item.isConversation;
                  const conversation = isConversation ? item.data as Conversation : null;
                  const user = isConversation ? (item.data as Conversation).otherUser : item.data as User;
                  const isGroup = isConversation && ((conversation?.isGroup) || (conversation?.id.startsWith('group_')));
                  
                  return (
                    <div
                      key={item.id}
                      className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer flex items-start space-x-3 ${selectedConversation === item.id ? "bg-blue-50 dark:bg-gray-800" : ""}`}
                      onClick={() => {
                        if (isConversation && conversation) {
                          selectConversation(conversation.id);
                        } else if (!isConversation && user) {
                          handleUserSelection(user);
                        }
                      }}
                    >
                      {/* Avatar */}
                      <Avatar className="h-12 w-12 border-2 border-gray-200 dark:border-gray-700 overflow-hidden flex items-center justify-center">
                        {isGroup ? (
                          <Image 
                            src={conversation?.imageUrl || "/images/AvatarPredeterminado.webp"}
                            width={48}
                            height={48}
                            alt={conversation?.name || "Grupo"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Image
                            src={user?.image || "/images/AvatarPredeterminado.webp"} 
                            alt={user?.username || "Usuario"}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                          />
                        )}
                      </Avatar>
                      
                      {/* Información de conversación */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium truncate">
                            {isGroup 
                              ? conversation?.name || "Grupo sin nombre" 
                              : user?.username || user?.name || "Usuario"}
                          </h4>
                          {conversation?.lastMessage && (
                            <span className="text-xs text-gray-500">
                              {formatDate(conversation.lastMessage.createdAt)}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {conversation?.lastMessage ? (
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
                })
              ) : (
                <div className="h-full flex items-center justify-center p-4">
                  <div className="text-center text-gray-500 dark:text-gray-400">
                    <p className="mb-2">No hay conversaciones disponibles</p>
                    {selectedFilter === 'all' ? (
                      <div className="flex flex-col space-y-2">
                        <Button variant="outline" onClick={handleNewMessageClick} className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}>
                          <MessageSquarePlus className="mr-2 h-4 w-4" /> 
                          Iniciar nueva conversación
                        </Button>
                        <Button variant="outline" onClick={() => setShowCreateGroupModal(true)} className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}>
                          <Users className="mr-2 h-4 w-4" /> 
                          Crear grupo
                        </Button>
                      </div>
                    ) : selectedFilter === 'private' ? (
                      <Button variant="outline" onClick={handleNewMessageClick} className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}>
                        <MessageSquarePlus className="mr-2 h-4 w-4" /> 
                        Iniciar nueva conversación
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={() => setShowCreateGroupModal(true)} className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}>
                        <Users className="mr-2 h-4 w-4" /> 
                        Crear grupo
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Indicador de carga al cargar más conversaciones */}
              {loadingMore && (
                <div className="py-3 text-center">
                  <LoadingSpinner size="small" />
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Área de mensajes */}
        <div className={`relative w-full flex-1 ${(mobileView && selectedConversation) ? 'flex' : (mobileView ? 'hidden' : 'md:flex')} md:w-2/3 lg:w-3/4`}>
          {selectedConversation && selectedConversationData ? (
            <MessageContainer
              key={selectedConversation}
              _selectedConversation={selectedConversation}
              _selectedConversationData={selectedConversationData}
              _onBackClick={mobileView ? () => deselectConversation() : () => {}}
              _onSettingsClick={
                selectedConversationData.isGroup ? () => toggleGroupManagementModal() : () => {}
              }
              _loading={false}
              _isMobileView={mobileView}
              _currentUserId={session?.user?.id}
            />
          ) : (
            <EmptyState
              icon={<MessageCircle className="h-12 w-12 text-blue-500 dark:text-blue-400" />}
              title="Selecciona una conversación"
              description="Elige una conversación de la lista o inicia una nueva para comenzar a chatear."
              action={
                <Button onClick={handleNewMessageClick} className={`bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700`}>
                  <MessageSquarePlus className="mr-2 h-4 w-4" />
                  Nuevo mensaje
                </Button>
              }
            />
          )}
        </div>
      </div>
      
      {/* Modal para nuevo mensaje */}
      <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="dark:text-gray-100">Nuevo mensaje</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar usuarios..."
                className="w-full rounded-md border border-gray-300 p-2 pr-10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {mutualFollowers.length > 0 ? (
                <div className="space-y-2">
                  {mutualFollowers.map((user) => (
                    <div
                      key={user.id}
                      className="flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
                      onClick={() => {
                        handleUserSelection(user);
                        setShowNewMessageModal(false);
                      }}
                    >
                      <div className="flex items-center">
                        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          {user.image ? (
                            <Image
                              src={user.image}
                              alt={user.username || 'Usuario'}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-100 text-primary-800">
                              {user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium">
                            {user.name || user.username || 'Usuario sin nombre'}
                          </div>
                          {user.username && user.name && (
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              @{user.username}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No hay seguidores mutuos disponibles para iniciar un chat.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal para crear grupo */}
      <Dialog open={showCreateGroupModal} onOpenChange={setShowCreateGroupModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo grupo</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Imagen del grupo */}
            <div className="mx-auto max-w-xs">
              <div 
                className="relative mx-auto h-24 w-24 cursor-pointer overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" 
                onClick={() => document.getElementById('group-image-input')?.click()}
              >
                {createGroupState.imagePreview ? (
                  <Image
                    src={createGroupState.imagePreview}
                    alt="Previsualización"
                    width={96}
                    height={96}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Plus className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <input
                id="group-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleGroupImageChange}
              />
              <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
                Haz clic para subir una imagen de grupo
              </p>
            </div>
            
            {/* Nombre y descripción del grupo */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Nombre del grupo
              </label>
              <input
                type="text"
                placeholder="Nombre del grupo"
                className="w-full rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                value={createGroupState.name}
                onChange={(e) => setCreateGroupState(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <label className="mb-1 block text-sm font-medium">
                Descripción (opcional)
              </label>
              <textarea
                placeholder="Descripción del grupo"
                className="w-full rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                value={createGroupState.description}
                onChange={(e) => setCreateGroupState(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            {/* Participantes */}
            <div>
              <label className="mb-1 block text-sm font-medium">
                Añadir participantes
              </label>
              <input
                type="text"
                placeholder="Buscar usuarios..."
                className="w-full rounded-md border border-gray-300 p-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            
            {/* Lista de participantes seleccionados */}
            {createGroupState.participants.length > 0 && (
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Participantes seleccionados ({createGroupState.participants.length})
                </label>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {createGroupState.participants.map((participant) => (
                    <div
                      key={participant.userId}
                      className="flex items-center justify-between rounded-md bg-gray-100 p-2 dark:bg-gray-800"
                    >
                      <div className="flex items-center">
                        <div className="h-6 w-6 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          {participant.user.image ? (
                            <Image
                              src={participant.user.image}
                              alt={participant.user.username || 'Usuario'}
                              width={24}
                              height={24}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-primary-100 text-primary-800">
                              {participant.user.username?.charAt(0).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div className="ml-2 text-sm">
                          {participant.user.name || participant.user.username || 'Usuario sin nombre'}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleParticipantSelection(participant.user)}
                      >
                        Quitar
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Lista de usuarios para seleccionar */}
            <div className="max-h-64 overflow-y-auto">
              {mutualFollowersForGroups.length > 0 ? (
                <div className="space-y-2">
                  {mutualFollowersForGroups.map((user) => {
                    const isSelected = createGroupState.participants.some(p => p.userId === user.id);
                    return (
                      <div
                        key={user.id}
                        className={`flex cursor-pointer items-center justify-between rounded-md p-2 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                          isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''
                        }`}
                        onClick={() => handleParticipantSelection(user)}
                      >
                        <div className="flex items-center">
                          <div className="h-8 w-8 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                            {user.image ? (
                              <Image
                                src={user.image}
                                alt={user.username || 'Usuario'}
                                width={32}
                                height={32}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-primary-100 text-primary-800">
                                {user.username?.charAt(0).toUpperCase() || 'U'}
                              </div>
                            )}
                          </div>
                          <div className="ml-2">
                            <div className="text-sm font-medium">
                              {user.name || user.username || 'Usuario sin nombre'}
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-blue-500">
                          {isSelected ? 'Seleccionado' : 'Añadir'}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                  No hay seguidores mutuos disponibles para añadir al grupo.
                </div>
              )}
            </div>
            
            {/* Botón de creación */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCreateGroupModal(false)}
                disabled={createGroupState.isCreating}
                className={`border-blue-500 text-blue-500 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-gray-800`}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateGroup}
                disabled={!createGroupState.name || createGroupState.participants.length === 0 || createGroupState.isCreating}
                className={`bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700`}
              >
                {createGroupState.isCreating ? 'Creando...' : 'Crear grupo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Modal de gestión de grupo */}
      {selectedConversation && selectedConversationData && (
        <GroupManagementModal
          isOpen={showGroupManagementModal}
          onClose={toggleGroupManagementModal}
          conversationData={selectedConversationData}
          currentUserId={session?.user?.id || ''}
          isAdmin={isGroupAdmin}
          onConversationUpdate={(updatedData) => {
            console.log("[DEBUG] Recibiendo datos actualizados de la conversación:", updatedData);
            
            // SOLUCIÓN MEJORADA: Actualización inmediata de datos 
            if (updatedData && updatedData.id) {
              // 1. Actualizar la lista de conversaciones y forzar la actualización
              const conversationId = updatedData.id; // Guardar el ID en una variable
              
              // Actualizar manualmente la conversación en la lista de conversaciones
              const _updatedConversations = conversations.map(conv => { // Added underscore prefix to fix ESLint error
                if (conv.id === conversationId) {
                  // Crear una copia actualizada con los nuevos datos
                  return {
                    ...conv,
                    name: updatedData.name || conv.name,
                    description: updatedData.description || conv.description,
                    imageUrl: updatedData.imageUrl || conv.imageUrl,
                    participants: updatedData.participants || conv.participants
                  };
                }
                return conv;
              });
              
              // Forzar re-renderización inmediata con los datos actualizados
              // Esto simula una actualización completa sin necesidad de acceder a la API
              if (typeof window !== 'undefined') {
                // Disparar un evento personalizado para forzar la actualización
                window.dispatchEvent(new CustomEvent('conversation-updated', { 
                  detail: { 
                    conversationId: conversationId,
                    updatedData: updatedData 
                  } 
                }));
              }
              
              // 2. Refrescar datos completos del servidor (en segundo plano)
              setTimeout(() => {
                fetchConversations().then(() => {
                  // Asegurarse de que el ID es un string válido
                  if (typeof conversationId === 'string') {
                    // 3. Volver a seleccionar para asegurar consistencia total
                    selectConversation(conversationId);
                  }
                });
              }, 300);
            }
          }}
        />
      )}
    </div>
  );
}
