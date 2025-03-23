"use client";
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from 'next-auth/react';
import {  MessageType } from "@/src/hooks/useSocket";
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
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);

  const CONVERSATIONS_PER_PAGE = 15;

  const processConvResponse = useCallback(async (convRes: Response): Promise<Conversation[]> => {
    if (!convRes.ok) {
      console.error(`Error response from conversations API: ${convRes.status}`);
      throw new Error("Error al cargar conversaciones");
    }
    
    try {
      const rawData = await convRes.json();
      console.log('Raw API response for conversations:', rawData);
      
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
      
      // Manejar diferentes formatos de respuesta de API
      if (Array.isArray(rawData)) {
        console.log('API response is an array');
        conversations = rawData;
      } else if (rawData && typeof rawData === 'object') {
        if (Array.isArray(rawData.conversations)) {
          console.log('API response has conversations array');
          conversations = rawData.conversations;
        } else if (rawData.data && Array.isArray(rawData.data)) {
          console.log('API response has data array');
          conversations = rawData.data;
        } else if (rawData.data && typeof rawData.data === 'object' && Array.isArray(rawData.data.conversations)) {
          console.log('API response has nested data.conversations array');
          conversations = rawData.data.conversations;
        } else {
          // Intentar extraer una sola conversación si es un objeto
          if (rawData.id && rawData.receiver) {
            console.log('API response is a single conversation object');
            conversations = [rawData];
          } else if (rawData.conversation && typeof rawData.conversation === 'object' && rawData.conversation.id) {
            console.log('API response has a single conversation property');
            conversations = [rawData.conversation];
          }
        }
      }
      
      if (conversations.length === 0) {
        console.warn('No se encontraron conversaciones en la respuesta:', rawData);
      } else {
        console.log(`Se encontraron ${conversations.length} conversaciones`);
      }
      
      return conversations
        .filter(conv => {
          // Validar que cada conversación tenga los campos necesarios
          // Solo necesitamos ID y receptor para mostrar la conversación, sin requerir lastMessage
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
          // Permitir que lastMessage sea null pero mantener la conversación
          lastMessage: conv.lastMessage ? {
            ...conv.lastMessage,
            createdAt: typeof conv.lastMessage.createdAt === 'string' ? 
              new Date(conv.lastMessage.createdAt).toISOString() : 
              conv.lastMessage.createdAt,
          } : null,
          createdAt: conv.createdAt,
          // Usar updatedAt si existe, o createdAt, o la fecha actual como último recurso
          updatedAt: conv.updatedAt || conv.createdAt || new Date().toISOString(),
          senderId: session?.user?.id || '',
          receiverId: conv.receiver.id,
          sender: {
            id: session?.user?.id || '',
            username: session?.user?.username || null,
            image: session?.user?.image || null,
          },
          receiver: conv.receiver,
          unreadCount: conv.unreadCount || 0, // Asegurar que unreadCount no sea undefined
          // Añadir un indicador para conversaciones vacías
          isEmpty: !conv.lastMessage,
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
      
      // Control de tiempo para evitar cargas repetidas
      const lastLoadTime = sessionStorage.getItem('initial_data_load_time');
      const currentTime = Date.now();
      
      // Solo cargar si no se ha cargado o han pasado al menos 5 minutos
      if (!lastLoadTime || (currentTime - parseInt(lastLoadTime)) > 300000) {
        sessionStorage.setItem('initial_data_load_time', currentTime.toString());
        
        const loadData = async () => {
          try {
            // Usar un AbortController para cancelar las peticiones si el componente se desmonta
            const controller = new AbortController();
            const signal = controller.signal;
            
            console.log('Fetching conversations from API...');
            
            const [convRes, mutualRes] = await Promise.all([
              fetch(`${API_ROUTES.messages.conversations}?page=1&limit=${CONVERSATIONS_PER_PAGE}`, { 
                signal,
                headers: { 'Content-Type': 'application/json' }
              }),
              fetch(API_ROUTES.relationships.mutual, { 
                signal,
                headers: { 'Content-Type': 'application/json' }
              })
            ]);

            if (isMounted) {
              console.log('API response status:', convRes.status, convRes.statusText);
              
              // Clonar la respuesta para ver su contenido sin consumirla
              const convResClone = convRes.clone();
              try {
                const rawData = await convResClone.json();
                console.log('Raw conversation API response:', rawData);
              } catch (e) {
                console.error('Error parsing cloned response:', e);
              }
              
              const conversations = await processConvResponse(convRes);
              const mutuals = await processMutualResponse(mutualRes);

              console.log('Parsed conversations:', conversations);
              console.log('Mutual followers:', mutuals);

              if (conversations.length === 0) {
                console.warn('No conversations were parsed from the API response');
                
                // Intentar crear una conversación de prueba si no hay ninguna
                if (process.env.NODE_ENV === 'development') {
                  const dummyUserId = mutuals.length > 0 ? mutuals[0].id : 'unknown-user';
                  console.log('Creating a dummy conversation for development');
                  
                  const dummyConversation: Conversation = {
                    id: `dummy-${Date.now()}`,
                    otherUser: {
                      id: dummyUserId,
                      username: mutuals.length > 0 ? mutuals[0].username : 'Usuario de prueba',
                      image: null
                    },
                    lastMessage: null,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    senderId: session?.user?.id || '',
                    receiverId: dummyUserId,
                    sender: {
                      id: session?.user?.id || '',
                      username: session?.user?.username || null,
                      image: session?.user?.image || null,
                    },
                    receiver: {
                      id: dummyUserId,
                      username: mutuals.length > 0 ? mutuals[0].username : 'Usuario de prueba',
                      image: null
                    },
                    unreadCount: 0,
                    isEmpty: true
                  };
                  
                  setConversations([dummyConversation]);
                }
              } else {
                setConversations(prev => mergeAndSort(prev, conversations));
              }
              
              setMutualFollowers(mutuals);
            }
          } catch (error) {
            // Ignorar errores de abortados
            if ((error as Error).name !== 'AbortError') {
              console.error("Error loading data:", error);
            }
          } finally {
            if (isMounted) setLoading(false);
          }
        };
        
        // Fetch immediately, sin retraso para que cargue más rápido
        const fetchConversations = async () => {
          try {
            // Usar un AbortController para cancelar las peticiones si el componente se desmonta
            const controller = new AbortController();
            const signal = controller.signal;
            
            console.log('Fetching conversations from API...');
            
            const res = await fetch(`${API_ROUTES.messages.conversations}?t=${Date.now()}`, { 
              signal,
              headers: { 'Content-Type': 'application/json' }
            });

            if (!res.ok) return;
            
            const newConversations = await processConvResponse(res);

            console.log('Parsed conversations:', newConversations);

            if (Array.isArray(newConversations) && newConversations.length > 0) {
              setConversations(prev => {
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
                
                // Asegurarnos de mantener la selección actual si ya existía una selección
                if (selectedConversation) {
                  // Verificar si la conversación seleccionada todavía existe
                  const selectedStillExists = result.some(conv => conv.id === selectedConversation);
                  
                  if (!selectedStillExists) {
                    console.warn('La conversación seleccionada ya no existe en la lista actualizada');
                  }
                  
                  // Restaurar la selección después de que las conversaciones se actualizan
                  // No lo hacemos en este punto para evitar ciclos, lo hacemos con un timeout
                  if (selectedStillExists) {
                    setTimeout(() => {
                      // Verificar una vez más que el componente esté montado y que no haya cambiado la selección
                      if (isMounted && selectedConversation === selectedConversation) {
                        console.log('Manteniendo selección de conversación actual:', selectedConversation);
                      }
                    }, 0);
                  }
                }
                
                return result;
              });
            }
          } catch (error) {
            console.error('Error refreshing conversations:', error);
          }
        };
        
        // Fetch immediately, sin retraso para que cargue más rápido
        fetchConversations(); // Carga inmediata
        
        // Then set up interval for periodic refresh - menos frecuente
        const intervalId = setInterval(fetchConversations, 60000); // Mantener en 60 segundos
        
        return () => { 
          isMounted = false; 
          clearInterval(intervalId);
        };
        
      } else {
        console.log('Usando datos cargados anteriormente');
        // Si ya se cargaron datos recientemente, solo actualizar el estado de carga
        setLoading(false);
      }
    }
  }, [status, processConvResponse, processMutualResponse, mergeAndSort, router, session]);

  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const updateCombinedList = () => {
      // Solo actualizar si realmente hay cambios para evitar re-renders innecesarios
      const newCombinedList: CombinedItem[] = [
        ...conversations.map(conv => ({
          id: conv.id,
          isConversation: true,
          data: conv,
          lastInteraction: conv.lastInteraction,
        })),
        ...mutualFollowers.filter(user => 
          // Evitar duplicados - no mostrar usuarios que ya tienen una conversación
          !conversations.some(conv => conv.otherUser?.id === user.id)
        ).map(user => ({
          id: user.id,
          isConversation: false,
          data: user,
        })),
      ];

      // Comparar si realmente hay cambios para evitar actualizaciones innecesarias
      const hasChanges = 
        newCombinedList.length !== combinedList.length || 
        newCombinedList.some((item, index) => 
          combinedList[index]?.id !== item.id || 
          combinedList[index]?.isConversation !== item.isConversation
        );

      if (hasChanges) {
        setCombinedList(newCombinedList);
      }
    };

    updateCombinedList();
  }, [conversations, mutualFollowers, combinedList]);

  useEffect(() => {
    // Auto-refresh conversations list periodically to ensure it stays updated
    if (!session?.user?.id) return;
    
    // Variable para controlar si el componente está montado
    let isMounted = true;
    
    const fetchConversations = async () => {
      // Evitar múltiples peticiones si no está montado
      if (!isMounted) return;
      
      // Guardar la conversación seleccionada actual antes de la actualización
      const currentSelectedId = selectedConversation;
      
      // Usar una variable para evitar actualizar el estado si se desmonta el componente
      let shouldUpdate = true;
      
      // Control de tiempo - evitar múltiples peticiones en un período corto
      const lastFetchTime = sessionStorage.getItem('last_conversations_fetch');
      const currentTime = Date.now();
      
      // Si la última petición fue hace menos de 10 segundos, no hacer otra
      if (lastFetchTime && (currentTime - parseInt(lastFetchTime)) < 10000) {
        console.log('Evitando petición repetida, esperar al menos 10 segundos entre solicitudes');
        return;
      }
      
      // Marcar el tiempo de la petición antes de realizarla
      sessionStorage.setItem('last_conversations_fetch', currentTime.toString());
      
      try {
        const res = await fetch(`${API_ROUTES.messages.conversations}?t=${currentTime}`);
        if (!res.ok || !shouldUpdate) return;
        
        const newConversations = await processConvResponse(res);
        
        // Solo actualizar si tenemos conversaciones válidas y el componente sigue montado
        if (Array.isArray(newConversations) && newConversations.length > 0 && shouldUpdate) {
          setConversations(prev => {
            // Check if conversation already exists to avoid duplicates
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
            
            // Asegurarnos de mantener la selección actual si ya existía una selección
            if (currentSelectedId) {
              // Verificar si la conversación seleccionada todavía existe
              const selectedStillExists = result.some(conv => conv.id === currentSelectedId);
              
              if (!selectedStillExists) {
                console.warn('La conversación seleccionada ya no existe en la lista actualizada');
              }
              
              // Restaurar la selección después de que las conversaciones se actualizan
              // No lo hacemos en este punto para evitar ciclos, lo hacemos con un timeout
              if (shouldUpdate && isMounted && selectedStillExists) {
                setTimeout(() => {
                  // Verificar una vez más que el componente esté montado y que no haya cambiado la selección
                  if (isMounted && selectedConversation === currentSelectedId) {
                    console.log('Manteniendo selección de conversación actual:', currentSelectedId);
                  }
                }, 0);
              }
            }
            
            return result;
          });
        }
      } catch (error) {
        console.error('Error refreshing conversations:', error);
      }
    };
    
    // Fetch immediately, sin retraso para que cargue más rápido
    fetchConversations(); // Carga inmediata
    
    // Then set up interval for periodic refresh - menos frecuente
    const intervalId = setInterval(fetchConversations, 60000); // Mantener en 60 segundos
    
    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [session?.user?.id, processConvResponse, selectedConversation]); // Añadir selectedConversation a las dependencias

  const isProcessingUrlRef = useRef(false);
  const renderCountRef = useRef(0);

  useEffect(() => {
    renderCountRef.current++;
    console.log(`Render #${renderCountRef.current}, selectedConversation: ${selectedConversation}`);
    
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }
    
    if (status !== "authenticated") return;
    
    const conversationIdParam = searchParams.get("conversationWith");
    console.log(`URL param: ${conversationIdParam}, procesando: ${isProcessingUrlRef.current}`);
    
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
            console.log(`Encontrada conversación con ID: ${targetConv.id}`);
            
            if (selectedConversation !== targetConv.id) {
              console.log(`Seleccionando conversación: ${targetConv.id}`);
              setSelectedConversation(targetConv.id);
            }
          } 
          else if (!selectedConversation && mutualFollowers.length > 0) {
            const isValidUser = mutualFollowers.some(user => user.id === conversationIdParam);
            
            if (isValidUser) {
              console.log(`Creando nueva conversación con: ${conversationIdParam}`);
              await startNewConversation(conversationIdParam);
            } else {
              console.warn(`Usuario no encontrado: ${conversationIdParam}`);
              router.push("/messages");
            }
          }
        } 
        else if (selectedConversation) {
          console.log(`No hay parámetro URL pero hay conversación seleccionada: ${selectedConversation}`);
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
  }, [searchParams, status]);

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
      
      if (!newConversation || typeof newConversation !== 'object' || !newConversation.id) {
        console.error("Received invalid conversation object", newConversation);
        return;
      }

      console.log("New conversation created:", newConversation);

      setConversations(prev => {
        const existingConvIndex = prev.findIndex(c => 
          c.id === newConversation.id || 
          (c.otherUser?.id === newConversation.otherUser?.id)
        );
        
        if (existingConvIndex >= 0) {
          const updatedConversations = [...prev];
          updatedConversations[existingConvIndex] = {
            ...newConversation,
            lastMessage: newConversation.lastMessage || null,
            unreadCount: 0
          };
          return updatedConversations;
        } else {
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
    console.log("Cerrando conversación por solicitud explícita del usuario");
    setSelectedConversation(null);
    if (mobileView) {
      router.push("/messages", { scroll: false });
    }
  };

  const selectedConversationData = conversations.find(
    (conv) => conv.id === selectedConversation
  );
  const otherUser = selectedConversationData
    ? selectedConversationData.otherUser
    : null;

  const memoizedOtherUser = useMemo(() => otherUser, [otherUser?.id]);

  const renderConversationMessage = (conversation: Conversation) => {
    if (conversation.isEmpty) {
      return (
        <p className="text-sm text-gray-500 truncate">
          No hay mensajes aún. ¡Envía el primero!
        </p>
      );
    }
    
    if (!conversation.lastMessage) {
      return (
        <p className="text-sm text-gray-500 truncate">
          No hay mensajes aún. ¡Envía el primero!
        </p>
      );
    }
    
    const isCurrentUserSender = conversation.lastMessage.senderId === session?.user?.id;
    return (
      <p className="text-sm text-gray-500 truncate">
        {isCurrentUserSender ? "Tú: " : ""}{conversation.lastMessage.content}
      </p>
    );
  };

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
          
          <div className="flex items-center text-xs">
            {/* Socket status indicator */}
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
        {selectedConversation && memoizedOtherUser ? (
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
                  {memoizedOtherUser.image ? (
                    <Image
                      src="/images/AvatarPredeterminado.webp"
                      width={48}
                      height={48}
                      alt={memoizedOtherUser.username || "Usuario"}
                      className="h-10 w-10 rounded-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : (
                    <AvatarFallback>
                      {memoizedOtherUser.username?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <h2 className="font-medium">{memoizedOtherUser.username || "Usuario"}</h2>
              </div>
            </div>
            
            {/* Contenido de la conversación integrado directamente */}
            <ChatWindowContent 
              conversationId={selectedConversation}
              otherUser={memoizedOtherUser}
              key={`chat-content-${selectedConversation}`}
            />
          </div>
        ) : (
          // Panel de bienvenida cuando no hay conversación seleccionada
          <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="text-center max-w-md">
              <MessageSquare className="h-16 w-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
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
        <div className="space-y-4 py-2">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Selecciona un usuario para iniciar una conversación
          </div>
          {mutualFollowers.length === 0 ? (
            <div className="text-center p-4 text-gray-500 dark:text-gray-400">
              No tienes seguidores mutuos para iniciar una conversación.
              <div className="mt-2 text-sm">
                Para poder enviar mensajes, necesitas seguir a usuarios y que ellos te sigan de vuelta.
              </div>
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-800">
              {mutualFollowers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg ${
                    selectedUser?.id === user.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    {user.image ? (
                      <Image
                        src="/images/AvatarPredeterminado.webp"
                        width={48}
                        height={48}
                        alt={user.username || "Usuario"}
                        className="h-10 w-10 rounded-full object-cover"
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    ) : (
                      <AvatarFallback>{user.username?.substring(0, 2).toUpperCase() || 'US'}</AvatarFallback>
                    )}
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{user.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
                  </div>
                  {selectedUser?.id === user.id && (
                    <div className="h-4 w-4 rounded-full bg-blue-500"></div>
                  )}
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => setShowNewMessageModal(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!selectedUser || creatingConversation || mutualFollowers.length === 0}
              onClick={async () => {
                if (!selectedUser) return;
                
                setCreatingConversation(true);
                try {
                  const response = await fetch('/api/messages/conversations', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      receiverId: selectedUser.id
                    })
                  });
                  
                  if (!response.ok) {
                    throw new Error('Error al crear la conversación');
                  }
                  
                  const conversation = await response.json();
                  console.log('Conversación creada:', conversation);
                  
                  // Añadir la nueva conversación a la lista
                  if (conversation && conversation.id) {
                    setConversations(prev => {
                      // Evitar duplicados
                      if (prev.some(c => c.id === conversation.id)) {
                        return prev;
                      }
                      
                      const newConversation = {
                        ...conversation,
                        // Asegurarse de que tenga la propiedad isEmpty si no tiene mensajes
                        isEmpty: !conversation.lastMessage
                      };
                      
                      return [newConversation, ...prev]
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
                    });
                    
                    // Seleccionar la nueva conversación
                    setSelectedConversation(conversation.id);
                  }
                  
                  setShowNewMessageModal(false);
                  setSelectedUser(null);
                } catch (error) {
                  console.error('Error al crear conversación:', error);
                  alert('Ha ocurrido un error al crear la conversación');
                } finally {
                  setCreatingConversation(false);
                }
              }}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
            >
              {creatingConversation ? 'Creando...' : 'Crear conversación'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
