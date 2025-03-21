"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from 'next-auth/react';
import { ChatWindow } from "@/src/app/components/Chat/ChatWindow";
import { MessageCircle, Search } from "lucide-react";
import { Avatar } from "@/src/app/components/ui/avatar";
import { Input } from '@/src/app/components/ui/input';
import Image from "next/image";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";
import useSocket, { MessageType } from "@/src/hooks/useSocket";
import { UnreadMessagesContext } from "@/src/app/contexts/UnreadMessagesContext";
import { CldImage } from "next-cloudinary";
import { API_ROUTES } from "@/src/config/api-routes";

interface User {
  id: string;
  username: string | null;
  image: string | null;
}

export interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  read: boolean;
  tempId?: string;
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
}

interface CombinedItem {
  id: string;
  isConversation: boolean;
  data: Conversation | User;
  lastInteraction?: Date;
}

interface _ApiResponse<T> {
  data: T;
  error?: string;
}

interface _SearchResult {
  id: string;
  username: string;
  name?: string;
  image?: string;
  following?: boolean;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const unreadMessagesContext = React.useContext(UnreadMessagesContext);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [combinedList, setCombinedList] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generalSearchTerm, setGeneralSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState(false);

  const CONVERSATIONS_PER_PAGE = 15;

  const processConvResponse = useCallback(async (convRes: Response): Promise<Conversation[]> => {
    if (!convRes.ok) {
      console.error(`Error response from conversations API: ${convRes.status}`);
      throw new Error("Error al cargar conversaciones");
    }
    
    try {
      const data = await convRes.json();
      
      // Verificar si la respuesta es un array (formato nuevo) o un objeto (formato antiguo)
      interface Conversation {
        id: string;
        receiver: {
          id: string;
          username: string | null;
          image: string | null;
        };
        lastMessage?: {
          id: string;
          content: string;
          senderId: string;
          receiverId: string;
          createdAt: string;
          read: boolean;
        };
        unreadCount: number;
        createdAt: string;
        updatedAt: string;
      }
      
      let conversations: Conversation[] = [];
      
      if (Array.isArray(data)) {
        conversations = data;
      } else if (data && typeof data === 'object' && Array.isArray(data.conversations)) {
        conversations = data.conversations;
      } else {
        console.warn('Formato de respuesta inesperado:', data);
        return []; // Devolver array vacío en caso de formato desconocido
      }
      
      console.log(`Loaded ${conversations.length} conversations`);

      return conversations
        .filter(conv => {
          // Validar que cada conversación tenga los campos necesarios
          const isValid = conv && typeof conv === 'object' && conv.id && conv.receiver;
          if (!isValid) {
            console.warn('Conversación inválida encontrada:', conv);
          }
          return isValid;
        })
        .map((conv: {
          id: string;
          receiver: User;
          lastMessage?: Message;
          unreadCount: number;
          createdAt: string;
          updatedAt: string;
        }) => ({
          id: conv.id,
          otherUser: conv.receiver,
          lastMessage: conv.lastMessage ? {
            ...conv.lastMessage,
            createdAt: typeof conv.lastMessage.createdAt === 'string' ? 
              new Date(conv.lastMessage.createdAt).toISOString() : 
              conv.lastMessage.createdAt,
          } : null,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt || new Date().toISOString(),
          senderId: session?.user?.id || '',
          receiverId: conv.receiver.id,
          sender: {
            id: session?.user?.id || '',
            username: session?.user?.username || null,
            image: session?.user?.image || null,
          },
          receiver: conv.receiver,
          unreadCount: conv.unreadCount,
        }));
    } catch (error) {
      console.error('Error parsing conversation response:', error);
      return [];
    }
  }, [session?.user?.id, session?.user?.username, session?.user?.image]);

  const processMutualResponse = useCallback(async (mutualRes: Response): Promise<User[]> => {
    if (!mutualRes.ok) throw new Error("Error al cargar seguidores mutuos");
    const data = await mutualRes.json();
    return data.filter((user: User) => user.id !== session?.user?.id);
  }, [session?.user?.id]);

  const mergeAndSort = useCallback((
    existing: Conversation[],
    newConvs: Conversation[]
  ): Conversation[] => {
    const existingIds = new Set(existing.map(c => c.id));
    const merged = [
      ...newConvs,
      ...existing.filter(ec => !existingIds.has(ec.id))
    ];

    return merged.sort((a, b) =>
      new Date(b.updatedAt || Date.now().toString()).getTime() -
      new Date(a.updatedAt || Date.now().toString()).getTime()
    );
  }, []);

