// src/app/messages/page.optimized.tsx
"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/src/app/components/ui/button";
import { MessageSquarePlus, Users, MessageCircle } from "lucide-react";
import { useMessagesState } from "./hooks/useMessagesState";
import MessageContainer from "../components/Chat/MessageContainer";
import GroupManagementModal from '../components/Chat/GroupManagementModal';
import NewMessageModal from '../components/Chat/NewMessageModal';
import ConversationList from '../components/Chat/ConversationList';
import CreateGroupModal from '../components/Chat/CreateGroupModal';
import { User, GroupCreationState } from "./types";
import { useToast } from "@/src/app/components/ui/use-toast";
import { useConversationUpdates } from "./hooks/useConversationUpdates";
import { useGroupUpdates } from "./hooks/useGroupUpdates";

const CONVERSATIONS_PER_PAGE = 20;

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
  const [isCreatingConversation, setIsCreatingConversation] = useState(false);
  const [createGroupState, setCreateGroupState] = useState<GroupCreationState>({
    name: "",
    description: "",
    participants: [],
    isCreating: false,
    image: null,
    imagePreview: null
  });

  // Estados para usuarios mutuos
  const [_localMutualFollowers, setLocalMutualFollowers] = useState<User[]>([]);

  // Usar el hook personalizado para el estado principal de mensajes
  const {
    loading,
    conversations,
    fetchConversations,
    selectedConversation,
    selectConversation, // Esta es la función correcta para seleccionar conversaciones
    selectedConversationData,
    isGroupAdmin,
    mobileView,
    mutualFollowersForGroups,
    showGroupManagementModal,
    toggleGroupManagementModal,
    // Estados y funciones de paginación
    loadingPage,
    currentPage,
    totalPages,
    totalConversations,
    changePage,
    // Estados y funciones de filtrado
    generalSearchTerm,
    setGeneralSearchTerm,
    combinedList,
    setSelectedFilter: _setSelectedFilter, // Función para cambiar el filtro en el hook
    selectedFilter: _selectedFilter, // Renombrado para evitar redeclaración
  } = useMessagesState();
  
  // Para servicios de mensajes que no están en el hook
  const MessageService = useMemo(() => ({
    fetchConversationById: async (conversationId: string | null) => {
      if (!conversationId) return null;
      try {
        // Determinar si es una conversación grupal o privada
        const isGroup = conversationId.startsWith('group_');
        console.log(`[Cliente] fetchConversationById: ${conversationId}, isGroup: ${isGroup}`);
        
        if (isGroup) {
          // Para grupos, usar el endpoint específico de grupos
          const groupId = conversationId.replace('group_', '');
          console.log(`[Cliente] Obteniendo grupo: ${groupId}`);
          
          // Usar el endpoint de grupos existente que sabemos que funciona
          const response = await fetch(`/api/messages/group/${groupId}`);
          if (!response.ok) {
            console.error(`[Cliente] Error al obtener grupo: ${await response.text()}`);
            return null;
          }
          
          const groupData = await response.json();
          console.log(`[Cliente] Datos de grupo obtenidos:`, groupData);
          
          // Asegurarnos de que el ID tenga el formato correcto
          if (groupData && !groupData.id.startsWith('group_')) {
            groupData.id = `group_${groupData.id}`;
          }
          
          return groupData;
        } else {
          // Para conversaciones privadas, usar el endpoint de conversaciones privadas
          console.log(`[Cliente] Obteniendo conversación privada: ${conversationId}`);
          
          // Usar el endpoint existente de conversaciones privadas
          const response = await fetch(`/api/messages/conversations/private/${conversationId}`);
          if (!response.ok) {
            console.error(`[Cliente] Error al obtener conversación: ${await response.text()}`);
            return null;
          }
          
          return await response.json();
        }
      } catch (error) {
        console.error("[Cliente] Error al obtener conversación:", error);
        return null;
      }
    },
    
    // Obtener el conteo de mensajes no leídos
    getUnreadCount: async () => {
      try {
        const response = await fetch('/api/messages/unread/count');
        if (response.ok) {
          const data = await response.json();
          return data.count || 0;
        }
        return 0;
      } catch (error) {
        console.error("Error fetching unread count:", error);
        return 0;
      }
    },
    
    // Crear una nueva conversación
    createConversation: async (userId: string) => {
      try {
        const response = await fetch('/api/messages/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId })
        });
        
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("Error creating conversation:", error);
        return null;
      }
    },
    
    // Crear un nuevo grupo
    createGroup: async (groupData: {
      name: string;
      description?: string;
      participants?: string[];
      image?: File | null;
    }) => {
      try {
        // Si hay una imagen, necesitamos subir la imagen primero
        let imageUrl = undefined;
        
        if (groupData.image instanceof File) {
          const imageFormData = new FormData();
          imageFormData.append('file', groupData.image);
          
          try {
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: imageFormData
            });
            
            if (uploadResponse.ok) {
              const uploadResult = await uploadResponse.json();
              imageUrl = uploadResult.url;
              console.log('Imagen subida correctamente:', imageUrl);
            } else {
              console.error('Error al subir la imagen');
            }
          } catch (error) {
            console.error('Error al subir la imagen:', error);
          }
        }
        
        // Enviar los datos como JSON
        const response = await fetch('/api/messages/group', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: groupData.name,
            description: groupData.description || '',
            participantIds: groupData.participants || [],
            imageUrl: imageUrl
          })
        });
        
        if (response.ok) {
          return await response.json();
        }
        
        return null;
      } catch (error) {
        console.error("Error creating group:", error);
        return null;
      }
    },
    
    // Añadir participantes a un grupo
    addGroupParticipants: async (groupId: string, participantIds: string[]) => {
      try {
        const response = await fetch(`/api/messages/groups/${groupId}/participants`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ participantIds })
        });
        
        if (response.ok) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("Error adding participants:", error);
        return null;
      }
    }
  }), []);

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

  // Listener para eventos de conversación eliminada o acceso denegado
  useEffect(() => {
    const handleConversationDeleted = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { conversationId, reason } = customEvent.detail;
      
      console.log(`[MessagesPage] Detectada conversación eliminada: ${conversationId}, razón: ${reason}`);
      
      if (conversationId === selectedConversation) {
        // Mostrar notificación al usuario
        toast({
          title: "Conversación no disponible",
          description: reason === 'not_found' 
            ? "Esta conversación ya no existe."
            : "No tienes acceso a esta conversación.",
          variant: "destructive",
        });
        
        // Actualizar la lista de conversaciones para reflejar el cambio
        fetchConversations()
          .then(() => {
            // Limpiar la selección actual
            selectConversation(null);
            
            // Redirigir al usuario a la página principal de mensajes
            router.replace('/messages', { scroll: false });
          })
          .catch(error => {
            console.error("Error actualizando conversaciones tras eliminación:", error);
          });
        
        // También eliminar la conversación del historial de navegación si existe
        try {
          // Usar localStorage para recordar que esta conversación debe ser evitada
          const invalidCache = JSON.parse(localStorage.getItem('invalidConversationsCache') || '{}');
          invalidCache[conversationId] = { reason, timestamp: Date.now() };
          localStorage.setItem('invalidConversationsCache', JSON.stringify(invalidCache));
          
          console.log(`[MessagesPage] Conversación ${conversationId} marcada como inválida en localStorage`);
        } catch (e) {
          console.error("Error guardando cache de conversaciones inválidas:", e);
        }
      } else {
        // Incluso si no es la conversación activa, actualizar la lista para quitar la conversación eliminada
        fetchConversations();
      }
    };
    
    // Escuchar a ambos tipos de eventos
    window.addEventListener('conversation-deleted', handleConversationDeleted);
    window.addEventListener('conversation-access-denied', handleConversationDeleted);
    
    return () => {
      window.removeEventListener('conversation-deleted', handleConversationDeleted);
      window.removeEventListener('conversation-access-denied', handleConversationDeleted);
    };
  }, [toast, selectedConversation, fetchConversations, selectConversation, router]);

  // Inicializar la cache de conversaciones inválidas desde localStorage al cargar
  useEffect(() => {
    try {
      // Intentar cargar desde localStorage al inicio
      const savedInvalidCache = localStorage.getItem('invalidConversationsCache');
      if (savedInvalidCache) {
        window.__invalidConversationsCache = Object.keys(JSON.parse(savedInvalidCache))
          .reduce((acc, key) => {
            acc[key] = true;
            return acc;
          }, {} as Record<string, boolean>);
        
        console.log('[MessagesPage] Cache de conversaciones inválidas cargada:', 
          Object.keys(window.__invalidConversationsCache).length);
      }
    } catch (e) {
      console.error("Error cargando cache de conversaciones inválidas:", e);
    }
  }, []);

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
  }, [session?.user?.id, MessageService]);

  // Función para buscar seguidores mutuos basado en término de búsqueda
  const _searchMutualFollowers = useCallback((_term: string) => {
    // Esta función solo se mantiene por compatibilidad, pero ya no es necesaria
    // Ya que usamos el filtrado directamente en los componentes
  }, []);

  // Manejar click en nuevo mensaje
  const handleNewMessageClick = useCallback(() => {
    // Limpiar la lista local antes de mostrar el modal
    setLocalMutualFollowers([]);
    
    // Primero mostrar el modal con estado de carga
    setShowNewMessageModal(true);
    
    // Consultar los seguidores mutuos sin conversación
    fetch('/api/relationships/mutual-without-conversation')
      .then(response => response.json())
      .then(data => {
        console.log("Seguidores mutuos sin conversación cargados:", data);
        
        if (Array.isArray(data)) {
          // Usar el estado local para almacenar los usuarios mutuos
          setLocalMutualFollowers(data);
          console.log("Lista actualizada a través del estado local:", data.length, "usuarios");
        }
      })
      .catch(error => {
        console.error("Error cargando seguidores mutuos:", error);
      });
  }, []);

  // Función para seleccionar un usuario para iniciar una conversación
  const handleUserSelection = useCallback(async (user: User) => {
    try {
      // Marcar que estamos creando una conversación
      setIsCreatingConversation(true);
      
      // Crear la conversación y obtener los datos
      const conversationData = await MessageService.createConversation(user.id);
      
      if (conversationData && conversationData.id) {
        // Solo actualizar la lista de conversaciones para incluir la nueva
        await fetchConversations();
        
        // Opcionalmente seleccionar la conversación recién creada
        selectConversation(conversationData.id);
        
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
    } finally {
      // Siempre marcar que terminamos de crear la conversación
      setIsCreatingConversation(false);
    }
  }, [fetchConversations, toast, setShowNewMessageModal, MessageService, selectConversation]);

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
  }, []);

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
  }, [createGroupState, toast, fetchConversations, MessageService]);



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
              onClick={async () => {
                console.log("[MessagesPage] Botón de recarga presionado, forzando actualización completa");
                // Forzar actualización completa con forceRefresh=true y resetPage=true
                await fetchConversations(true, true, _selectedFilter);
                console.log("[MessagesPage] Actualización completa finalizada");
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
            <ConversationList
              loading={loading}
              combinedList={combinedList}
              selectedConversation={selectedConversation}
              onConversationSelect={(conversation) => selectConversation(conversation.id)}
              onUserSelect={handleUserSelection}
              onNewMessage={() => setShowNewMessageModal(true)}
              onNewGroup={() => setShowCreateGroupModal(true)}
              onRefresh={async () => {
                console.log("[MessagesPage] Botón de recarga presionado, forzando actualización completa");
                // Forzar actualización completa con forceRefresh=true y resetPage=true
                await fetchConversations(true, true, _selectedFilter);
                console.log("[MessagesPage] Actualización completa finalizada");
              }}
              onFilterChange={(filter) => {
                console.log(`MessagesPage: Cambiando filtro a ${filter} (filtro actual: ${_selectedFilter})`);
                _setSelectedFilter(filter);
                
                // Forzar fetch inmediato después de cambiar el filtro
                setTimeout(() => {
                  console.log(`Forzando actualización para filtro: ${filter} (filtro actual: ${_selectedFilter})`);
                  fetchConversations(true, true, filter); // Pasar el filtro explícitamente
                }, 100);
              }}
              selectedFilter={_selectedFilter}
              generalSearchTerm={generalSearchTerm}
              onSearchChange={setGeneralSearchTerm}
              session={{user: session?.user ? {id: session.user.id} : undefined}}
              showHeader={false}
              showFilters={true}
              showSearchInput={true}
              currentPage={currentPage}
              totalPages={totalPages}
              totalConversations={totalConversations}
              onPageChange={(page) => {
                console.log(`MessagesPage: Solicitud de cambio a página ${page}`);
                changePage(page);
              }}
              itemsPerPage={CONVERSATIONS_PER_PAGE}
              loadingPage={loadingPage}
            />
            
            {/* Indicador de carga al cargar más conversaciones */}
            {loadingPage && (
              <div className="py-3 text-center">
                <LoadingSpinner size="small" />
              </div>
            )}
          </div>
        )}
        
        {/* Área de mensajes */}
        <div className={`relative w-full flex-1 ${(mobileView && selectedConversation) ? 'flex' : (mobileView ? 'hidden' : 'md:flex')} md:w-2/3 lg:w-3/4`}>
          {selectedConversation && selectedConversationData ? (
            <MessageContainer
              key={selectedConversation}
              _selectedConversation={selectedConversation}
              _selectedConversationData={selectedConversationData}
              _onBackClick={() => deselectConversation()}
              _onSettingsClick={
                selectedConversationData.isGroup ? () => toggleGroupManagementModal() : () => {}
              }
              _loading={false}
              _isMobileView={mobileView}
              _currentUserId={session?.user?.id}
              fetchConversations={fetchConversations}
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
      <NewMessageModal
        isOpen={showNewMessageModal}
        onClose={() => setShowNewMessageModal(false)}
        onUserSelect={handleUserSelection}
        _currentUserId={session?.user?.id || ''}
        isCreatingConversation={isCreatingConversation}
        conversations={conversations}
        selectConversation={selectConversation}
      />
      
      {/* Modal para crear grupo */}
      <CreateGroupModal
        isOpen={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onCreateGroup={handleCreateGroup}
        mutualFollowers={mutualFollowersForGroups}
        createGroupState={createGroupState}
        setCreateGroupState={setCreateGroupState}
      />
      
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
