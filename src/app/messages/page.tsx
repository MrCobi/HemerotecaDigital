// src/app/messages/page.tsx
"use client";
import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { API_ROUTES } from "@/src/config/api-routes";
import { ChatWindowContent } from "@/src/app/components/Chat/ChatWindowContent";
import GroupChatWindowContent from "@/src/app/components/Chat/GroupChatWindowContent";
import GroupManagementModal from '../components/Chat/GroupManagementModal';
import { MessageCircle, Search, MessageSquare, MessageSquarePlus, ArrowLeft, Users, Plus, X, Check, ImagePlus, Settings, Trash, LogOut } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/src/app/components/ui/avatar";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Textarea } from "@/src/app/components/ui/textarea";
import { Label } from "@/src/app/components/ui/label";
import Image from "next/image";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";
import { CldImage } from "next-cloudinary";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/src/app/components/ui/dialog";
import { useToast } from "@/src/app/components/ui/use-toast";
import { UnreadMessagesContext } from "@/src/app/contexts/UnreadMessagesContext";

// Interfaces optimizadas
interface User {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
}

interface Participant {
  id: string;
  userId: string;
  role: 'admin' | 'member' | 'moderator' | 'owner';
  user: User;
}

interface ConversationData {
  id: string;
  name?: string;
  description?: string;
  imageUrl?: string;
  isGroup: boolean;
  participants: Participant[];
  lastMessage?: Message;
  createdAt?: string;
  updatedAt?: string;
  unreadCount?: number;
  otherUser?: User;
}

export interface Message {
  id?: string;
  content: string | null;
  createdAt: Date | string;
  read?: boolean;
  senderId: string;
  sender?: {
    id: string;
    username: string | null;
    name?: string | null;
    image?: string | null;
  };
  messageType?: string;
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
  isGroup?: boolean;
  name?: string;
  imageUrl?: string;
  description?: string;
  participants?: User[];
  participantsCount?: number;
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
  const { toast } = useToast();

  // Configuración
  const CONVERSATIONS_PER_PAGE = 15;
  const REFRESH_INTERVAL = 60000; // 60 segundos
  
  // Estados centralizados
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [mutualFollowersForGroups, setMutualFollowersForGroups] = useState<User[]>([]);
  const [combinedList, setCombinedList] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [generalSearchTerm, setGeneralSearchTerm] = useState("");
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [selectedConversationData, setSelectedConversationData] = useState<ConversationData | null>(null);
  const [mobileView, setMobileView] = useState(false);
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [creatingConversation, setCreatingConversation] = useState(false);
  
  // Estados para la creación de grupos
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [selectedParticipants, setSelectedParticipants] = useState<User[]>([]);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [groupImage, setGroupImage] = useState<File | null>(null);
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Estados para la administración de grupos
  const [showGroupManagementModal, setShowGroupManagementModal] = useState(false);
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [groupNameEdit, setGroupNameEdit] = useState("");
  const [groupDescriptionEdit, setGroupDescriptionEdit] = useState("");
  const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
  const [possibleParticipants, setPossibleParticipants] = useState<User[]>([]);
  const [selectedNewParticipants, setSelectedNewParticipants] = useState<string[]>([]);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  
  // Referencias para controlar ciclos y renderizado
  const isProcessingUrlRef = useRef(false);
  const messagesDivRef = useRef<HTMLDivElement>(null);
  const newMessageInputRef = useRef<HTMLTextAreaElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Función para actualizar la información del grupo
  const updateGroupInfo = async (data: { name?: string, description?: string, imageUrl?: string }) => {
    if (!selectedConversation) return false;
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${selectedConversation}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el grupo');
      }
      
      // Actualizar el estado local
      if (selectedConversationData) {
        const updatedData = {
          ...selectedConversationData,
          ...data
        };
        
        // Actualizar el estado
        setSelectedConversationData(updatedData);
        
        // También actualizar en la lista de conversaciones
        setConversations(prev => prev.map(conv => 
          conv.id === selectedConversation ? {...conv, ...data} : conv
        ));
      }
      