  useEffect(() => {
    const savedConversations = localStorage.getItem("conversations");
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

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
      let isMounted = true;

      const loadData = async () => {
        try {
          const [convRes, mutualRes] = await Promise.all([
            fetch(`${API_ROUTES.messages.conversations}?page=1&limit=${CONVERSATIONS_PER_PAGE}`),
            fetch(API_ROUTES.relationships.mutual)
          ]);

          if (isMounted) {
            const conversations = await processConvResponse(convRes);
            const mutuals = await processMutualResponse(mutualRes);

            setConversations(prev => mergeAndSort(prev, conversations));
            setMutualFollowers(mutuals);
          }
        } catch (error) {
          console.error("Error loading data:", error);
        } finally {
          if (isMounted) setLoading(false);
        }
      };

      loadData();
      return () => { isMounted = false; };
    }
  }, [status, processConvResponse, processMutualResponse, mergeAndSort, router, session]);

  useEffect(() => {
    const combineLists = () => {
      if (!Array.isArray(conversations)) {
        console.error("Conversations is not an array", conversations);
        setCombinedList([]);
        return;
      }
      
      // Debug output
      console.log(`Combining lists: ${conversations.length} conversations and ${mutualFollowers.length} mutual followers`);
      
      // Filter out invalid conversations
      const validConversations = conversations.filter(
        conv => conv && typeof conv === 'object' && conv.otherUser && conv.otherUser.id
      );
      
      // Safely create a set of existing user IDs
      const existingUserIds = new Set(
        validConversations
          .filter(c => c?.otherUser?.id) // Make sure otherUser.id exists
          .map(c => c.otherUser.id)
      );

      // Debug which users we're filtering out
      console.log('Existing user IDs in conversations:', Array.from(existingUserIds));

      // Filter out undefined users
      const validMutualFollowers = Array.isArray(mutualFollowers) ? 
        mutualFollowers.filter(user => user && typeof user === 'object' && user.id) : 
        [];

      // Create combined list with conversations first
      const newCombined: CombinedItem[] = [
        ...validConversations.map(conv => ({
          id: conv.id,
          isConversation: true,
          data: conv,
          lastInteraction: new Date(conv.lastMessage?.createdAt || conv.createdAt || Date.now())
        })),
        // Then add mutual followers who don't already have a conversation
        ...validMutualFollowers
          .filter(user => !existingUserIds.has(user.id))
          .map(user => ({
            id: user.id,
            isConversation: false,
            data: user,
            lastInteraction: new Date(0) // Put these at the end
          }))
      ];
      
      // Sort combined list by last interaction date
      const sortedCombined = [...newCombined].sort(
        (a, b) => (b.lastInteraction?.getTime() || 0) - (a.lastInteraction?.getTime() || 0)
      );
      
      console.log(`Final combined list has ${sortedCombined.length} items`);
      setCombinedList(sortedCombined);
    };
    
    combineLists();
  }, [conversations, mutualFollowers, session?.user?.id]);

  // Auto-refresh conversations list periodically to ensure it stays updated
  useEffect(() => {
    if (!session?.user?.id) return;
    
    const fetchConversations = async () => {
      try {
        const res = await fetch(`${API_ROUTES.messages.conversations}?t=${Date.now()}`);
        if (res.ok) {
          const newConversations = await processConvResponse(res);
          
          // Solo actualizar si tenemos conversaciones válidas
          if (Array.isArray(newConversations) && newConversations.length > 0) {
            setConversations(prev => {
              // Combinar y preservar las conversaciones existentes
              const existingMap = new Map(prev.map(c => [c.id, c]));
              
              // Actualizar conversaciones existentes con nueva información
              newConversations.forEach(conv => {
                if (existingMap.has(conv.id)) {
                  // Preservar mensajes no leídos si no cambiaron
                  const existing = existingMap.get(conv.id)!;
                  existingMap.set(conv.id, {
                    ...conv,
                    // Mantener count más alto para evitar que se pierdan mensajes no leídos
                    unreadCount: Math.max(conv.unreadCount || 0, existing.unreadCount || 0)
                  });
                } else {
                  // Agregar nueva conversación
                  existingMap.set(conv.id, conv);
                }
              });
              
              // Convertir el Map de nuevo a array y ordenar por updatedAt
              const result = Array.from(existingMap.values())
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
              
              console.log(`Actualizadas ${result.length} conversaciones (${newConversations.length} recibidas)`);
              return result;
            });
          }
        }
      } catch (error) {
        console.error('Error refreshing conversations:', error);
      }
    };
    
    // Fetch immediately
    fetchConversations();
    
    // Then set up interval for periodic refresh - más frecuente
    const intervalId = setInterval(fetchConversations, 15000); // Cada 15 segundos
    
    return () => clearInterval(intervalId);
  }, [session?.user?.id, processConvResponse]);

  // Estado para seguimiento de la conexión de Socket.io
  const [socketStatus, setSocketStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('disconnected');

  // Conexión a Socket.io para mensajes globales
  const {
    connected: _connected,
    error: _socketError,
    onlineUsers: _onlineUsers,
    sendMessage: _sendMessage,
    markMessageAsRead: _markMessageAsRead
  } = useSocket({
    userId: session?.user?.id || '',
    username: session?.user?.name || session?.user?.username || 'Usuario',
    onNewMessage: (message: MessageType) => {
      if (!message.senderId || !message.content) return;
      
      // Siempre actualizar el contador de mensajes no leídos cuando recibimos un mensaje nuevo
      if (message.senderId !== session?.user?.id) {
        unreadMessagesContext?.updateUnreadCount();
      }
      
      // Actualizar conversaciones usando updater function
      setConversations(prev => {
        // Performance optimization: utilizar Map para búsqueda rápida
        const conversationMap = new Map(prev.map(c => [c.id, c]));
        
        // Determinar a qué conversación pertenece este mensaje
        const conversationId = message.conversationId || 
          prev.find(c => 
            (c.senderId === message.senderId && c.receiverId === message.receiverId) || 
            (c.senderId === message.receiverId && c.receiverId === message.senderId)
          )?.id;
        
        if (conversationId && conversationMap.has(conversationId)) {
          // Actualizar conversación existente
          const currentConv = conversationMap.get(conversationId);
          
          // Actualizar lastMessage solo si el mensaje es más reciente
          if (
            !currentConv?.lastMessage ||
            new Date(message.createdAt as string) > new Date(currentConv.lastMessage.createdAt)
          ) {
            // Actualizar la conversación existente
            conversationMap.set(conversationId, {
              ...currentConv!,
              lastMessage: {
                id: message.id || '',
                content: message.content,
                senderId: message.senderId,
                receiverId: message.receiverId || '',
                createdAt: typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString(),
                read: message.read || false,
                tempId: message.tempId
              },
              updatedAt: typeof message.createdAt === 'string' ? message.createdAt : message.createdAt.toISOString(),
              unreadCount: message.senderId !== session?.user?.id 
                ? (currentConv!.unreadCount || 0) + 1 
                : currentConv!.unreadCount || 0
            });
          }
          
          // Convertir el Map de nuevo a array y ordenar por updatedAt
          return Array.from(conversationMap.values())
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        }
        
        // Si es una nueva conversación, la añadiremos cuando se recargue la lista
        return prev;
      });

      // Actualizar contador de mensajes no leídos
      if (message.senderId !== session?.user?.id) {
        unreadMessagesContext?.updateUnreadCount();
      }
    },
    onConnect: () => {
      console.log('Socket.io conectado exitosamente');
      setSocketStatus('connected');
    },
    onDisconnect: () => {
      console.log('Socket.io desconectado');
      setSocketStatus('disconnected');
    },
    onError: (error: unknown) => {
      console.error('Error de conexión Socket.io:', error);
      setSocketStatus('error');
    }
  });

  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/api/auth/signin");
    if (status === "authenticated") {
      const conversationIdParam = searchParams.get("conversationWith");
      if (conversationIdParam) {
        // Add null checks to prevent accessing properties of undefined
        const targetConv = conversations.find(conv =>
          (conv?.otherUser?.id === conversationIdParam) ||
          (conv?.senderId === conversationIdParam)
        );
        if (targetConv) {
          setSelectedConversation(targetConv.id);
        }
      }
    }
  }, [status, router, searchParams, conversations]);

  const filteredCombinedList = useMemo(() => {
    return combinedList.filter((item) => {
      // Mantener logs para depuración
      if (item.isConversation) {
        const conv = item.data as Conversation;
        const username = conv.otherUser?.username?.toLowerCase() || "";
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

  const startNewConversation = async (userId: string) => {
    try {
      if (!userId || !session?.user?.id) {
        console.error("Missing user ID or session");
        return;
      }
      
      setMutualFollowers(prev => prev.filter(user => user?.id !== userId));
      const res = await fetch(`${API_ROUTES.messages.conversations}/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error creating conversation:", errorData);
        throw new Error("Error al crear conversación");
      }
      
      const { conversation: newConversation } = await res.json();
      
      // Verify that we received a valid conversation object
      if (!newConversation || typeof newConversation !== 'object' || !newConversation.id) {
        console.error("Received invalid conversation object", newConversation);
        return;
      }

      console.log("New conversation created:", newConversation);

      // Add the new conversation to the top of the list
      setConversations(prev => {
        // Check if conversation already exists to avoid duplicates
        const existingConvIndex = prev.findIndex(c => 
          c.id === newConversation.id || 
          (c.otherUser?.id === newConversation.otherUser?.id)
        );
        
        if (existingConvIndex >= 0) {
          // Just update the existing conversation
          const updatedConversations = [...prev];
          updatedConversations[existingConvIndex] = {
            ...newConversation,
            lastMessage: newConversation.lastMessage || null,
            unreadCount: 0
          };
          return updatedConversations;
        } else {
          // Add as a new conversation
          return [
            { 
              ...newConversation, 
              lastMessage: newConversation.lastMessage || null, 
              unreadCount: 0 
            },
            ...prev,
          ];
        }
      });

      // Update the URL and selected conversation
      router.push(`/messages?conversationWith=${userId}`);
      setSelectedConversation(newConversation.id);
    } catch (error) {
      console.error("Error creating conversation:", error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
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
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    if (mobileView) router.push("/messages");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const selectedConversationData = conversations.find(
    (conv) => conv.id === selectedConversation
  );
  const otherUser = selectedConversationData
    ? selectedConversationData.otherUser
    : null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {(!mobileView || !selectedConversation) && (
        <div className="w-full md:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h1 className="text-xl font-semibold">Mensajes</h1>
            
            {/* Indicador de estado de conexión */}
            <div className="flex items-center text-xs">
              {socketStatus === 'connected' ? (
                <span className="text-green-500 flex items-center" title="Conexión establecida">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
                  Conectado
                </span>
              ) : socketStatus === 'connecting' ? (
                <span className="text-amber-500 flex items-center" title="Estableciendo conexión...">
                  <span className="w-2 h-2 bg-amber-500 rounded-full mr-1 animate-pulse"></span>
                  Conectando...
                </span>
              ) : (
                <span className="text-red-500 flex items-center cursor-pointer" 
                      title="Error de conexión. Haz clic para reconectar"
                      onClick={() => window.location.reload()}>
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                  Reconectar
                </span>
              )}
            </div>
          </div>

          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar conversaciones..."
                className="pl-10 rounded-xl bg-gray-100 dark:bg-gray-700 border-0 focus-visible:ring-2 ring-blue-500"
                value={generalSearchTerm}
                onChange={(e) => setGeneralSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-160px)] px-2 pb-4">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <LoadingSpinner />
              </div>
            ) : filteredCombinedList.length === 0 ? (
              <div className="text-center py-10 text-gray-500 dark:text-gray-400">
                <MessageCircle className="h-12 w-12 mx-auto text-blue-500 dark:text-blue-400 mb-4" />
                <p>No hay conversaciones disponibles</p>
                <p className="text-sm mt-2">
                  {generalSearchTerm ? (
                    <>
                      No se encontraron resultados para &quot;{generalSearchTerm}&quot;
                      <button
                        className="ml-2 text-blue-500 hover:underline"
                        onClick={() => setGeneralSearchTerm("")}
                      >
                        Mostrar todos
                      </button>
                    </>
                  ) : (
                    "Sigue a otros usuarios para poder empezar a chatear"
                  )}
                </p>
              </div>
            ) : (
              filteredCombinedList.map((item) => {
                if (item.isConversation) {
                  const conversation = item.data as Conversation;
                  if (!conversation?.otherUser) {
                    console.error('Conversation missing otherUser:', conversation);
                    return null;
                  }
                  
                  const currentOtherUser = conversation.otherUser;
                  return (
                    <div
                      key={`conv-${conversation.id}`}
                      className={`group flex items-center p-3 gap-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer rounded-xl m-2 ${
                        selectedConversation === conversation.id
                          ? "bg-blue-50 dark:bg-blue-900/20 shadow-sm"
                          : ""}`}
                      onClick={() => handleConversationSelect(conversation.id)}
                    >
                      <Avatar className="h-14 w-14 border-2 border-blue-200 dark:border-blue-800 group-hover:border-blue-500">
                        {currentOtherUser?.image && currentOtherUser.image.includes("cloudinary") ? (
                          <CldImage
                            src={(() => {
                              // Extraer el public_id limpio, manejando diferentes formatos
                              let publicId = currentOtherUser.image;

                              // Si es una URL completa de Cloudinary
                              if (currentOtherUser.image.includes('cloudinary.com')) {
                                // Extraer el public_id eliminando la parte de la URL
                                // Buscamos 'hemeroteca_digital' como punto de referencia seguro
                                const match = currentOtherUser.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                                if (match && match[1]) {
                                  publicId = `hemeroteca_digital/${match[1]}`;
                                } else {
                                  // Si no encontramos el patrón específico, intentamos una extracción más general
                                  publicId = currentOtherUser.image.replace(/.*\/v\d+\//, '').split('?')[0];
                                }
                              }

                              // Verificar que el ID no esté duplicado o anidado
                              if (publicId.includes('https://')) {
                                console.warn('ID público contiene URL completa en mensajes:', publicId);
                                publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                              }

                              console.log('Public ID extraído en mensajes:', publicId);
                              return publicId;
                            })()}
                            alt={currentOtherUser?.username || "Usuario"}
                            width={56}
                            height={56}
                            crop="fill"
                            gravity="face"
                            className="rounded-full object-cover"
                            priority
                            onError={(e) => {
                              console.error('Error cargando imagen en mensajes:', currentOtherUser.image);
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/AvatarPredeterminado.webp";
                            }}
                          />
                        ) : currentOtherUser?.image &&
                          !currentOtherUser.image.startsWith("/") &&
                          !currentOtherUser.image.startsWith("http") ? (
                          <CldImage
                            src={(() => {
                              // Extraer el public_id limpio, manejando diferentes formatos
                              let publicId = currentOtherUser.image;

                              // Verificar que el ID no esté duplicado o anidado
                              if (publicId.includes('https://')) {
                                console.warn('ID público contiene URL completa en mensajes (2):', publicId);
                                publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                              }

                              console.log('Public ID extraído en mensajes (2):', publicId);
                              return publicId;
                            })()}
                            alt={currentOtherUser?.username || "Usuario"}
                            width={56}
                            height={56}
                            crop="fill"
                            gravity="face"
                            className="rounded-full object-cover"
                            onError={(e) => {
                              console.error('Error cargando imagen en mensajes (2):', currentOtherUser.image);
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/AvatarPredeterminado.webp";
                            }}
                          />
                        ) : (
                          <Image
                            src={currentOtherUser?.image || "/images/AvatarPredeterminado.webp"}
                            alt={currentOtherUser?.username || "Usuario"}
                            width={56}
                            height={56}
                            className="rounded-full object-cover"
                            priority
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/AvatarPredeterminado.webp";
                            }}
                          />
                        )}
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1 gap-2">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {currentOtherUser?.username || "Usuario desconocido"}
                          </h3>
                          {conversation.lastMessage && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                              {new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {conversation.lastMessage
                              ? conversation.lastMessage.content
                              : "Comienza una conversación..."}
                          </p>
                          {(conversation.unreadCount ?? 0) > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-500 px-1.5 text-xs text-white">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  const user = item.data as User;
                  return (
                    <div
                      key={`user-${user.id}`}
                      className="group flex items-center gap-3 p-3 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all cursor-pointer rounded-xl m-2"
                      onClick={() => startNewConversation(user.id)}
                    >
                      <Avatar className="h-14 w-14 border-2 border-gray-200 dark:border-gray-700 group-hover:border-green-500">
                        {/* Avatar rendering... */}
                        {user?.image ? (
                          <Image
                            src={user.image}
                            alt={user?.username || "Usuario"}
                            width={56}
                            height={56}
                            className="rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/AvatarPredeterminado.webp";
                            }}
                          />
                        ) : (
                          <div className="h-full w-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center text-xl font-semibold text-gray-600 dark:text-gray-300">
                            {user?.username?.[0] || "U"}
                          </div>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-2">
                          <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                            {user?.username || "Usuario desconocido"}
                          </h3>
                        </div>
                        <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          Iniciar conversación
                        </p>
                      </div>
                    </div>
                  );
                }
              })
            )}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {selectedConversation && otherUser ? (
          <ChatWindow
            otherUser={otherUser}
            initialMessages={[]} // Se cargarán mediante WebSocket
            conversationId={selectedConversation}
            isOpen={true}
           onClose={handleBackToList}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center p-8">
              <MessageCircle className="h-12 w-12 mx-auto text-blue-500 dark:text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Elige una conversación existente o inicia una nueva
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
