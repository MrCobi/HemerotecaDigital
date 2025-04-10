// src/app/messages/hooks/useMessagesState.ts
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { 
  User, 
  Conversation,
  ConversationData,
  CombinedItem,
  FilterType,
  Participant,
  GroupCreationState
} from '../types';
import { API_ROUTES } from '@/src/config/api-routes';

export function useMessagesState() {
  const { data: session, status } = useSession();
  
  // Configuración
  const CONVERSATIONS_PER_PAGE = 5;

  // Estados principales de conversación
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [mutualFollowersForGroups, setMutualFollowersForGroups] = useState<User[]>([]);
  const [combinedList, setCombinedList] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de paginación
  const [totalPages, setTotalPages] = useState(1);
  const [totalConversations, setTotalConversations] = useState(0);
  const [loadingPage, setLoadingPage] = useState(false);
  
  // Estados de filtrado y búsqueda
  const [generalSearchTerm, setGeneralSearchTermState] = useState("");
  const [selectedFilterState, setSelectedFilterState] = useState<FilterType>('all');

  // Referencia para almacenar el timeout de debounce de búsqueda
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Estado real del filtro, recuperándolo de sessionStorage si existe
  const selectedFilter = useMemo(() => {
    // Ejecutar solo en el cliente
    if (typeof window !== 'undefined') {
      const savedFilter = sessionStorage.getItem('messagesFilter');
      if (savedFilter && (savedFilter === 'all' || savedFilter === 'private' || savedFilter === 'group')) {
        console.log(`Recuperando filtro guardado: ${savedFilter}`);
        return savedFilter as FilterType;
      }
    }
    return selectedFilterState;
  }, [selectedFilterState]);

  // Guardar el filtro en sessionStorage cuando cambie
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(`Guardando filtro en sessionStorage: ${selectedFilter}`);
      sessionStorage.setItem('messagesFilter', selectedFilter);
    }
  }, [selectedFilter]);
  
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
  
  // Referencia para saber si es la carga inicial
  const _isInitialLoadRef = useRef(true);

  // Referencia para evitar solicitudes simultáneas
  const isLoadingRef = useRef(false);

  // Referencia para ignorar la siguiente actualización periódica
  const ignoreNextRefreshRef = useRef(false);

  // Variable compartida a nivel de aplicación para evitar solicitudes duplicadas
  const paginationRequestInProgressRef = useRef(false);
  
  // Referencia específica para controlar solicitudes de búsqueda
  const searchRequestInProgressRef = useRef(false);
  
  // ID de la última búsqueda para cancelar solicitudes obsoletas
  const lastSearchIdRef = useRef<string | null>(null);

  // Referencia para mantener el valor actualizado de currentPage entre renders
  const currentPageRef = useRef(1);

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
  const fetchConversations = useCallback(async (forceRefresh = false, resetToPage1 = false, explicitFilter?: FilterType) => {
    // Verificaciones básicas de autenticación
    if (status !== 'authenticated' || !session?.user?.id) {
      console.log('Usuario no autenticado, omitiendo fetchConversations');
      return;
    }
    
    // Estricto control para evitar solicitudes redundantes o conflictivas
    if (isLoadingRef.current) {
      console.log('Ya hay una solicitud en curso, cancelando fetchConversations');
      return;
    }
    
    // Prioridad absoluta a las búsquedas - nunca competir con ellas
    if (searchRequestInProgressRef.current) {
      console.log('Hay una búsqueda activa, cancelando fetchConversations');
      return;
    }
    
    // Si hay un término de búsqueda activo, no permitir actualizaciones que no sean búsquedas
    // Esto evita que otras actualizaciones sobrescriban los resultados de búsqueda
    if (generalSearchTerm.trim() && !explicitFilter) {
      console.log('Hay un término de búsqueda activo, solo permitiendo actualizaciones explícitas');
      return;
    }

    try {
      isLoadingRef.current = true;
      
      if (forceRefresh) {
        setLoading(true);
      }
      
      // Solo resetear a página 1 si se indica explícitamente
      if (resetToPage1) {
        console.log(`Reseteando página a 1 desde ${currentPageRef.current} (resetToPage1=${resetToPage1})`);
        currentPageRef.current = 1;
      }
      
      // Usar el filtro explícito si se proporciona (para cambios de filtro inmediatos)
      // De lo contrario, usar el estado actual
      const activeFilter = explicitFilter || selectedFilter;
      console.log(`Filtro a utilizar en la petición: ${activeFilter} (selectedFilter: ${selectedFilter}, explicitFilter: ${explicitFilter || 'no proporcionado'})`);
      
      // Construir la URL usando URLSearchParams para garantizar formato correcto
      const params = new URLSearchParams();
      params.append('page', currentPageRef.current.toString());
      params.append('limit', CONVERSATIONS_PER_PAGE.toString());
      params.append('filter', activeFilter);
      
      // Añadir término de búsqueda SOLO si existe y no está vacío
      const trimmedSearchTerm = generalSearchTerm.trim();
      if (trimmedSearchTerm) {
        params.append('search', encodeURIComponent(trimmedSearchTerm));
      }
      
      const url = `/api/messages/conversations?${params.toString()}`;
      console.log(`Solicitando conversaciones: ${url} (forceRefresh=${forceRefresh}, resetToPage1=${resetToPage1}, página actual=${currentPageRef.current}, filtro=${activeFilter})`);
      
      // Obtener conversaciones
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error al cargar conversaciones: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Recibidas ${data.conversations.length} conversaciones de un total de ${data.totalCount}`);
      
      // Procesar las conversaciones de forma síncrona
      const conversationsData = data.conversations || [];
      const processedConversations = await processConvResponse(
        new Response(JSON.stringify(conversationsData))
      );
      
      // Si es carga inicial o página 1, reemplazar conversaciones
      if (forceRefresh) {
        setConversations(processedConversations);
      } else {
        // Evitar duplicados al agregar más conversaciones
        const existingIds = new Set(conversations.map(c => c.id));
        const newConversations = processedConversations.filter(c => !existingIds.has(c.id));
        
        if (newConversations.length > 0) {
          setConversations(prev => [...prev, ...newConversations]);
        }
      }
      
      // Actualizar estado de paginación
      setTotalPages(Math.ceil(data.totalCount / CONVERSATIONS_PER_PAGE));
      setTotalConversations(data.totalCount || 0);
      
      // Obtener seguidores mutuos solo en carga inicial
      if (forceRefresh) {
        const mutualRes = await fetch('/api/relationships/mutual');
        const mutualData = await processMutualResponse(mutualRes);
        setMutualFollowers(mutualData);
        setMutualFollowersForGroups(mutualData);
      }
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
      setError('No se pudieron cargar las conversaciones');
    } finally {
      setLoading(false);
      isLoadingRef.current = false;
    }
  }, [status, session?.user?.id, processConvResponse, processMutualResponse, selectedFilter, generalSearchTerm, CONVERSATIONS_PER_PAGE, conversations]);

  // Manejar cambio de filtro
  const _handleFilterChange = useCallback((filter: FilterType) => {
    console.log(`Hook: Cambiando filtro a ${filter}`);
    setSelectedFilterState(filter);
  }, [setSelectedFilterState]);

  // Referencia para determinar si ya se cargaron las conversaciones inicialmente
  const initialLoadDoneRef = useRef(false);
  
  // Actualizaciones para controlar las conversaciones
  useEffect(() => {
    // Solo cargar conversaciones cuando la sesión está autenticada y no se han cargado aún
    if (status === 'authenticated' && session?.user?.id && !initialLoadDoneRef.current) {
      // Evitar cargas redundantes
      initialLoadDoneRef.current = true;
      console.log('Carga inicial de conversaciones');
      
      // Cargar conversaciones iniciales (una sola vez)
      if (!paginationRequestInProgressRef.current && !searchRequestInProgressRef.current) {
        fetchConversations(true);
      }
      
      // IMPORTANTE: Se deshabilitan TODAS las actualizaciones automáticas
      // para resolver el problema de paginación. Estas se pueden reactivar
      // después cuando se solucione el problema principal.
      
      /* DESACTIVADO TEMPORALMENTE
      const intervalId = setInterval(() => {
        if (!loadingPage && !paginationRequestInProgressRef.current) {
          console.log(`Actualización periódica - manteniendo página ${currentPageRef.current}`);
          fetchConversations(false, false);
        }
      }, REFRESH_INTERVAL);
      
      return () => clearInterval(intervalId);
      */
    }
  }, [status, session?.user?.id, fetchConversations]);

  // Actualizaciones cuando el filtro o la búsqueda cambian
  const fetchConversationsRef = useRef(fetchConversations);
  fetchConversationsRef.current = fetchConversations;

  // La referencia _isInitialLoadRef ya no es necesaria
  useEffect(() => {
    // Este efecto se disparará SOLO cuando cambie el filtro mediante los botones
    // Ignoramos completamente cualquier otro tipo de actualización
    if (!ignoreNextRefreshRef.current && initialLoadDoneRef.current) {
      console.log(`Cambio explícito de filtro via UI: ${selectedFilter}`);
      
      // Evitar actualizaciones si hay búsquedas en curso
      if (!searchRequestInProgressRef.current) {
        // Resetear a página 1 al cambiar filtro
        currentPageRef.current = 1;
        fetchConversationsRef.current(true);
      }
    }
  }, [selectedFilter]); // Solo depende del filtro seleccionado

  // Función para cambiar de página de conversaciones
  const changePage = useCallback(async (page: number) => {
    console.log(`Cambiando a la página ${page} (actual en ref: ${currentPageRef.current})`);
    
    // Comprobar si ya está en proceso otra solicitud
    if (paginationRequestInProgressRef.current) {
      console.log('Ignorando cambio de página - ya hay una solicitud en curso');
      return;
    }
    
    // IMPORTANTE: No ignorar nunca el cambio a la página 1, incluso si currentPageRef.current es 1
    // porque puede haber desincronización entre la UI y el estado.
    if (page !== 1 && page === currentPageRef.current) {
      console.log(`La página solicitada ${page} es igual a la actual ${currentPageRef.current}, pero continuando por si acaso hay desincronización`);
    }
    
    // Registrar que hay una solicitud de paginación en curso
    paginationRequestInProgressRef.current = true;
    setLoadingPage(true);
    
    try {
      // IMPORTANTE: Actualizar la página actual inmediatamente, antes incluso de la petición
      // para evitar cualquier interferencia y asegurar que la UI refleje el cambio inmediatamente
      currentPageRef.current = page;
      
      // Construir URL con los parámetros usando la página solicitada
      const params = new URLSearchParams({
        page: page.toString(), // La página solicitada ya es correcta (base 1)
        limit: CONVERSATIONS_PER_PAGE.toString(),
        filter: selectedFilter
      });
      
      // Añadir término de búsqueda si existe
      if (generalSearchTerm.trim()) {
        params.append('search', encodeURIComponent(generalSearchTerm.trim()));
      }
      
      const url = `/api/messages/conversations?${params.toString()}`;
      console.log(`Solicitando conversaciones para página ${page}: ${url}`);
      
      // Obtener conversaciones
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Error al cargar conversaciones: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Recibidas ${data.conversations.length} conversaciones de un total de ${data.totalCount}`);
      
      // Procesar las conversaciones
      const conversationsData = data.conversations || [];
      const processedConversations = await processConvResponse(
        new Response(JSON.stringify(conversationsData))
      );
      
      // Actualizar los datos
      setConversations(processedConversations);
      setTotalPages(Math.ceil(data.totalCount / CONVERSATIONS_PER_PAGE));
      setTotalConversations(data.totalCount || 0);
      
      // Asegurar que la página actual siga siendo correcta (doble comprobación)
      console.log(`Estado de página actualizado a: ${page}`);
      
      // IMPORTANTE: Cancelar cualquier efecto secundario o actualización pendiente
      // que pudiera interferir con nuestra navegación
      ignoreNextRefreshRef.current = true;
      setTimeout(() => {
        ignoreNextRefreshRef.current = false;
      }, 500);
      
    } catch (error) {
      console.error('Error al cambiar de página:', error);
      setError('No se pudieron cargar las conversaciones para esta página');
    } finally {
      setLoadingPage(false);
      paginationRequestInProgressRef.current = false;
    }
  }, [currentPageRef, selectedFilter, generalSearchTerm, processConvResponse]);

  // Cargar más conversaciones (incrementar página)
  const loadMoreConversations = useCallback(() => {
    // Usar la nueva función changePage para navegar a la siguiente página
    changePage(currentPageRef.current + 1);
  }, [changePage, currentPageRef]);

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
        await fetchConversations(false);
        
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
            
            // Verificar permisos de administrador
            if (convData.isGroup && convData.participants) {
              const currentUserParticipant = convData.participants.find(
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
            fetchConversations(false).then(() => {
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
    let filtered = combinedList;
    
    // Filtro por tipo
    filtered = filtered.filter(item => {
      if (selectedFilter === 'all') return true;
      
      if (item.isConversation) {
        const conv = item.data as Conversation;
        
        // Filtro para grupos
        if (selectedFilter === 'group') return conv.isGroup === true;
        
        // Filtro para privados (chats 1:1 y grupos privados donde el usuario es miembro)
        if (selectedFilter === 'private') {
          // Chats 1:1
          if (conv.isGroup !== true) return true;
          
          // Grupos privados donde el usuario es miembro
          if (!conv.participants || !session?.user?.id) return false;
          return conv.participants.some(p => p.userId === session.user?.id);
        }
      } else {
        // Usuarios solo se muestran en filtro privado
        return selectedFilter === 'private';
      }
      
      return false;
    });
    
    // Filtro por búsqueda
    if (generalSearchTerm.trim()) {
      const searchTerm = generalSearchTerm.toLowerCase().trim();
      
      filtered = filtered.filter(item => {
        if (item.isConversation) {
          const conv = item.data as Conversation;
          
          if (conv.isGroup) {
            // Búsqueda en grupos
            return (conv.name || '').toLowerCase().includes(searchTerm);
          } else {
            // Búsqueda en conversaciones 1:1
            const otherUser = conv.otherUser;
            const lastMessageContent = (conv.lastMessage?.content || '').toLowerCase();
            
            return (
              (otherUser?.username || '').toLowerCase().includes(searchTerm) ||
              (otherUser?.name || '').toLowerCase().includes(searchTerm) ||
              lastMessageContent.includes(searchTerm)
            );
          }
        } else {
          // Búsqueda en usuarios
          const user = item.data as User;
          return (
            (user.username || '').toLowerCase().includes(searchTerm) ||
            (user.name || '').toLowerCase().includes(searchTerm)
          );
        }
      });
    }
    
    return filtered;
  }, [combinedList, selectedFilter, generalSearchTerm, session?.user?.id]);

  // Actualizar tamaño de pantalla
  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth < 768);
    
    handleResize(); // Comprobar tamaño inicial
    window.addEventListener("resize", handleResize);
    
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Función para actualizar el término de búsqueda con debounce
  const setGeneralSearchTerm = useCallback((term: string) => {
    // Limpiar el timeout anterior si existe
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    
    // Generar un ID único para esta solicitud de búsqueda
    // Usamos una alternativa segura compatible con todos los navegadores y entornos
    let searchId;
    try {
      searchId = crypto.randomUUID();
    } catch  {
      // Fallback si randomUUID no está disponible
      const d = new Date().getTime();
      searchId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = (d + Math.random() * 16) % 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }
    lastSearchIdRef.current = searchId;
    
    // Actualizar inmediatamente el estado para la UI
    setGeneralSearchTermState(term);
    
    // Activar bandera para bloquear otras actualizaciones
    ignoreNextRefreshRef.current = true;
    
    // Debounce para evitar múltiples peticiones durante la escritura rápida
    searchDebounceRef.current = setTimeout(async () => {
      console.log(`[${searchId}] Término de búsqueda actualizado a: "${term}" (debounce completado)`);
      
      // Si esta no es la solicitud de búsqueda más reciente, cancelarla
      if (searchId !== lastSearchIdRef.current) {
        console.log(`[${searchId}] Búsqueda obsoleta cancelada. La más reciente es: ${lastSearchIdRef.current}`);
        return;
      }
      
      // IMPORTANTE: Marcar que hay una solicitud de búsqueda en progreso
      searchRequestInProgressRef.current = true;
      
      // Resetear a la página 1 al buscar
      currentPageRef.current = 1;
      
      try {
        // Si el término de búsqueda está vacío, no hacemos petición
        // Esto previene las peticiones duplicadas al vaciar el campo
        if (!term.trim()) {
          console.log(`[${searchId}] Término de búsqueda vacío, no realizando petición adicional`);
          // Solo restauramos flags para permitir que las otras peticiones funcionen
          searchRequestInProgressRef.current = false;
          
          // IMPORTANTE: No resetear ignoreNextRefreshRef aquí para evitar que 
          // se disparen otras peticiones inmediatamente
          setTimeout(() => {
            ignoreNextRefreshRef.current = false;
          }, 600); // Incrementado el tiempo para asegurar que no haya conflictos
          
          return; // Salimos sin hacer petición
        }
        
        // Si hay término de búsqueda, procedemos normalmente
        const params = new URLSearchParams();
        params.append('page', '1'); // Siempre página 1 en búsquedas
        params.append('limit', CONVERSATIONS_PER_PAGE.toString());
        
        // IMPORTANTE: Usamos siempre el filtro actual seleccionado, nunca hardcodeamos
        console.log(`[${searchId}] Usando filtro actual para búsqueda: '${selectedFilter}'`);
        params.append('filter', selectedFilter);
        params.append('search', encodeURIComponent(term.trim()));
        
        const url = `/api/messages/conversations?${params.toString()}`;
        console.log(`[${searchId}] Realizando búsqueda directa: ${url}`);
        
        // IMPORTANTE: Esta es una llamada directa al API, no usa fetchConversations
        // para evitar cualquier conflicto con otras solicitudes
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error(`Error en búsqueda: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[${searchId}] Búsqueda completada: ${data.conversations.length} resultados`);
        
        // Procesar las conversaciones
        const conversationsData = data.conversations || [];
        const processedConversations = await processConvResponse(
          new Response(JSON.stringify(conversationsData))
        );
        
        // Verificar que esta sigue siendo la búsqueda más reciente antes de actualizar el estado
        if (searchId === lastSearchIdRef.current) {
          setConversations(processedConversations);
          setTotalPages(Math.ceil(data.totalCount / CONVERSATIONS_PER_PAGE));
          setTotalConversations(data.totalCount || 0);
          console.log(`[${searchId}] Estado actualizado con resultados de búsqueda`);
        } else {
          console.log(`[${searchId}] Descartando resultados de búsqueda obsoleta`);
        }
        
      } catch (error) {
        console.error(`[${searchId}] Error en búsqueda:`, error);
        setError('Error al realizar la búsqueda');
      } finally {
        // Solo liberar el bloqueo si esta sigue siendo la última búsqueda
        if (searchId === lastSearchIdRef.current) {
          searchRequestInProgressRef.current = false;
          
          // Restaurar flag después de un tiempo
          setTimeout(() => {
            ignoreNextRefreshRef.current = false;
          }, 500);
          
          console.log(`[${searchId}] Búsqueda finalizada y flags restaurados`);
        }
      }
    }, 400); // Aumentado a 400ms para dar más tiempo entre pulsaciones de teclas
  }, [CONVERSATIONS_PER_PAGE, processConvResponse, selectedFilter]);

  // Wrapper para manejar el cambio de filtro - ahora más robusto
  const setSelectedFilter = useCallback((filter: FilterType) => {
    console.log(`useMessagesState: Estableciendo filtro a ${filter}`);
    
    // Si el filtro es el mismo, no hacer nada
    if (filter === selectedFilter) {
      console.log('El filtro seleccionado es el mismo, ignorando');
      return;
    }
    
    // Guardar filtro en sessionStorage inmediatamente
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('messagesFilter', filter);
      console.log(`Filtro guardado en sessionStorage: ${filter}`);
    }
    
    // Si hay una búsqueda activa, limpiarla primero (para prevenir filtrado doble)
    if (generalSearchTerm.trim()) {
      console.log('Limpiando término de búsqueda al cambiar filtro');
      setGeneralSearchTermState(''); // Resetear la búsqueda al cambiar filtro
    }
    
    // Actualizar estado del filtro
    setSelectedFilterState(filter);
    currentPageRef.current = 1;
    
    // Disparar la petición con el nuevo filtro
    fetchConversations(true, true, filter);
  }, [fetchConversations, selectedFilter, generalSearchTerm]);

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
          role: 'member' as const,
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
      // Carga inicial normal (reset a página 1)
      fetchConversations(true);
      
      // IMPORTANTE: Se deshabilitan TODAS las actualizaciones automáticas
      // para resolver el problema de paginación. Estas se pueden reactivar
      // después cuando se solucione el problema principal.
      
      /* DESACTIVADO TEMPORALMENTE
      const intervalId = setInterval(() => {
        console.log(`Actualización periódica - manteniendo página ${currentPageRef.current}`);
        fetchConversations(false, false);
      }, REFRESH_INTERVAL);
      
      return () => clearInterval(intervalId);
      */
    }
  }, [status, fetchConversations]);

  // Manejar cambio de filtro
  useEffect(() => {
    // Solo ejecutar este efecto cuando cambie explícitamente el filtro
    // y no durante la carga inicial o durante una solicitud de paginación en curso
    if (!_isInitialLoadRef.current && !paginationRequestInProgressRef.current && !ignoreNextRefreshRef.current) {
      console.log(`Cambio EXPLÍCITO de filtro: ${selectedFilter}`);
      
      // Aquí SÍ debemos resetear a página 1 (es comportamiento esperado con filtros)
      currentPageRef.current = 1;
      // Importante: llamar a fetchConversations con resetToPage1=false para evitar doble reset
      fetchConversations(true, false);
    }
    
    // Resetear el flag después de ignorar una actualización
    if (ignoreNextRefreshRef.current) {
      ignoreNextRefreshRef.current = false;
    }
  }, [selectedFilter, fetchConversations]);

  return {
    // Estados
    conversations,
    mutualFollowers,
    mutualFollowersForGroups,
    combinedList,
    filteredConversations,
    loading,
    error,
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
    
    // Estados de paginación
    currentPage: currentPageRef.current,
    totalPages,
    totalConversations,
    loadingPage,
    loadMoreConversations,
    changePage,
    
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