      return true;
    } catch (error) {
      console.error('Error al actualizar el grupo:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del grupo",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdatingGroup(false);
    }
  };
  
  // Función para cambiar la imagen del grupo
  const handleChangeGroupImage = () => {
    // Implementar selección de imagen como en la creación de grupos
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        
        // Crear URL para previsualización
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            // Preview en este caso no es necesario ya que no mostramos una previsualización
          }
        };
        reader.readAsDataURL(file);
        
        // Subir la imagen a Cloudinary
        try {
          // Iniciar carga
          setIsUpdatingGroup(true);
          
          // Usar el endpoint de carga de imágenes para grupos
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(API_ROUTES.messages.uploadGroupImage, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error('Error al subir la imagen');
          }
          
          const data = await response.json();
          
          // Actualizar el grupo con la nueva imagen
          await updateGroupInfo({
            imageUrl: data.url
          });
          
          toast({
            title: "Imagen actualizada",
            description: "La imagen del grupo ha sido actualizada correctamente",
          });
        } catch (error) {
          console.error('Error al cambiar la imagen:', error);
          toast({
            title: "Error",
            description: "No se pudo cambiar la imagen del grupo",
            variant: "destructive",
          });
        } finally {
          setIsUpdatingGroup(false);
        }
      }
    };
    input.click();
  };
  
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
        .filter(conv => conv && typeof conv === 'object' && conv.id)
        .map((conv) => {
          // Verificar si es un grupo basado en el ID o la propiedad isGroup
          const isGroup: boolean = Boolean(conv.isGroup) || (typeof conv.id === 'string' && conv.id.startsWith('group_'));
          
          // Log para depuración
          console.log(`Procesando conversación: isGroup=${isGroup}, id=${conv.id}, name=${conv.name || 'Sin nombre'}`);

          // Si es un grupo, dar formato como grupo
          if (isGroup) {
            console.log(`Procesando grupo: ${conv.id}, Nombre: ${conv.name || 'Sin nombre'}, Participantes: ${conv.participantsCount || (Array.isArray(conv.participants) ? conv.participants.length : 0)}`);
            
            // Crear una copia de los datos del grupo para evitar modificar el original
            const processedGroup = {
              id: conv.id,
              isGroup: true,
              name: conv.name || "Grupo sin nombre",
              description: conv.description || "",
              imageUrl: conv.imageUrl || null,
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
                ? conv.participants.map((participant: any) => {
                    // Si ya es un objeto Participant, lo devolvemos tal cual
                    if (participant.userId && participant.role) {
                      return participant;
                    }
                    // Si es un objeto User, lo convertimos a Participant
                    return {
                      id: participant.id,
                      userId: participant.id,
                      role: 'member' as const,
                      user: participant
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
            
            console.log(`Grupo procesado: ${processedGroup.id}, Nombre: ${processedGroup.name}, Participantes: ${processedGroup.participantsCount}`);
            
            return processedGroup;
          }
          
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
            isGroup: false
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
          
          // Buscar si el parámetro es un ID de grupo existente
          const isGroupParam = conversationIdParam.startsWith('group_');
          
          // Primero, buscar si el conversationIdParam coincide directamente con un ID de conversación
          let targetConv = conversations.find(conv => conv.id === conversationIdParam);
          
          // Si no lo encontramos por ID directo, buscamos por otherUser.id o senderId/receiverId
          if (!targetConv) {
            targetConv = conversations.find(conv =>
              (conv?.otherUser?.id === conversationIdParam) ||
              (conv?.receiverId === conversationIdParam) ||
              (conv?.senderId === conversationIdParam)
            );
          }
          
          if (targetConv) {
            console.log(`Conversación encontrada por URL, ID: ${targetConv.id}, isGroup: ${Boolean(targetConv.isGroup)}`);
            if (selectedConversation !== targetConv.id) {
              setSelectedConversation(targetConv.id);
            }
          } 
          else if (!selectedConversation && !isGroupParam && mutualFollowers.length > 0) {
            // Si no es un grupo y no tenemos conversación seleccionada, verificamos si es un usuario válido
            const isValidUser = mutualFollowers.some(user => user.id === conversationIdParam);
            
            if (isValidUser) {
              console.log(`Iniciando nueva conversación con usuario: ${conversationIdParam}`);
              await startNewConversation(conversationIdParam);
            } else {
              console.log(`Usuario no válido o no es un seguidor mutuo: ${conversationIdParam}`);
              router.push("/messages");
            }
          } else if (isGroupParam) {
            console.log(`URL contiene ID de grupo que no existe: ${conversationIdParam}`);
            router.push("/messages");
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
        toast({
          title: "Error",
          description: "Datos insuficientes para crear conversación",
          variant: "destructive"
        });
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
          'Content-Type': 'application/json'
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
          image: userData.image || null
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
      setTimeout(loadConversationsData, 1000);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar la conversación. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setCreatingConversation(false);
    }
  }, [conversations, mutualFollowers, session?.user?.id, session?.user?.username, session?.user?.image, router, processConvResponse, CONVERSATIONS_PER_PAGE]);

  // Efecto para cargar datos de seguidores mutuos al abrir el modal
  useEffect(() => {
    const fetchMutualFollowersForPrivateMessages = async () => {
      if (!showNewMessageModal || !session?.user?.id) return;
      
      try {
        const mutualResponse = await fetch(`${API_ROUTES.relationships.mutual}?t=${Date.now()}`);
        const mutualData = await processMutualResponse(mutualResponse);
        
        // Filtrar usuarios que ya tienen conversaciones existentes (solo para mensajes privados)
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
    
    fetchMutualFollowersForPrivateMessages();
  }, [showNewMessageModal, processMutualResponse, session?.user?.id, conversations]);

  // Efecto para cargar datos de seguidores mutuos para grupos (muestra todos)
  useEffect(() => {
    const fetchMutualFollowersForGroups = async () => {
      if (!showCreateGroupModal || !session?.user?.id) return;
      
      try {
        const mutualResponse = await fetch(`${API_ROUTES.relationships.mutual}?t=${Date.now()}`);
        const mutualData = await processMutualResponse(mutualResponse);
        
        // Para grupos, mostramos TODOS los seguidores mutuos
        setMutualFollowersForGroups(mutualData);
      } catch (error) {
        console.error("Error fetching mutual followers for groups:", error);
      }
    };
    
    fetchMutualFollowersForGroups();
  }, [showCreateGroupModal, processMutualResponse, session?.user?.id]);

  // Función para seleccionar una conversación - memoizada
  const handleConversationSelect = async (conversation: Conversation) => {
    try {
      console.log(`Seleccionando conversación: ${conversation.id}, isGroup: ${Boolean(conversation.isGroup)}`);
      
      // Si la conversación que se está seleccionando ya está seleccionada y estamos en vista móvil,
      // entonces solo cambiar a la vista de chat
      if (mobileView && selectedConversation === conversation.id) {
        setMobileView(false);
        return;
      }

      if (conversation) {
        // Primero establecemos el ID de la conversación seleccionada
        setSelectedConversation(conversation.id);
        
        // En el caso de grupos, asegurarnos de que los participantes estén correctamente formateados
        let participants: Participant[] = [];
        
        if (Array.isArray(conversation.participants)) {
          participants = conversation.participants.map((participant: any) => {
            // Si ya es un objeto Participant, lo devolvemos tal cual
            if (participant.userId && participant.role) {
              return participant as Participant;
            }
            // Si es un objeto User, lo convertimos a Participant
            return {
              id: participant.id || crypto.randomUUID(),
              userId: participant.id,
              role: 'member' as 'admin' | 'member' | 'moderator' | 'owner',
              user: participant
            };
          });
        }
        
        // Detectar si es un grupo basado en el ID o la propiedad isGroup
        const isGroup: boolean = Boolean(conversation.isGroup) || (typeof conversation.id === 'string' && conversation.id.startsWith('group_'));
        
        console.log(`Es un grupo: ${isGroup}, Participantes: ${participants.length}`);
        
        // Crear objeto normalizado de la conversación
        let normalizedConversation: ConversationData = {
          id: conversation.id,
          isGroup: isGroup,
          name: conversation.name || undefined,
          description: conversation.description || undefined,
          imageUrl: conversation.imageUrl || undefined,
          lastMessage: conversation.lastMessage || undefined,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          unreadCount: conversation.unreadCount,
          participants: participants,
          otherUser: undefined // Lo estableceremos a continuación si no es un grupo
        };
        
        // Si no es un grupo, necesitamos asegurarnos de que otherUser esté definido
        if (!isGroup) {
          // Primero intentamos usar otherUser directamente si está disponible
          if (conversation.otherUser) {
            normalizedConversation.otherUser = conversation.otherUser;
            console.log(`otherUser asignado desde conversation.otherUser: ${conversation.otherUser.id}`);
          } 
          // Si no hay otherUser, intentamos encontrarlo en los participantes
          else if (participants.length > 0) {
            const otherParticipant = participants.find(
              p => p.userId !== session?.user?.id
            );
            
            if (otherParticipant) {
              normalizedConversation.otherUser = otherParticipant.user;
              console.log(`otherUser asignado desde participantes: ${otherParticipant.user.id}`);
            }
          }
          // Si aún no tenemos otherUser, intentamos usar receiver/sender
          else if (conversation.receiverId && conversation.receiverId !== session?.user?.id) {
            normalizedConversation.otherUser = {
              id: conversation.receiverId,
              username: conversation.receiver?.username || null,
              image: conversation.receiver?.image || null
            };
            console.log(`otherUser asignado desde receiver: ${conversation.receiverId}`);
          }
          else if (conversation.senderId && conversation.senderId !== session?.user?.id) {
            normalizedConversation.otherUser = {
              id: conversation.senderId,
              username: conversation.sender?.username || null,
              image: conversation.sender?.image || null
            };
            console.log(`otherUser asignado desde sender: ${conversation.senderId}`);
          }
        }
        
        console.log('Conversación normalizada:', JSON.stringify(normalizedConversation, null, 2));
        
        // Actualizamos el estado con la conversación normalizada
        setSelectedConversationData(normalizedConversation);
        
        // Cambiar la vista en modo móvil
        if (mobileView) {
          setMobileView(false);
        }
      }
    } catch (error) {
      console.error("Error al seleccionar conversación:", error);
      toast({
        title: "Error",
        description: "No pudimos cargar la conversación",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Función para volver a la lista de conversaciones - memoizada
  const handleBackToList = useCallback(() => {
    setSelectedConversation(null);
    if (mobileView) {
      router.push("/messages", { scroll: false });
    }
  }, [mobileView, router]);

  // Valores calculados derivados del estado
  const otherUser = useMemo(() => 
    selectedConversationData ? selectedConversationData.otherUser : null,
    [selectedConversationData]
  );

  // Función para subir imagen a Cloudinary
  const uploadFile = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText).url);
          } else {
            reject(new Error(xhr.statusText || "Error subiendo archivo"));
          }
        }
      };

      xhr.open("POST", API_ROUTES.messages.uploadGroupImage);
      xhr.send(formData);
    });
  }, []);

  // Función para crear un grupo nuevo
  const createGroup = useCallback(async () => {
    if (!session?.user?.id || !groupName || selectedParticipants.length === 0) {
      toast({
        title: "Error",
        description: "Datos de grupo incompletos",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setCreatingGroup(true);
      setUploadProgress(0);
      
      // Subir imagen a Cloudinary primero si existe
      let imageUrl = undefined;
      if (groupImage) {
        try {
          imageUrl = await uploadFile(groupImage);
        } catch (err) {
          console.error("Error subiendo imagen:", err);
          toast({
            title: "Error al subir la imagen",
            description: "No se pudo subir la imagen del grupo. Inténtalo de nuevo.",
            variant: "destructive"
          });
          setCreatingGroup(false);
          return;
        }
      }
      
      // Preparar datos para la API
      const groupData = {
        name: groupName,
        description: groupDescription || '',
        participantIds: selectedParticipants.map(user => user.id),
        imageUrl: imageUrl // Enviar la URL de Cloudinary en lugar del archivo
      };
      
      // Crear el grupo a través del API
      const response = await fetch('/api/messages/group', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(groupData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al crear el grupo");
      }
      
      const data = await response.json();
      console.log("Grupo creado:", data);
      
      // Creamos un objeto de grupo temporal para actualizar el estado de la UI inmediatamente
      const newGroup: Conversation = {
        id: data.id || `temp-group-${Date.now()}`,
        isGroup: true,
        name: groupName,
        description: groupDescription,
        imageUrl: data.imageUrl || undefined, // Usamos la URL devuelta por el servidor
        otherUser: {
          id: data.id || `temp-group-${Date.now()}`, 
          username: groupName,
          image: data.imageUrl || null
        },
        lastMessage: null,
        updatedAt: new Date().toISOString(),
        participants: [
          ...selectedParticipants,
          {
            id: session.user.id,
            username: session.user.username || null,
            image: session.user.image || null
          }
        ],
        participantsCount: selectedParticipants.length + 1,
        unreadCount: 0,
        isEmpty: true
      };
      
      // Actualizar las conversaciones con el nuevo grupo
      setConversations(prev => [newGroup, ...prev]);
      
      // Seleccionar el nuevo grupo
      setSelectedConversation(newGroup.id);
      
      // Limpiar el formulario de creación de grupo
      setGroupName("");
      setGroupDescription("");
      setSelectedParticipants([]);
      setGroupImage(null);
      setGroupImagePreview(null);
      setShowCreateGroupModal(false);
      
      // Recargar las conversaciones desde el servidor después de crear el grupo
      setTimeout(loadConversationsData, 1000);
    } catch (error) {
      console.error("Error creating group:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo crear el grupo. Inténtalo de nuevo.",
        variant: "destructive"
      });
    } finally {
      setCreatingGroup(false);
    }
  }, [groupName, groupDescription, selectedParticipants, groupImage, session?.user?.id, session?.user?.username, session?.user?.image, loadConversationsData]);

  // Función para manejar la carga de imágenes
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Comprobar que es una imagen
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Por favor, selecciona un archivo de imagen válido.",
          variant: "destructive"
        });
        return;
      }
      
      // Comprobar tamaño (5MB máx)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "La imagen es demasiado grande. El tamaño máximo es 5MB.",
          variant: "destructive"
        });
        return;
      }
      
      setGroupImage(file);
      
      // Crear una URL de vista previa
      const previewUrl = URL.createObjectURL(file);
      setGroupImagePreview(previewUrl);
      
      // Limpiar URL cuando se desmonte
      return () => URL.revokeObjectURL(previewUrl);
    }
  }, []);

  // Función para eliminar la imagen seleccionada
  const removeSelectedImage = useCallback(() => {
    if (groupImagePreview) {
      URL.revokeObjectURL(groupImagePreview);
    }
    setGroupImage(null);
    setGroupImagePreview(null);
  }, [groupImagePreview]);

  // Función para agregar/quitar un usuario de los participantes seleccionados
  const toggleParticipant = useCallback((user: User) => {
    setSelectedParticipants(prev => {
      const isSelected = prev.some(p => p.id === user.id);
      if (isSelected) {
        return prev.filter(p => p.id !== user.id);
      } else {
        return [...prev, user];
      }
    });
  }, []);

  // Renderizado de mensajes de conversación - memoizado
  const renderConversationMessage = useCallback((conversation: Conversation) => {
    const hasLastMessage = conversation.lastMessage && conversation.lastMessage.content;
    const isGroup = conversation.isGroup || conversation.id.startsWith('group_');
    
    if (!hasLastMessage) {
      return <p className="text-sm text-gray-500 truncate">No hay mensajes aún</p>;
    }

    // Para mensajes de grupo, mostrar quién envió el mensaje
    const senderPrefix = isGroup && conversation.lastMessage?.sender?.username ? 
      `${conversation.lastMessage.sender.username}: ` : 
      '';
      
    return (
      <p className="text-sm text-gray-500 truncate">
        {senderPrefix}
        {conversation.lastMessage?.content}
      </p>
    );
  }, []);

  // Cargar las conversaciones - Función para depuración
  const loadConversationsDirectly = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/messages/conversations');
      if (!response.ok) {
        toast({
          title: "Error",
          description: "No se pudieron cargar las conversaciones",
          variant: "destructive"
        });
        return;
      }
      
      const conversationsData = await response.json();
      console.log("Datos directos de la API:", conversationsData);
      
      // Verificar si hay grupos y su estructura
      conversationsData.forEach((conv: any) => {
        if (conv.isGroup || (typeof conv.id === 'string' && conv.id.startsWith('group_'))) {
          console.log(`[DEBUG] Grupo encontrado: ID=${conv.id}`);
          console.log(`[DEBUG] Nombre del grupo: ${conv.name || 'Sin nombre'}`);
          console.log(`[DEBUG] Participantes: ${conv.participantsCount || (conv.participants?.length || 0)}`);
          console.log(`[DEBUG] Estructura completa:`, JSON.stringify(conv));
        }
      });
      
      // Procesar las conversaciones manualmente para depuración
      const processedConvs = conversationsData.map((conv: any) => {
        // Verificar si es un grupo
        if (conv.isGroup || (typeof conv.id === 'string' && conv.id.startsWith('group_'))) {
          return {
            id: conv.id,
            isGroup: true,
            name: conv.name || "Grupo sin nombre",
            description: conv.description || "",
            imageUrl: conv.imageUrl || null,
            lastMessage: conv.lastMessage || null,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt || conv.createdAt || new Date().toISOString(),
            unreadCount: conv.unreadCount || 0,
            participants: Array.isArray(conv.participants) ? conv.participants : [],
            participantsCount: conv.participantsCount || (Array.isArray(conv.participants) ? conv.participants.length : 0),
            isEmpty: !conv.lastMessage,
            otherUser: {
              id: conv.id,
              username: conv.name || "Grupo",
              image: conv.imageUrl || null
            }
          };
        } else {
          // Conversación normal
          return {
            id: conv.id,
            otherUser: conv.receiver || conv.otherUser || {},
            lastMessage: conv.lastMessage || null,
            unreadCount: conv.unreadCount || 0,
            createdAt: conv.createdAt,
            updatedAt: conv.updatedAt || conv.createdAt || new Date().toISOString(),
            isGroup: false
          };
        }
      });
      
      setConversations(processedConvs);
    } catch (error) {
      console.error("Error cargando conversaciones:", error);
      toast({
        title: "Error",
        description: "Ocurrió un error al cargar las conversaciones",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getParticipantCount = (conversation: Conversation) => {
    if (conversation.participantsCount !== undefined) {
      return conversation.participantsCount;
    } else if (conversation.participants !== undefined) {
      return conversation.participants.length;
    } else {
      return 0;
    }
  };

  // Verificar si el usuario es administrador del grupo antes de abrir el modal
  const handleOpenGroupManagement = useCallback(() => {
    if (selectedConversationData?.participants) {
      // Buscar si el usuario actual es administrador del grupo
      const currentUserParticipant = selectedConversationData.participants.find(
        p => p.userId === session?.user?.id
      );
      
      setIsGroupAdmin(currentUserParticipant?.role === 'admin');
      
      // Inicializar valores de edición
      setGroupNameEdit(selectedConversationData.name || "");
      setGroupDescriptionEdit(selectedConversationData.description || "");
      
      // Abrir el modal
      setShowGroupManagementModal(true);
    }
  }, [selectedConversationData, session?.user?.id]);

  // Función para eliminar el grupo (solo para administradores)
  const handleDeleteGroup = async () => {
    if (!selectedConversation || !isGroupAdmin) return;
    
    // Confirmar la eliminación
    if (!window.confirm("¿Estás seguro de que deseas eliminar este grupo? Esta acción no se puede deshacer.")) {
      return;
    }
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${selectedConversation}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar el grupo');
      }
      
      // Cerrar el modal y actualizar el estado
      setShowGroupManagementModal(false);
      
      // Eliminar el grupo de la lista de conversaciones
      setConversations(prev => prev.filter(conv => conv.id !== selectedConversation));
      
      // Deseleccionar la conversación actual
      setSelectedConversation(null);
      
      toast({
        title: "Grupo eliminado",
        description: "El grupo ha sido eliminado correctamente",
      });
    } catch (error) {
      console.error('Error al eliminar el grupo:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el grupo",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Función para abandonar el grupo (para miembros no administradores)
  const handleLeaveGroup = async () => {
    if (!selectedConversation || !session?.user?.id) return;
    
    // Confirmar la acción
    if (!window.confirm("¿Estás seguro de que deseas abandonar este grupo?")) {
      return;
    }
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${selectedConversation}/leave`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Error al abandonar el grupo');
      }
      
      // Cerrar el modal y actualizar el estado
      setShowGroupManagementModal(false);
      
      // Eliminar el grupo de la lista de conversaciones
      setConversations(prev => prev.filter(conv => conv.id !== selectedConversation));
      
      // Deseleccionar la conversación actual
      setSelectedConversation(null);
      
      toast({
        title: "Grupo abandonado",
        description: "Has abandonado el grupo correctamente",
      });
    } catch (error) {
      console.error('Error al abandonar el grupo:', error);
      toast({
        title: "Error",
        description: "No se pudo abandonar el grupo",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Función para expulsar a un participante (solo para administradores)
  const handleRemoveParticipant = async (participantId: string) => {
    if (!selectedConversation || !isGroupAdmin) return;
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${selectedConversation}/participants/${participantId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Error al expulsar al participante');
      }
      
      // Actualizar la lista de participantes en el estado local
      if (selectedConversationData) {
        const updatedParticipants = selectedConversationData.participants.filter(
          p => p.userId !== participantId
        );
        
        const updatedData = {
          ...selectedConversationData,
          participants: updatedParticipants
        };
        
        setSelectedConversationData(updatedData);
      }
      
      toast({
        title: "Participante expulsado",
        description: "El participante ha sido expulsado del grupo",
      });
    } catch (error) {
      console.error('Error al expulsar al participante:', error);
      toast({
        title: "Error",
        description: "No se pudo expulsar al participante",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Función para cargar seguidores mutuos que no están en el grupo
  const loadPossibleParticipants = useCallback(async () => {
    if (!selectedConversation || !session?.user?.id) return;
    
    try {
      // Obtener seguidores mutuos
      const response = await fetch('/api/follow/mutual');
      if (!response.ok) {
        throw new Error('Error al cargar seguidores mutuos');
      }
      
      const mutualFollowers = await response.json();
      
      // Filtrar los que ya están en el grupo
      const currentParticipantIds = selectedConversationData?.participants?.map(p => p.userId) || [];
      const filteredUsers = mutualFollowers.filter(
        (user: User) => !currentParticipantIds.includes(user.id)
      );
      
      setPossibleParticipants(filteredUsers);
      setSelectedNewParticipants([]);
      setShowAddParticipantsModal(true);
    } catch (error) {
      console.error('Error al cargar posibles participantes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los posibles participantes",
        variant: "destructive",
      });
    }
  }, [selectedConversation, selectedConversationData, session?.user?.id, toast]);

  // Función para añadir participantes al grupo
  const handleAddParticipants = async () => {
    if (!selectedConversation || selectedNewParticipants.length === 0) return;
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${selectedConversation}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          participantIds: selectedNewParticipants
        })
      });
      
      if (!response.ok) {
        throw new Error('Error al añadir participantes');
      }
      
      const data = await response.json();
      
      // Actualizar la lista local de participantes
      if (selectedConversationData && data.participants) {
        const updatedData = {
          ...selectedConversationData,
          participants: data.participants
        };
        
        // Actualizar el estado
        setSelectedConversationData(updatedData);
      }
      
      // Cerrar el modal de añadir participantes
      setShowAddParticipantsModal(false);
      
      toast({
        title: "Participantes añadidos",
        description: `Se han añadido ${selectedNewParticipants.length} participantes al grupo`,
      });
      
      // Limpiar la selección
      setSelectedNewParticipants([]);
    } catch (error) {
      console.error('Error al añadir participantes:', error);
      toast({
        title: "Error",
        description: "No se pudieron añadir los participantes al grupo",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Manejar selección/deselección de participantes
  const toggleParticipantSelection = (userId: string) => {
    if (selectedNewParticipants.includes(userId)) {
      setSelectedNewParticipants(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedNewParticipants(prev => [...prev, userId]);
    }
  };

  // Función para actualizar el nombre del grupo
  const handleUpdateGroupName = async () => {
    if (groupNameEdit.trim() === "") {
      toast({
        title: "Error",
        description: "El nombre del grupo no puede estar vacío",
        variant: "destructive",
      });
      return;
    }
    
    const success = await updateGroupInfo({ name: groupNameEdit });
    if (success) {
      toast({
        title: "Nombre actualizado",
        description: "El nombre del grupo ha sido actualizado correctamente",
      });
    }
  };

  // Función para actualizar la descripción del grupo
  const handleUpdateGroupDescription = async () => {
    const success = await updateGroupInfo({ description: groupDescriptionEdit });
    if (success) {
      toast({
        title: "Descripción actualizada",
        description: "La descripción del grupo ha sido actualizada correctamente",
      });
    }
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
            {/* Botón para nuevo grupo */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowCreateGroupModal(true)}
              title="Nuevo grupo"
              aria-label="Nuevo grupo"
              className="rounded-full"
            >
              <Users size={20} />
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
                    const isGroup = conversation.isGroup || conversation.id.startsWith('group_');
                      
                    return (
                      <div
                        key={conversation.id}
                        className={`p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-start space-x-3 ${isSelected && "bg-blue-50 dark:bg-gray-700"}`}
                        onClick={() => handleConversationSelect(conversation)}
                      >
                        {/* Avatar */}
                        <Avatar className="h-12 w-12 border-2 border-gray-200 dark:border-gray-700">
                          {isGroup ? (
                            // Avatar para grupos
                            conversation.imageUrl && conversation.imageUrl.includes('cloudinary') ? (
                              <CldImage
                                src={conversation.imageUrl}
                                alt={conversation.name || "Grupo"}
                                width={48}
                                height={48}
                                crop="fill"
                                gravity="face"
                                className="object-cover rounded-full"
                                priority
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            ) : conversation.imageUrl && !conversation.imageUrl.startsWith('/') && !conversation.imageUrl.startsWith('http') ? (
                              <CldImage
                                src={conversation.imageUrl}
                                alt={conversation.name || "Grupo"}
                                width={48}
                                height={48}
                                crop="fill"
                                gravity="face"
                                className="object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            ) : (
                              <Image 
                                src={"/images/AvatarPredeterminado.webp"}
                                width={48}
                                height={48}
                                alt={conversation.name || "Grupo"}
                                className="rounded-full object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            )
                          ) : (
                            // Avatar para conversaciones individuales
                            conversation.otherUser?.image && conversation.otherUser.image.includes('cloudinary') ? (
                              <CldImage
                                src={conversation.otherUser.image}
                                alt={conversation.otherUser?.username || "Usuario"}
                                width={48}
                                height={48}
                                crop="fill"
                                gravity="face"
                                className="object-cover"
                                priority
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            ) : conversation.otherUser?.image && !conversation.otherUser.image.startsWith('/') && !conversation.otherUser.image.startsWith('http') ? (
                              <CldImage
                                src={conversation.otherUser.image}
                                alt={conversation.otherUser?.username || "Usuario"}
                                width={48}
                                height={48}
                                crop="fill"
                                gravity="face"
                                className="object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            ) : (
                              <Image
                                src={conversation.otherUser?.image || "/images/AvatarPredeterminado.webp"}
                                width={48}
                                height={48}
                                alt={conversation.otherUser?.username || "Usuario"}
                                className="rounded-full object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            )
                          )}
                        </Avatar>
                          
                        {/* Info del chat */}
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start">
                            <h3 className="font-medium truncate">
                              {isGroup 
                                ? (conversation.name || "Grupo sin nombre") 
                                : (conversation.otherUser?.username || "Usuario desconocido")
                              }
                            </h3>
                            <span className="text-xs text-gray-500">
                              {conversation.updatedAt && new Date(conversation.updatedAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          
                          {/* Mostrar número de participantes para grupos */}
                          {isGroup && (
                            <p className="text-xs text-gray-500 mb-1">
                              {getParticipantCount(conversation)} participantes
                            </p>
                          )}
                          
                          {/* Último mensaje */}
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
        
        {/* Nuevos botones para crear conversaciones y grupos */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 grid grid-cols-2 gap-2">
          <Button
            onClick={() => setShowNewMessageModal(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-lg"
          >
            <MessageSquarePlus className="h-5 w-5 mr-2" />
            Nuevo mensaje
          </Button>
          
          <Button
            onClick={() => setShowCreateGroupModal(true)}
            className="bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-medium rounded-lg"
          >
            <Users className="h-5 w-5 mr-2" />
            Nuevo grupo
          </Button>
          
          {/* Botón de depuración - solo visible en desarrollo */}
          {process.env.NODE_ENV !== 'production' && (
            <Button
              onClick={loadConversationsDirectly}
              className="col-span-2 mt-2 bg-gray-200 hover:bg-gray-300 text-gray-800"
            >
              Recargar conversaciones (Debug)
            </Button>
          )}
        </div>
      </div>

      {/* Panel derecho - Contenido de la conversación seleccionada */}
      <div className={`w-full md:w-2/3 lg:w-3/4 bg-white dark:bg-gray-800 flex flex-col ${!mobileView || (mobileView && selectedConversation) ? "flex" : "hidden md:flex"}`}>
        {selectedConversation && selectedConversationData ? (
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
                <Avatar className="h-10 w-10 mr-2">
                  {selectedConversationData?.isGroup ? (
                    // Avatar para grupos
                    selectedConversationData.imageUrl && selectedConversationData.imageUrl.includes('cloudinary') ? (
                      <CldImage
                        src={selectedConversationData.imageUrl}
                        alt={selectedConversationData.name || "Grupo"}
                        width={48}
                        height={48}
                        crop="fill"
                        gravity="face"
                        className="object-cover"
                        priority
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    ) : (
                      <Image 
                        src="/images/AvatarPredeterminado.webp"
                        alt={selectedConversationData?.name || "Grupo"}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                      />
                    )
                  ) : selectedConversationData?.otherUser?.image && selectedConversationData.otherUser.image.includes('cloudinary') ? (
                    <CldImage
                      src={selectedConversationData.otherUser.image}
                      alt={selectedConversationData.otherUser.username || "Usuario"}
                      width={48}
                      height={48}
                      crop="fill"
                      gravity="face"
                      className="object-cover"
                      priority
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : selectedConversationData?.otherUser?.image ? (
                    <Image 
                      src={selectedConversationData.otherUser.image}
                      alt={selectedConversationData.otherUser.username || "Usuario"}
                      width={48}
                      height={48}
                      className="rounded-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : (
                    <AvatarFallback>
                      {selectedConversationData?.otherUser?.username?.[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  )}
                </Avatar>
                <h2 className="font-medium">
                  {selectedConversationData?.isGroup 
                    ? selectedConversationData.name || "Grupo" 
                    : selectedConversationData?.otherUser?.username || "Usuario"
                  }
                </h2>
              </div>
              
              {/* Botón de administración de grupo (solo visible para grupos) */}
              {selectedConversationData?.isGroup && (
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleOpenGroupManagement}
                    className="flex items-center text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                  >
                    <Settings className="h-5 w-5 mr-1" />
                    <span className="hidden sm:inline">Administrar grupo</span>
                  </Button>
                </div>
              )}
            </div>
            
            {/* Contenido de la conversación integrado directamente */}
            {selectedConversationData?.isGroup ? (
              <GroupChatWindowContent 
                conversation={selectedConversationData} 
                className="h-full" 
              />
            ) : (
              <ChatWindowContent 
                otherUser={selectedConversationData?.otherUser || null} 
                conversationId={selectedConversation}
                className="h-full" 
              />
            )}
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
              
              {mutualFollowers.length === 0 ? (
                <div className="text-center py-4">
                  <MessageCircle className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p className="text-gray-500 mb-2">No se encontraron seguidores mutuos.</p>
                  <p className="text-xs mt-1">Solo puedes iniciar conversaciones con usuarios que te siguen mutuamente.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                  {mutualFollowers
                    .filter(user => {
                      const searchTerm = generalSearchTerm.toLowerCase();
                      return searchTerm.trim() === "" || 
                        (user.username && user.username.toLowerCase().includes(searchTerm));
                    })
                    .map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-2 rounded-lg cursor-pointer"
                        onClick={() => {
                          setShowNewMessageModal(false);
                          startNewConversation(user.id);
                        }}
                      >
                        <div className="flex items-center flex-1">
                          <Avatar className="h-8 w-8 mr-2">
                            {user.image && user.image.includes('cloudinary') ? (
                              <CldImage
                                src={user.image}
                                alt={user.username || 'Usuario'}
                                width={48}
                                height={48}
                                crop="fill"
                                gravity="face"
                                className="object-cover"
                                priority
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            ) : user.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
                              <CldImage
                                src={user.image}
                                alt={user.username || 'Usuario'}
                                width={48}
                                height={48}
                                crop="fill"
                                gravity="face"
                                className="object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            ) : (
                              <Image 
                                src={user.image || "/images/AvatarPredeterminado.webp"} 
                                alt={user.username || 'Usuario'} 
                                width={40} 
                                height={40}
                                className="rounded-full object-cover"
                                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                  const target = e.target as HTMLImageElement;
                                  target.src = "/images/AvatarPredeterminado.webp";
                                }}
                              />
                            )}
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user.username || 'Usuario sin nombre'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Modal para crear un nuevo grupo */}
    <Dialog open={showCreateGroupModal} onOpenChange={setShowCreateGroupModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear nuevo grupo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 p-2">
          {creatingGroup ? (
            <div className="flex flex-col items-center py-4">
              <LoadingSpinner className="h-10 w-10 mb-4" />
              <p className="text-center text-sm text-gray-500">Creando grupo...</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {/* Sección para subir imagen del grupo */}
                <div className="flex justify-center">
                  <div className="relative">
                    <div className={`h-24 w-24 rounded-full flex items-center justify-center overflow-hidden border-2 ${groupImagePreview ? 'border-blue-500' : 'border-gray-300 border-dashed'}`}>
                      {groupImagePreview ? (
                        <img 
                          src={groupImagePreview} 
                          alt="Vista previa" 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="text-gray-400 flex flex-col items-center justify-center">
                          <ImagePlus size={24} />
                          <span className="text-xs mt-1">Imagen</span>
                        </div>
                      )}
                    </div>
                    
                    {groupImagePreview && (
                      <button 
                        onClick={removeSelectedImage}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        aria-label="Eliminar imagen"
                      >
                        <X size={14} />
                      </button>
                    )}
                    
                    <input 
                      type="file" 
                      id="group-image-upload" 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <label 
                      htmlFor="group-image-upload"
                      className={`absolute bottom-0 right-0 bg-blue-500 text-white rounded-full p-1 shadow-md cursor-pointer ${groupImagePreview ? '' : 'animate-pulse'}`}
                    >
                      <Plus size={14} />
                    </label>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium mb-1">
                    Nombre del grupo *
                  </label>
                  <Input 
                    id="groupName"
                    placeholder="Nombre del grupo" 
                    value={groupName} 
                    onChange={(e) => setGroupName(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="groupDescription" className="block text-sm font-medium mb-1">
                    Descripción (opcional)
                  </label>
                  <Input 
                    id="groupDescription"
                    placeholder="Describe el propósito del grupo" 
                    value={groupDescription} 
                    onChange={(e) => setGroupDescription(e.target.value)}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label htmlFor="groupParticipants" className="block text-sm font-medium mb-1">
                    Participantes *
                  </label>
                  <div className="relative">
                    <Input 
                      id="groupParticipants"
                      placeholder="Buscar usuario..." 
                      value={generalSearchTerm}
                      onChange={(e) => setGeneralSearchTerm(e.target.value)}
                      className="w-full"
                    />
                    <button className="absolute top-0 right-0 h-full px-3 flex items-center text-gray-400">
                      <Search size={16} />
                    </button>
                  </div>
                  
                  <div className="mt-3 max-h-48 overflow-y-auto">
                    {mutualFollowersForGroups.length > 0 ? (
                      <ul className="space-y-2">
                        {mutualFollowersForGroups
                          .filter(user => {
                            const searchTerm = generalSearchTerm.toLowerCase();
                            return searchTerm.trim() === "" || 
                              (user.username && user.username.toLowerCase().includes(searchTerm));
                          })
                          .map(user => (
                            <li 
                              key={user.id} 
                              className={`flex items-center p-2 rounded-md cursor-pointer ${
                                selectedParticipants.some(p => p.id === user.id) 
                                  ? 'bg-blue-50 dark:bg-blue-900/30' 
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-800/60'
                              }`}
                              onClick={() => toggleParticipant(user)}
                            >
                              <div className="flex items-center flex-1">
                                <Avatar className="h-8 w-8 mr-2">
                                  {user.image && user.image.includes('cloudinary') ? (
                                    <CldImage
                                      src={user.image}
                                      alt={user.username || 'Usuario'}
                                      width={48}
                                      height={48}
                                      crop="fill"
                                      gravity="face"
                                      className="object-cover"
                                      priority
                                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "/images/AvatarPredeterminado.webp";
                                      }}
                                    />
                                  ) : user.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
                                    <CldImage
                                      src={user.image}
                                      alt={user.username || 'Usuario'}
                                      width={48}
                                      height={48}
                                      crop="fill"
                                      gravity="face"
                                      className="object-cover"
                                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "/images/AvatarPredeterminado.webp";
                                      }}
                                    />
                                  ) : (
                                    <Image 
                                      src={user.image || "/images/AvatarPredeterminado.webp"} 
                                      alt={user.username || 'Usuario'} 
                                      width={40} 
                                      height={40}
                                      className="rounded-full object-cover"
                                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "/images/AvatarPredeterminado.webp";
                                      }}
                                    />
                                  )}
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{user.username || 'Usuario sin nombre'}</p>
                                </div>
                              </div>
                              <div className="ml-2">
                                {selectedParticipants.some(p => p.id === user.id) ? (
                                  <span className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white rounded-full">
                                    <Check size={14} />
                                  </span>
                                ) : (
                                  <span className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded-full dark:border-gray-600">
                                  </span>
                                )}
                              </div>
                            </li>
                          ))}
                      </ul>
                    ) : (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        <p>No se encontraron seguidores mutuos.</p>
                        <p className="text-xs mt-1">Solo puedes agregar usuarios que te siguen mutuamente.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-2 mt-6">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowCreateGroupModal(false);
                    setGroupName("");
                    setGroupDescription("");
                    setSelectedParticipants([]);
                    setGroupImage(null);
                    setGroupImagePreview(null);
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  disabled={!groupName || selectedParticipants.length === 0}
                  onClick={createGroup}
                >
                  Crear grupo
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Modal para administrar grupo */}
    <GroupManagementModal 
      isOpen={showGroupManagementModal} 
      onClose={() => setShowGroupManagementModal(false)} 
      conversationData={selectedConversationData} 
      currentUserId={session?.user?.id || ""} 
      onConversationUpdate={(updatedData) => {
        if (selectedConversationData) {
          // Actualizar el estado con conversión de tipos
          const newData = {
            ...selectedConversationData,
            ...updatedData,
            // Convertir posibles null a undefined para cumplir con el tipo
            name: updatedData.name === null ? undefined : updatedData.name || selectedConversationData.name,
            description: updatedData.description === null ? undefined : updatedData.description || selectedConversationData.description,
            imageUrl: updatedData.imageUrl === null ? undefined : updatedData.imageUrl || selectedConversationData.imageUrl
          };
          
          setSelectedConversationData(newData);
          
          // También actualizar en la lista de conversaciones
          setConversations(prev => prev.map(conv => 
            conv.id === selectedConversationData.id ? {...conv, ...updatedData as any} : conv
          ));
        }
      }} 
      onDeleteGroup={() => {
        // Eliminar de la lista de conversaciones
        setConversations(prev => prev.filter(conv => conv.id !== selectedConversationData?.id));
        setSelectedConversation(null);
        setSelectedConversationData(null);
      }} 
      onLeaveGroup={() => {
        // Eliminar de la lista de conversaciones
        setConversations(prev => prev.filter(conv => conv.id !== selectedConversationData?.id));
        setSelectedConversation(null);
        setSelectedConversationData(null);
      }} 
    />
    </>
  );
}
