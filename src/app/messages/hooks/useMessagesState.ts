// src/app/messages/hooks/useMessagesState.ts
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { API_ROUTES } from '@/src/config/api-routes';
import { 
  User, 
  Conversation, 
  ConversationData, 
  CombinedItem,
  GroupCreationState,
  FilterType,
  Participant
} from '../types';

// Configuración
const CONVERSATIONS_PER_PAGE = 15;
const REFRESH_INTERVAL = 60000; // 60 segundos

export function useMessagesState() {
  const { data: session, status } = useSession();
  
  // Estados principales de conversación
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [mutualFollowersForGroups, setMutualFollowersForGroups] = useState<User[]>([]);
  const [combinedList, setCombinedList] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de filtrado y búsqueda
  const [generalSearchTerm, setGeneralSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  
  // Estados de conversación seleccionada
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedConversationData, setSelectedConversationData] = useState<ConversationData | null>(null);
  
  // Estados de creación de conversación
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [creatingConversation, setCreatingConversation] = useState(false);
  
  // Estados para la creación de grupos
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupCreationState, setGroupCreationState] = useState<GroupCreationState>({
    name: "",
    description: "",
    participants: [],
    isCreating: false,
    image: null,
    imagePreview: null
  });
  
  // Estados para la administración de grupos
  const [showGroupManagementModal, setShowGroupManagementModal] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  
  // Estado para vista móvil
  const [mobileView, setMobileView] = useState(false);
  
  // Función para procesar la respuesta de conversaciones
  const processConvResponse = useCallback(async (conversationsRes: Response): Promise<Conversation[]> => {
    if (!conversationsRes.ok) {
      console.error(`Error response: ${conversationsRes.status}`);
      return [];
    }

    try {
      const rawData = await conversationsRes.json();
      
      let conversations: Conversation[] = [];
      
      // Manejar diferentes formatos de respuesta de API
      if (Array.isArray(rawData)) {
        conversations = rawData;
      } else if (rawData && typeof rawData === 'object') {
        if (Array.isArray(rawData.conversations)) {
          conversations = rawData.conversations;
        } else if (rawData.data && Array.isArray(rawData.data)) {
          conversations = rawData.data;
        } else if (rawData.data?.conversations && Array.isArray(rawData.data.conversations)) {
          conversations = rawData.data.conversations;
        } else if (rawData.id && (rawData.receiver || rawData.otherUser)) {
          conversations = [rawData];
        } else if (rawData.conversation?.id) {
          conversations = [rawData.conversation];
        } else if (rawData.conversations && typeof rawData.conversations === 'object' && !Array.isArray(rawData.conversations)) {
          conversations = Object.values(rawData.conversations);
        }
      }
      
      // Filtrar conversaciones válidas y formatearlas correctamente
      const validConversations = conversations
        .filter(conv => conv && typeof conv === 'object' && conv.id)
        .map((conv) => {
          // Verificar si es un grupo basado en el ID o la propiedad isGroup
          const isGroup: boolean = Boolean(conv.isGroup) || (typeof conv.id === 'string' && conv.id.startsWith('group_'));
          
          // Si es un grupo, dar formato como grupo
          if (isGroup) {
            const processedGroup = {
              id: conv.id,
              isGroup: true,
              name: conv.name || undefined,
              description: conv.description || undefined,
              imageUrl: conv.imageUrl || undefined,
              lastMessage: conv.lastMessage ? {
                ...conv.lastMessage,
                createdAt: typeof conv.lastMessage.createdAt === 'string' ? 
                  new Date(conv.lastMessage.createdAt).toISOString() : 
                  conv.lastMessage.createdAt,
              } : null,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt || conv.createdAt || new Date().toISOString(),
              unreadCount: conv.unreadCount || 0,
              participants: Array.isArray(conv.participants) 
                ? conv.participants.map((participant: { userId?: string; id?: string; user?: User } | Participant) => {
                    // Si ya es un objeto Participant, lo devolvemos tal cual
                    if ('userId' in participant && 'role' in participant) {
                      return participant as Participant;
                    }
                    // Si es un objeto User, lo convertimos a Participant
                    return {
                      id: participant.id || crypto.randomUUID(),
                      userId: participant.userId || participant.id || '',
                      role: 'member' as const,
                      user: {
                        id: participant.id || participant.userId || '',
                        username: (participant.user && participant.user.username) || '',
                        name: (participant.user && participant.user.name) || '',
                        image: (participant.user && participant.user.image) || null
                      }
                    };
                  })
                : [],
              participantsCount: conv.participantsCount || (Array.isArray(conv.participants) ? conv.participants.length : 0),
              isEmpty: !conv.lastMessage,
              // Añadir un otherUser ficticio para compatibilidad con la interfaz existente
              otherUser: {
                id: conv.id,
                username: conv.name || "Grupo",
                image: conv.imageUrl || null
              }
            };
            
            return processedGroup;
          }
          
          const otherUser = conv.receiver || conv.otherUser || {};
          
          return {
            id: conv.id,
            otherUser: {
              id: otherUser.id,
              username: otherUser.username || null,
              image: otherUser.image || null
            },
            lastMessage: conv.lastMessage ? {
              ...conv.lastMessage,
              createdAt: typeof conv.lastMessage.createdAt === 'string' ? 
                new Date(conv.lastMessage.createdAt).toISOString() : 
                conv.lastMessage.createdAt,
            } : null,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt || conv.createdAt || new Date().toISOString(),
            senderId: session?.user?.id || '',
            receiverId: otherUser.id,
            sender: {
              id: session?.user?.id || '',
              username: session?.user?.username || null,
              image: session?.user?.image || null,
            },
            receiver: {
              id: otherUser.id,
              username: otherUser.username || null,
              image: otherUser.image || null,
            },
            unreadCount: conv.unreadCount || 0,
            lastInteraction: conv.lastInteraction,
            isEmpty: !conv.lastMessage,
            isGroup: false
          };
        });
      
      return validConversations;
    } catch (error) {
      console.error('Error parsing conversation response:', error);
      return [];
    }
  }, [session?.user?.id, session?.user?.username, session?.user?.image]);

  // Procesar respuesta de seguidores mutuos
  const processMutualResponse = useCallback(async (mutualRes: Response): Promise<User[]> => {
    if (!mutualRes.ok) return [];
    try {
      const data = await mutualRes.json();
      return data.filter((user: User) => user.id !== session?.user?.id);
    } catch (error) {
      console.error('Error processing mutual followers:', error);
      return [];
    }
  }, [session?.user?.id]);

  // Función para cargar conversaciones
  const fetchConversations = useCallback(async () => {
    if (status !== 'authenticated' || !session?.user?.id) return;

    try {
      setLoading(true);
      
      // Obtener conversaciones
      const conversationsRes = await fetch(
        `/api/messages/conversations?limit=${CONVERSATIONS_PER_PAGE}`
      );
      
      if (!conversationsRes.ok) {
        throw new Error(`Error al cargar conversaciones: ${conversationsRes.status}`);
      }
      
      const convData = await processConvResponse(conversationsRes);
      setConversations(convData);
      
      // Obtener seguidores mutuos (para la creación de nuevas conversaciones)
      const mutualRes = await fetch('/api/relationships/mutual');
      const mutualData = await processMutualResponse(mutualRes);
      setMutualFollowers(mutualData);
      setMutualFollowersForGroups(mutualData);
      
    } catch (error) {
      console.error("Error loading conversations:", error);
    } finally {
      setLoading(false);
    }
  }, [status, session?.user?.id, processConvResponse, processMutualResponse]);

  // Función para cargar una conversación específica
  const fetchConversationById = useCallback(async (conversationId: string) => {
    if (!conversationId || !session?.user?.id) return null;
    
    try {
      const response = await fetch(`/api/messages/conversations/${conversationId}`);
      
      if (!response.ok) {
        console.error(`Error fetching conversation ${conversationId}: ${response.status}`);
        return null;
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching conversation ${conversationId}:`, error);
      return null;
    }
  }, [session?.user?.id]);

  // Función para seleccionar una conversación
  const selectConversation = useCallback(async (conversationId: string | null) => {
    setSelectedConversation(conversationId);
    
    if (!conversationId) {
      setSelectedConversationData(null);
      return;
    }
    
    // Buscar en las conversaciones existentes
    const existingConv = conversations.find(c => c.id === conversationId);
    
    if (existingConv) {
      // Formatear datos para el componente de chat
      const convData: ConversationData = {
        id: existingConv.id,
        name: existingConv.name || null,
        description: existingConv.description || null,
        imageUrl: existingConv.imageUrl || null,
        isGroup: existingConv.isGroup || false,
        participants: existingConv.participants || [],
        otherUser: existingConv.otherUser,
        lastMessage: existingConv.lastMessage || undefined,
        updatedAt: existingConv.updatedAt,
        createdAt: existingConv.createdAt,
        unreadCount: existingConv.unreadCount
      };
      
      setSelectedConversationData(convData);
      
      // Si es un grupo, verificar si el usuario es administrador
      if (convData.isGroup && convData.participants) {
        const currentUserParticipant = convData.participants.find(
          p => p.userId === session?.user?.id
        );
        
        setIsGroupAdmin(
          !!currentUserParticipant && 
          ['admin', 'owner'].includes(currentUserParticipant.role)
        );
      }
      
      // Actualizar contador de mensajes no leídos
      if (existingConv.unreadCount && existingConv.unreadCount > 0) {
        try {
          await fetch(`/api/messages/read/${conversationId}`, {
            method: 'PUT'
          });
          
          // Actualizar lista de conversaciones
          setConversations(prev => 
            prev.map(c => 
              c.id === conversationId 
                ? { ...c, unreadCount: 0 } 
                : c
            )
          );
        } catch (error) {
          console.error("Error marking conversation as read:", error);
        }
      }
    } else {
      // Si no está en la lista actual, intentamos cargarla desde la API
      try {
        // Primero actualizamos la lista completa de conversaciones
        await fetchConversations();
        
        // Intentamos encontrar la conversación de nuevo después de la actualización
        const updatedExistingConv = conversations.find(c => c.id === conversationId);
        
        if (updatedExistingConv) {
          // Si la encontramos después de recargar, la seleccionamos
          selectConversation(conversationId);
          return;
        }
        
        // Solo si aún no la encontramos, intentamos cargarla individualmente
        const convData = await fetchConversationById(conversationId);
        
        if (convData) {
          const processedConvs = await processConvResponse(
            new Response(JSON.stringify(convData))
          );
          
          if (processedConvs.length > 0) {
            const newConv = processedConvs[0];
            
            // Añadir a la lista de conversaciones
            setConversations(prev => {
              // Evitar duplicados
              if (prev.some(c => c.id === newConv.id)) {
                return prev.map(c => c.id === newConv.id ? newConv : c);
              }
              return [newConv, ...prev];
            });
            
            // Formatear para el componente
            const formattedData: ConversationData = {
              id: newConv.id,
              name: newConv.name || null,
              description: newConv.description || null,
              imageUrl: newConv.imageUrl || null,
              isGroup: newConv.isGroup || false,
              participants: newConv.participants || [],
              otherUser: newConv.otherUser,
              lastMessage: newConv.lastMessage || undefined,
              updatedAt: newConv.updatedAt,
              createdAt: newConv.createdAt,
              unreadCount: newConv.unreadCount
            };
            
            setSelectedConversationData(formattedData);
            
            // Verificar permisos de administrador
            if (formattedData.isGroup && formattedData.participants) {
              const currentUserParticipant = formattedData.participants.find(
                p => p.userId === session?.user?.id
              );
              
              setIsGroupAdmin(
                !!currentUserParticipant && 
                ['admin', 'owner'].includes(currentUserParticipant.role)
              );
            }
          }
        } else {
          // Si no podemos cargar la conversación, mostramos error amigable
          console.log(`No se pudo encontrar la conversación ${conversationId}, puede ser nueva o estar siendo procesada`);
          
          // Intentar una última recarga de conversaciones
          setTimeout(() => {
            fetchConversations().then(() => {
              const delayedExistingConv = conversations.find(c => c.id === conversationId);
              if (delayedExistingConv) {
                selectConversation(conversationId);
              }
            });
          }, 1000);
        }
      } catch {
        console.log(`Error al cargar la conversación ${conversationId}, puede ser nueva o estar siendo procesada`);
      }
    }
  }, [conversations, fetchConversationById, fetchConversations, processConvResponse, session?.user?.id]);

  // Crear nueva conversación
  const createConversation = useCallback(async (user: User) => {
    if (!session?.user?.id || !user.id) return;
    
    try {
      setCreatingConversation(true);
      
      const response = await fetch(API_ROUTES.messages.createConversation, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: user.id })
      });
      
      if (!response.ok) {
        throw new Error(`Error creating conversation: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Procesar la nueva conversación
      const processedConvs = await processConvResponse(
        new Response(JSON.stringify(data))
      );
      
      if (processedConvs.length > 0) {
        const newConv = processedConvs[0];
        
        // Añadir a la lista de conversaciones
        setConversations(prev => {
          // Evitar duplicados
          const exists = prev.some(c => c.id === newConv.id);
          if (exists) return prev.map(c => c.id === newConv.id ? newConv : c);
          return [newConv, ...prev];
        });
        
        // Para conversaciones nuevas, seleccionamos directamente usando los datos que ya tenemos
        // en lugar de hacer un fetch adicional
        setSelectedConversation(newConv.id);
        
        // Crear el objeto ConversationData directamente
        const convData: ConversationData = {
          id: newConv.id,
          name: newConv.name || null,
          description: newConv.description || null,
          imageUrl: newConv.imageUrl || null,
          isGroup: newConv.isGroup || false,
          participants: newConv.participants || [],
          otherUser: newConv.otherUser,
          lastMessage: newConv.lastMessage || undefined,
          updatedAt: newConv.updatedAt,
          createdAt: newConv.createdAt,
          unreadCount: newConv.unreadCount
        };
        
        setSelectedConversationData(convData);
      }
      
      // Cerrar modal
      setShowNewMessageModal(false);
      
    } catch (error) {
      console.error("Error creating conversation:", error);
    } finally {
      setCreatingConversation(false);
    }
  }, [processConvResponse, session?.user?.id]);

  // Crear nuevo grupo
  const createGroup = useCallback(async () => {
    if (!session?.user?.id || !groupCreationState.name || groupCreationState.participants.length === 0) {
      return;
    }
    
    try {
      setGroupCreationState(prev => ({ ...prev, isCreating: true }));
      
      // Preparar los datos
      const formData = new FormData();
      formData.append('name', groupCreationState.name);
      formData.append('description', groupCreationState.description || '');
      formData.append('participants', JSON.stringify(
        groupCreationState.participants.map(p => p.userId)
      ));
      
      // Añadir imagen si existe
      if (groupCreationState.image) {
        formData.append('image', groupCreationState.image);
      }
      
      // Crear el grupo
      const response = await fetch(API_ROUTES.messages.createGroup, {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Error creating group: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Procesar el nuevo grupo
      const processedGroups = await processConvResponse(
        new Response(JSON.stringify(data))
      );
      
      if (processedGroups.length > 0) {
        const newGroup = processedGroups[0];
        
        // Añadir a la lista de conversaciones
        setConversations(prev => [newGroup, ...prev]);
        
        // Seleccionar el nuevo grupo
        await selectConversation(newGroup.id);
      }
      
      // Limpiar y cerrar modal
      setGroupCreationState({
        name: "",
        description: "",
        participants: [],
        isCreating: false,
        image: null,
        imagePreview: null
      });
      setShowCreateGroupModal(false);
      
    } catch (error) {
      console.error("Error creating group:", error);
    } finally {
      setGroupCreationState(prev => ({ ...prev, isCreating: false }));
    }
  }, [groupCreationState, processConvResponse, selectConversation, session?.user?.id]);

  // Actualizar lista combinada cuando cambian conversaciones o seguidores
  useEffect(() => {
    // Solo incluir conversaciones reales, no seguidores mutuos sin conversación
    const newCombinedList: CombinedItem[] = [
      ...conversations.map(conv => ({
        id: conv.id,
        isConversation: true,
        data: conv,
        lastInteraction: conv.lastInteraction || new Date(conv.updatedAt),
      })),
      // Eliminamos la parte que añadía seguidores mutuos sin conversación
    ];
    
    // Ordenar por última interacción (más reciente primero)
    newCombinedList.sort((a, b) => {
      const dateA = a.lastInteraction ? new Date(a.lastInteraction).getTime() : 0;
      const dateB = b.lastInteraction ? new Date(b.lastInteraction).getTime() : 0;
      return dateB - dateA;
    });
    
    setCombinedList(newCombinedList);
  }, [conversations, mutualFollowers]);

  // Filtrado de conversaciones
  const filteredConversations = useMemo(() => {
    // Primero filtramos por tipo (todo, privado, grupo)
    let filtered = combinedList.filter(item => {
      if (selectedFilter === 'all') return true;
      
      if (item.isConversation) {
        const conv = item.data as Conversation;
        if (selectedFilter === 'private') return !conv.isGroup;
        if (selectedFilter === 'group') return Boolean(conv.isGroup);
      }
      
      return true;
    });
    
    // Luego filtramos por texto de búsqueda
    if (generalSearchTerm.trim()) {
      const searchTermLower = generalSearchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(item => {
        if (item.isConversation) {
          const conv = item.data as Conversation;
          
          // Buscar en todos los campos posibles
          const groupName = conv.isGroup && conv.name ? conv.name.toLowerCase() : '';
          const username = conv.otherUser?.username?.toLowerCase() || '';
          const fullname = conv.otherUser?.name?.toLowerCase() || '';
          const lastMessageContent = conv.lastMessage?.content?.toLowerCase() || '';
          
          return (
            groupName.includes(searchTermLower) || 
            username.includes(searchTermLower) || 
            fullname.includes(searchTermLower) || 
            lastMessageContent.includes(searchTermLower)
          );
        }
        
        return false; // Ya no tenemos usuarios en la lista combinada
      });
    }
    
    return filtered;
  }, [combinedList, selectedFilter, generalSearchTerm]);

  // Actualizar tamaño de pantalla
  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth < 768);
    
    handleResize(); // Comprobar tamaño inicial
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Métodos para manipular estados
  const toggleNewMessageModal = useCallback(() => {
    setShowNewMessageModal(prev => !prev);
  }, []);

  const toggleCreateGroupModal = useCallback(() => {
    setShowCreateGroupModal(prev => !prev);
  }, []);

  const toggleGroupManagementModal = useCallback(() => {
    setShowGroupManagementModal(prev => !prev);
  }, []);

  // Actualización de estado del grupo
  const handleGroupNameChange = useCallback((name: string) => {
    setGroupCreationState(prev => ({ ...prev, name }));
  }, []);

  const handleGroupDescriptionChange = useCallback((description: string) => {
    setGroupCreationState(prev => ({ ...prev, description }));
  }, []);

  const handleParticipantToggle = useCallback((user: User) => {
    setGroupCreationState(prev => {
      // Verificar si el usuario ya está en la lista
      const isSelected = prev.participants.some(p => p.userId === user.id);
      
      if (isSelected) {
        // Eliminar de la lista
        return {
          ...prev,
          participants: prev.participants.filter(p => p.userId !== user.id)
        };
      } else {
        // Añadir a la lista
        const newParticipant: Participant = {
          id: crypto.randomUUID(),
          userId: user.id,
          role: 'member',
          user
        };
        
        return {
          ...prev,
          participants: [...prev.participants, newParticipant]
        };
      }
    });
  }, []);

  const handleGroupImageChange = useCallback((file: File | null) => {
    setGroupCreationState(prev => {
      // Si se elimina la imagen
      if (!file) {
        return {
          ...prev,
          image: null,
          imagePreview: null
        };
      }
      
      // Crear URL para previsualización
      const previewUrl = URL.createObjectURL(file);
      
      return {
        ...prev,
        image: file,
        imagePreview: previewUrl
      };
    });
  }, []);

  // Cargar datos iniciales
  useEffect(() => {
    if (status === 'authenticated') {
      fetchConversations();
      
      // Configurar actualización periódica
      const intervalId = setInterval(() => {
        fetchConversations();
      }, REFRESH_INTERVAL);
      
      return () => clearInterval(intervalId);
    }
  }, [status, fetchConversations]);

  return {
    // Estados
    conversations,
    mutualFollowers,
    mutualFollowersForGroups,
    combinedList,
    filteredConversations,
    loading,
    generalSearchTerm,
    selectedFilter,
    selectedConversation,
    selectedConversationData,
    mobileView,
    showNewMessageModal,
    creatingConversation,
    showCreateGroupModal,
    groupCreationState,
    showGroupManagementModal,
    isGroupAdmin,
    
    // Acciones
    fetchConversations,
    selectConversation,
    createConversation,
    createGroup,
    setGeneralSearchTerm,
    setSelectedFilter,
    setMutualFollowers,
    setMutualFollowersForGroups,
    toggleNewMessageModal,
    toggleCreateGroupModal,
    toggleGroupManagementModal,
    handleGroupNameChange,
    handleGroupDescriptionChange,
    handleParticipantToggle,
    handleGroupImageChange,
    setSelectedConversationData,
    setIsGroupAdmin
  };
}
