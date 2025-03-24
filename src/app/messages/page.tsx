"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from 'next-auth/react';
import { MessageType } from "@/src/hooks/useSocket";
import { UnreadMessagesContext } from "@/src/app/contexts/UnreadMessagesContext";
import { API_ROUTES } from "@/src/config/api-routes";
import { ChatWindowContent } from "@/src/app/components/Chat/ChatWindowContent";
import { MessageCircle, Search, MessageSquare, ArrowLeft, MessageSquarePlus } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/app/components/ui/avatar";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import Image from "next/image";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";
import { CldImage } from "next-cloudinary";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/app/components/ui/dialog";

// Interfaces optimizadas
interface User {
  id: string;
  username: string | null;
  image: string | null;
  name?: string;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
  tempId?: string;
  messageType?: 'text' | 'image' | 'voice' | 'file' | 'video';
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  otherUser: User;
  lastMessage: Message | null;
  createdAt?: string;
  updatedAt: string;
  senderId?: string;
  receiverId?: string;
  sender?: {
    id: string;
    username: string | null;
    image: string | null;
  };
  receiver?: {
    id: string;
    username: string | null;
    image: string | null;
  };
  unreadCount?: number;
  lastInteraction?: Date;
  isEmpty?: boolean;
}

interface CombinedItem {
  id: string;
  isConversation: boolean;
  data: Conversation | User;
  lastInteraction?: Date;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const unreadMessagesContext = React.useContext(UnreadMessagesContext);

  // Configuración
  const CONVERSATIONS_PER_PAGE = 15;
  const REFRESH_INTERVAL = 60000; // 60 segundos
  
  // Estados centralizados
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [combinedList, setCombinedList] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generalSearchTerm, setGeneralSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  
  // Referencias para controlar ciclos y renderizado
  const isProcessingUrlRef = useRef(false);
  
  // Funciones memoizadas para procesar respuestas API
  const processConvResponse = useCallback(async (convRes: Response): Promise<Conversation[]> => {
    if (!convRes.ok) {
      console.error(`Error response: ${convRes.status}`);
      return [];
    }

    try {
      const rawData = await convRes.json();
      
      console.log("API response for conversations:", rawData);
      
      let conversations: any[] = [];
      
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
          // Manejar caso de una única conversación con receptor
          conversations = [rawData];
        } else if (rawData.conversation?.id) {
          conversations = [rawData.conversation];
        } else if (rawData.conversations && typeof rawData.conversations === 'object' && !Array.isArray(rawData.conversations)) {
          // Manejar caso de objeto de conversaciones (no array)
          conversations = Object.values(rawData.conversations);
        }
      }
      
      // Log para depuración
      console.log(`Found ${conversations.length} conversations from API response`);
      
      // Filtrar conversaciones válidas y formatearlas correctamente
      const validConversations = conversations
        .filter(conv => conv && typeof conv === 'object' && conv.id && (conv.receiver || conv.otherUser))
        .map((conv) => {
          const otherUser = conv.receiver || conv.otherUser || {};
          
          return {
            id: conv.id,
            otherUser: {
              id: otherUser.id,
              username: otherUser.username || null,
              image: otherUser.image || null,
              name: otherUser.name || null
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
          };
        });
      
      console.log(`Processed ${validConversations.length} valid conversations`);
      return validConversations;
    } catch (error) {
      console.error('Error parsing conversation response:', error);
      return [];
    }
  }, [session?.user?.id, session?.user?.username, session?.user?.image]);

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

  const mergeAndSort = useCallback((
    existing: Conversation[],
    newConvs: Conversation[]
  ): Conversation[] => {
    // Crear un mapa para actualizar conversaciones existentes y añadir nuevas
    const conversationMap = new Map<string, Conversation>();
    
    // Primero añadir las conversaciones existentes al mapa
    existing.forEach(conv => conversationMap.set(conv.id, conv));
    
    // Luego actualizar o añadir las nuevas
    newConvs.forEach(conv => {
      if (conversationMap.has(conv.id)) {
        // Si existe, preservar contadores de no leídos
        const existingConv = conversationMap.get(conv.id)!;
        conversationMap.set(conv.id, {
          ...conv,
          unreadCount: Math.max(conv.unreadCount || 0, existingConv.unreadCount || 0)
        });
      } else {
        conversationMap.set(conv.id, conv);
      }
    });
    
    // Convertir el mapa a array y ordenar por fecha de actualización
    return Array.from(conversationMap.values())
      .sort((a, b) => 
        new Date(b.updatedAt || Date.now()).getTime() - 
        new Date(a.updatedAt || Date.now()).getTime()
      );
  }, []);

  // Detectar tamaño de pantalla para vista móvil
  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Cargar datos y función de recarga manual
  const loadConversationsData = useCallback(async () => {
    if (!session || !session.user || !session.user.id) return;

    try {
      setLoading(true);
      
      // Añadir timestamp para evitar caché
      const timestamp = Date.now();
      
      // Obtener conversaciones
      const conversationsRes = await fetch(
        `${API_ROUTES.messages.conversations}?page=1&limit=${CONVERSATIONS_PER_PAGE}&t=${timestamp}`,
        { cache: 'no-store' }
      );
      
      if (!conversationsRes.ok) {
        throw new Error(`Error al cargar conversaciones: ${conversationsRes.status}`);
      }
      
      const convData = await processConvResponse(conversationsRes);
      setConversations(convData);
      
      // Limpiar localStorage de conversaciones que ya no existen
      if (typeof window !== 'undefined') {
        // Obtener la lista de IDs de conversaciones existentes
        const existingConvIds = convData.map(conv => conv.id);
        
        // Buscar en localStorage las claves que empiezan con "chat_conv_"
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('chat_conv_')) {
            const storedConvId = localStorage.getItem(key);
            // Si la conversación almacenada ya no existe en la lista actual, eliminarla
            if (storedConvId && !existingConvIds.includes(storedConvId)) {
              console.log(`Eliminando referencia a conversación eliminada: ${storedConvId}`);
              localStorage.removeItem(key);
            }
          }
        });
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [processConvResponse, CONVERSATIONS_PER_PAGE, session?.user?.id]);

  // Cargar datos iniciales cuando el usuario está autenticado
  useEffect(() => {
    // Verificar autenticación y redireccionar si es necesario
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    // Verificar que el correo electrónico esté verificado
    if (status === "authenticated" && !session?.user?.emailVerified) {
      router.push("/auth/verification-pending");
      return;
    }

    if (status === "authenticated") {
      // Cargar datos inmediatamente
      loadConversationsData();
    }
  }, [status, router, session, loadConversationsData]);

  // Actualizar lista combinada cuando cambian las conversaciones o seguidores mutuos
  useEffect(() => {
    const newCombinedList: CombinedItem[] = [
      ...conversations.map(conv => ({
        id: conv.id,
        isConversation: true,
        data: conv,
        lastInteraction: conv.lastInteraction,
      })),
      ...mutualFollowers.filter(user => 
        // Evitar duplicados - no mostrar usuarios que ya tienen una conversación
        !conversations.some(conv => 
          conv.otherUser?.id === user.id || 
          conv.receiverId === user.id || 
          conv.senderId === user.id
        )
      ).map(user => ({
        id: user.id,
        isConversation: false,
        data: user,
      })),
    ];

    // Solo actualizar si hay cambios significativos
    const hasChanges = 
      newCombinedList.length !== combinedList.length || 
      newCombinedList.some((item, index) => 
        combinedList[index]?.id !== item.id || 
        combinedList[index]?.isConversation !== item.isConversation
      );

    if (hasChanges) {
      setCombinedList(newCombinedList);
    }
  }, [conversations, mutualFollowers, combinedList]);

  // Procesar parámetros de URL para seleccionar conversación
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }
    
    if (status !== "authenticated") return;
    
    const conversationIdParam = searchParams.get("conversationWith");
    
    if (isProcessingUrlRef.current) return;
    
    isProcessingUrlRef.current = true;
    
    const processUrl = async () => {
      try {
        if (conversationIdParam) {
          if (conversations.length === 0) {
            setTimeout(() => {
              isProcessingUrlRef.current = false;
            }, 500);
            return;
          }
          
          const targetConv = conversations.find(conv =>
            (conv?.otherUser?.id === conversationIdParam) ||
            (conv?.receiverId === conversationIdParam) ||
            (conv?.senderId === conversationIdParam)
          );
          
          if (targetConv) {
            if (selectedConversation !== targetConv.id) {
              setSelectedConversation(targetConv.id);
            }
          } 
          else if (!selectedConversation && mutualFollowers.length > 0) {
            const isValidUser = mutualFollowers.some(user => user.id === conversationIdParam);
            
            if (isValidUser) {
              await startNewConversation(conversationIdParam);
            } else {
              router.push("/messages");
            }
          }
        }
      } catch (error) {
        console.error("Error procesando URL:", error);
      } finally {
        setTimeout(() => {
          isProcessingUrlRef.current = false;
        }, 300);
      }
    };
    
    processUrl();
  }, [searchParams, status, conversations, selectedConversation, mutualFollowers, router]);

  useEffect(() => {
    if (!selectedConversation) return;
    
    // Verificamos si la conversación seleccionada todavía existe
    const conversationExists = conversations.some(conv => conv.id === selectedConversation);
    
    // Si la conversación ya no existe, deseleccionamos
    if (!conversationExists) {
      console.log(`La conversación seleccionada ${selectedConversation} ya no existe`);
      setSelectedConversation(null);
      return;
    }
  }, [selectedConversation, conversations]);

  const filteredCombinedList = useMemo(() => {
    return combinedList.filter((item) => {
      if (item.isConversation) {
        const conversation = item.data as Conversation;
        const username = conversation.otherUser?.username?.toLowerCase() || "";
        const searchTerm = generalSearchTerm.toLowerCase();
        return searchTerm.trim() === "" || username.includes(searchTerm);
      } else {
        const user = item.data as User;
        const username = user.username?.toLowerCase() || "";
        const searchTerm = generalSearchTerm.toLowerCase();
        return searchTerm.trim() === "" || username.includes(searchTerm);
      }
    });
  }, [combinedList, generalSearchTerm]);

  useEffect(() => {
    console.log(`Filtered combinedList has ${filteredCombinedList.length} items (search: "${generalSearchTerm}")`);
  }, [filteredCombinedList.length, generalSearchTerm]);

  // Función para iniciar una nueva conversación - optimizada y memoizada
  const startNewConversation = useCallback(async (userId: string) => {
    try {
      if (!userId || !session?.user?.id) {
        console.error("Missing user ID or session");
        return;
      }
      
      setCreatingConversation(true);
      
      // Verificar si el usuario está en los seguidores mutuos
      const isMutualFollower = mutualFollowers.some(user => user.id === userId);
      const existingConversation = conversations.some(conv => conv.otherUser?.id === userId);
      
      if (existingConversation) {
        // Si ya existe una conversación, solo seleccionarla
        const conversation = conversations.find(conv => conv.otherUser?.id === userId);
        if (conversation) {
          setSelectedConversation(conversation.id);
          router.push(`/messages?conversationWith=${userId}`);
          setCreatingConversation(false);
          return;
        }
      }
      
      if (!isMutualFollower) {
        // Verificar manualmente si es un seguidor mutuo en caso de que mutualFollowers no esté actualizado
        const checkMutualResponse = await fetch(`${API_ROUTES.relationships.mutual}?userId=${userId}`);
        if (!checkMutualResponse.ok) {
          throw new Error("No es posible crear una conversación con este usuario");
        }
        
        const checkMutualData = await checkMutualResponse.json();
        const isMutual = checkMutualData.some((u: User) => u.id === userId);
        
        if (!isMutual) {
          throw new Error("Solo puedes enviar mensajes a usuarios que te siguen mutuamente");
        }
      }
      
      console.log("Creating new conversation with user:", userId);
      
      // Cargar datos del usuario
      const userResponse = await fetch(`/api/users/${userId}`);
      if (!userResponse.ok) {
        throw new Error("Failed to fetch user data");
      }
      
      const userData = await userResponse.json();
      
      // Usar el endpoint de conversaciones en lugar de crear a través de mensajes
      const response = await fetch('/api/messages/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiverId: userId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create conversation");
      }
      
      const data = await response.json();
      console.log("New conversation created:", data);
      
      // Crear objeto de conversación
      const newConversation: Conversation = {
        id: data.conversationId || `temp-${Date.now()}`,
        otherUser: {
          id: userId,
          username: userData.username || null,
          image: userData.image || null,
        },
        lastMessage: null,
        updatedAt: new Date().toISOString(),
        senderId: session.user.id,
        receiverId: userId,
        sender: {
          id: session.user.id,
          username: session.user.username || null,
          image: session.user.image || null,
        },
        receiver: {
          id: userId,
          username: userData.username || null,
          image: userData.image || null,
        },
        unreadCount: 0,
        isEmpty: true
      };
      
      // Actualizar el estado con la nueva conversación
      setConversations(prev => {
        const updatedConversations = [...prev];
        
        // Verificar que la conversación no existe ya (por id o por userId)
        const exists = updatedConversations.some(
          c => c.id === newConversation.id || c.otherUser?.id === newConversation.otherUser.id
        );
        
        if (!exists) {
          updatedConversations.push(newConversation);
        }
        
        return updatedConversations;
      });
      
      // Filtrar al usuario de la lista de seguidores mutuos para que no aparezca más
      setMutualFollowers(prev => prev.filter(user => user?.id !== userId));
      
      // Seleccionar la nueva conversación
      setSelectedConversation(newConversation.id);
      
      // Actualizar la URL
      router.push(`/messages?conversationWith=${userId}`);
      
      // Forzar una recarga de conversaciones desde el servidor para asegurarnos de tener datos actualizados
      setTimeout(async () => {
        const freshConvRes = await fetch(`${API_ROUTES.messages.conversations}?page=1&limit=${CONVERSATIONS_PER_PAGE}`);
        const freshConversations = await processConvResponse(freshConvRes);
        if (freshConversations.length > 0) {
          console.log("Refreshed conversations from server:", freshConversations.length);
          setConversations(freshConversations);
        }
      }, 1000);
      
    } catch (error) {
      console.error("Error starting conversation:", error);
      alert(error instanceof Error ? error.message : "No se pudo iniciar la conversación. Inténtalo de nuevo.");
    } finally {
      setCreatingConversation(false);
    }
  }, [conversations, mutualFollowers, session?.user?.id, session?.user?.username, session?.user?.image, router, processConvResponse, CONVERSATIONS_PER_PAGE]);

  // Efecto para cargar datos de seguidores mutuos al abrir el modal
  useEffect(() => {
    const fetchMutualFollowers = async () => {
      if (!showNewMessageModal || !session?.user?.id) return;
      
      try {
        const mutualResponse = await fetch(`${API_ROUTES.relationships.mutual}?t=${Date.now()}`);
        const mutualData = await processMutualResponse(mutualResponse);
        
        // Filtrar usuarios que ya tienen conversaciones existentes
        const filteredMutuals = mutualData.filter(user => 
          !conversations.some(conv => 
            conv.otherUser?.id === user.id || 
            conv.receiverId === user.id || 
            conv.senderId === user.id
          )
        );
        
        setMutualFollowers(filteredMutuals);
      } catch (error) {
        console.error("Error fetching mutual followers:", error);
      }
    };
    
    fetchMutualFollowers();
  }, [showNewMessageModal, processMutualResponse, session?.user?.id, conversations]);

  // Función para seleccionar una conversación - memoizada
  const handleConversationSelect = useCallback((conversationId: string) => {
    const conversation = conversations.find((c) => c?.id === conversationId);
    if (conversation) {
      const otherUserId =
        conversation.senderId === session?.user?.id
          ? conversation.receiverId
          : conversation.senderId;
      if (otherUserId) {
        router.push(`/messages?conversationWith=${otherUserId}`);
        setSelectedConversation(conversationId);
      }
    }
  }, [conversations, router, session?.user?.id]);

  // Función para volver a la lista de conversaciones - memoizada
  const handleBackToList = useCallback(() => {
    setSelectedConversation(null);
    if (mobileView) {
      router.push("/messages", { scroll: false });
    }
  }, [mobileView, router]);

  // Valores calculados derivados del estado
  const selectedConversationData = useMemo(() => 
    conversations.find((conv) => conv.id === selectedConversation),
    [conversations, selectedConversation]
  );
  
  const otherUser = useMemo(() => 
    selectedConversationData ? selectedConversationData.otherUser : null,
    [selectedConversationData]
  );

  // Renderizado de mensajes de conversación - memoizado
  const renderConversationMessage = useCallback((conversation: Conversation) => {
    if (conversation.isEmpty || !conversation.lastMessage) {
      return (
        <p className="text-sm text-gray-500 truncate">
          No hay mensajes aún. ¡Envía el primero!
        </p>
      );
    }
    
    const isCurrentUserSender = conversation.lastMessage.senderId === session?.user?.id;
    return (
      <p className="text-sm text-gray-500 truncate">
        {isCurrentUserSender ? `Tú: ` : ""}{conversation.lastMessage.content}
      </p>
    );
  }, [session?.user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col md:flex-row min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Panel izquierdo - Lista de conversaciones y seguidores mutuos */}
      <div className={`w-full md:w-1/3 lg:w-1/4 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col ${mobileView && selectedConversation ? "hidden md:flex" : "flex"}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h1 className="text-xl font-semibold">Mensajes</h1>
          
          <div className="flex items-center space-x-2">
            {/* Botón de actualización */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={loadConversationsData}
              title="Actualizar conversaciones"
              aria-label="Actualizar conversaciones"
              className="rounded-full"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" 
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path>
                <path d="M16 21h5v-5"></path>
              </svg>
            </Button>
            {/* Botón para nuevo mensaje */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowNewMessageModal(true)}
              title="Nuevo mensaje"
              aria-label="Nuevo mensaje"
              className="rounded-full"
            >
              <MessageSquarePlus size={20} />
            </Button>
          </div>
        </div>
          
        <div className="p-2">
          <Input
            type="text"
            placeholder="Buscar..."
            value={generalSearchTerm}
            onChange={(e) => setGeneralSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
          
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner className="w-8 h-8 animate-spin mx-auto text-gray-500" />
              <p className="mt-2 text-sm text-gray-500">Cargando conversaciones...</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {/* Tabs */}
            {filteredCombinedList.length > 0 && filteredCombinedList.some(item => item.isConversation) ? (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredCombinedList
                  .filter(item => item.isConversation)
                  .map((item) => {
                    const conversation = item.data as Conversation;
                    const isSelected = selectedConversation === conversation.id;
                      
                    return (
                      <div
                        key={conversation.id}
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-start space-x-3 ${isSelected && "bg-blue-50 dark:bg-gray-700"}`}
                        onClick={() => handleConversationSelect(conversation.id)}
                      >
                        <Avatar className="h-12 w-12 border-2 border-gray-200 dark:border-gray-700">
                          {conversation.otherUser?.image ? (
                            <Image
                              src="/images/AvatarPredeterminado.webp"
                              width={48}
                              height={48}
                              alt={conversation.otherUser?.username || "Usuario"}
                              className="h-12 w-12 rounded-full object-cover"
                              onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "/images/AvatarPredeterminado.webp";
                              }}
                            />
                          ) : (
                            <AvatarFallback>
                              {conversation.otherUser?.username?.charAt(0).toUpperCase() || "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                          
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium truncate">
                              {conversation.otherUser?.username || "Usuario desconocido"}
                            </h3>
                            <span className="text-xs text-gray-500">
                              {conversation.updatedAt && new Date(conversation.updatedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          {renderConversationMessage(conversation)}
                        </div>
                        {(conversation.unreadCount ?? 0) > 0 && (
                          <div className="flex-shrink-0 ml-2">
                            <div className="bg-blue-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                              {(conversation.unreadCount ?? 0) > 9 ? "9+" : (conversation.unreadCount ?? 0)}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-500">
                {generalSearchTerm ? "No se encontraron resultados" : "No tienes conversaciones"}
              </div>
            )}
          </div>
        )}
        
        {/* Nuevo botón para crear conversaciones */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <Button
            onClick={() => setShowNewMessageModal(true)}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-lg"
          >
            <MessageSquarePlus className="h-5 w-5 mr-2" />
            Nuevo mensaje
          </Button>
        </div>
      </div>

      {/* Panel derecho - Contenido de la conversación seleccionada */}
      <div className={`w-full md:w-2/3 lg:w-3/4 bg-white dark:bg-gray-800 flex flex-col ${!mobileView || (mobileView && selectedConversation) ? "flex" : "hidden md:flex"}`}>
        {selectedConversation && otherUser ? (
          // Contenido de la conversación
          <div className="h-full flex flex-col">
            {/* Cabecera de la conversación */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                {mobileView && (
                  <Button variant="ghost" size="icon" onClick={handleBackToList}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <Avatar className="h-10 w-10">
                  {otherUser.image ? (
                    <Image
                      src="/images/AvatarPredeterminado.webp"
                      width={48}
                      height={48}
                      alt={otherUser.username || "Usuario"}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : (
                    <AvatarFallback>
                      {otherUser.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <h2 className="font-medium">{otherUser.username || "Usuario"}</h2>
              </div>
            </div>
            
            {/* Contenido de la conversación integrado directamente */}
            <ChatWindowContent 
              conversationId={selectedConversation}
              otherUser={otherUser}
              key={`chat-content-${selectedConversation}`}
            />
          </div>
        ) : (
          // Panel de bienvenida cuando no hay conversación seleccionada
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-md">
              <MessageSquare className="mx-auto h-16 w-16 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Tus mensajes</h2>
              <p className="text-gray-500 mb-6">
                Selecciona una conversación de la lista o inicia una nueva para comenzar a chatear.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Modal para crear una nueva conversación */}
    <Dialog open={showNewMessageModal} onOpenChange={setShowNewMessageModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo mensaje</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-2">
          {creatingConversation ? (
            <div className="flex flex-col items-center py-4">
              <LoadingSpinner className="h-10 w-10 mb-4" />
              <p className="text-center text-sm text-gray-500">Creando conversación...</p>
            </div>
          ) : (
            <>
              <Input 
                placeholder="Buscar usuario..." 
                value={generalSearchTerm} 
                onChange={(e) => setGeneralSearchTerm(e.target.value)}
                className="mb-4"
              />
              
              {filteredCombinedList.filter(item => !item.isConversation).length === 0 ? (
                <div className="text-center py-4">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-gray-500 mb-2">No se encontraron seguidores mutuos.</p>
                  <p className="text-sm text-gray-400">Solo puedes iniciar conversaciones con usuarios que te siguen mutuamente.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {filteredCombinedList
                    .filter(item => !item.isConversation)
                    .map((item) => {
                      const user = item.data as User;
                      return (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition cursor-pointer"
                          onClick={() => {
                            setShowNewMessageModal(false);
                            startNewConversation(user.id);
                          }}
                        >
                          <Avatar className="h-10 w-10">
                            {user.image ? (
                              <Image 
                                src="/images/AvatarPredeterminado.webp" 
                                alt={user.username || "Usuario"} 
                                width={40} 
                                height={40}
                                className="rounded-full object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            ) : (
                              <AvatarFallback>
                                {user.username?.charAt(0).toUpperCase() || "U"}
                              </AvatarFallback>
                            )}
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{user.username || "Usuario"}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
