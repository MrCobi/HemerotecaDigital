"use client"
import { useEffect, useState, useContext } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatWindow } from "@/src/app/components/Chat/ChatWindow";
import { Button } from "@/src/app/components/ui/button";
import { MessageSquarePlus, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/app/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/app/components/ui/avatar";
import { Input } from "@/src/app/components/ui/input";
import { UnreadMessagesContext } from "@/src/app/contexts/UnreadMessagesContext";

interface User {
  id: string;
  username: string | null;
  image: string | null;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: User;
  receiver: User;
  lastMessage?: Message;
  unreadCount?: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const { updateUnreadCount } = useContext(UnreadMessagesContext);

  // Obtener el ID de conversación de la URL si existe
  const conversationId = searchParams.get('conversationWith');

  useEffect(() => {
    // Redirigir si no está autenticado
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }

    // Obtener conversaciones cuando el usuario esté autenticado
    if (status === "authenticated" && session?.user?.id) {
      const fetchConversations = async () => {
        try {
          const res = await fetch('/api/messages/conversations');
          if (!res.ok) throw new Error('Error al cargar conversaciones');
          const data = await res.json();
          
          // Ordenar conversaciones por fecha del último mensaje (más reciente primero)
          const sortedConversations = data.sort((a: Conversation, b: Conversation) => {
            const dateA = a.lastMessage?.createdAt || a.createdAt;
            const dateB = b.lastMessage?.createdAt || b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
          
          setConversations(sortedConversations);
          
          // Si hay un ID en la URL, seleccionarlo
          if (conversationId) {
            const targetConversation = sortedConversations.find((conv: Conversation) => {
              const otherUserId = conv.senderId === session.user.id ? conv.receiverId : conv.senderId;
              return otherUserId === conversationId;
            });
            
            if (targetConversation) {
              setSelectedConversation(targetConversation.id);
            }
          } else if (sortedConversations.length > 0) {
            // Si no hay ID en la URL pero hay conversaciones, seleccionar la primera
            setSelectedConversation(sortedConversations[0].id);
          }
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchConversations();
      
      // Configurar intervalo para actualizar las conversaciones cada 10 segundos
      const interval = setInterval(fetchConversations, 10000);
      return () => clearInterval(interval);
    }
  }, [session, status, router, conversationId]);

  // Función para cargar usuarios con seguimiento mutuo
  const loadMutualFollowers = async () => {
    if (!session?.user?.id) return;
    
    try {
      const res = await fetch('/api/relationships/mutual');
      if (!res.ok) throw new Error('Error al cargar seguidores mutuos');
      const data = await res.json();
      
      // Filtrar usuarios que ya tienen una conversación existente
      const existingUserIds = new Set(
        conversations.map(conv => 
          conv.senderId === session.user.id ? conv.receiverId : conv.senderId
        )
      );
      
      const filteredUsers = data.filter((user: User) => !existingUserIds.has(user.id));
      setMutualFollowers(filteredUsers);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  // Filtrar usuarios en el modal de búsqueda
  const filteredUsers = searchTerm 
    ? mutualFollowers.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : mutualFollowers;

  // Iniciar nueva conversación
  const startNewConversation = async (userId: string) => {
    if (!session?.user) return;
    
    try {
      // Cerrar el diálogo inmediatamente para mejorar la experiencia del usuario
      setDialogOpen(false);
      
      // Mostrar una conversación temporal mientras se crea en el servidor
      const otherUser = mutualFollowers.find(user => user.id === userId);
      if (!otherUser) return;
      
      const tempId = `temp-${Date.now()}`;
      const tempConversation: Conversation = {
        id: tempId,
        senderId: session.user.id,
        receiverId: otherUser.id,
        createdAt: new Date().toISOString(),
        sender: {
          id: session.user.id,
          username: session.user.username || null,
          image: session.user.image || null
        },
        receiver: otherUser,
        unreadCount: 0
      };
      
      // Añadir temporalmente a la UI
      setConversations(prev => [tempConversation, ...prev]);
      setSelectedConversation(tempId);
      
      // Crear la conversación en el servidor
      const response = await fetch('/api/messages/conversations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });
      
      if (!response.ok) {
        throw new Error('Error al crear la conversación');
      }
      
      // Actualizar la lista de conversaciones desde el servidor
      const fetchConversations = async () => {
        const res = await fetch('/api/messages/conversations');
        if (res.ok) {
          const data = await res.json();
          const sortedConversations = data.sort((a: Conversation, b: Conversation) => {
            const dateA = a.lastMessage?.createdAt || a.createdAt;
            const dateB = b.lastMessage?.createdAt || b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          });
          
          setConversations(sortedConversations);
          
          // Encontrar la conversación recién creada y seleccionarla
          const newConversation = sortedConversations.find((conv: Conversation) => {
            const otherUserId = conv.senderId === session.user.id ? conv.receiverId : conv.senderId;
            return otherUserId === userId;
          });
          
          if (newConversation) {
            setSelectedConversation(newConversation.id);
          }
        }
      };
      
      fetchConversations();
      
    } catch (error) {
      console.error('Error al iniciar conversación:', error);
    }
  };

  // Formatear la fecha del último mensaje
  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    
    // Si es hoy, mostrar sólo la hora
    if (date.toDateString() === today.toDateString()) {
      return new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    
    // Si es esta semana, mostrar el día
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) {
      return new Intl.DateTimeFormat('es-ES', {
        weekday: 'long',
      }).format(date);
    }
    
    // Si es más antiguo, mostrar la fecha
    return new Intl.DateTimeFormat('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  // Marcar los mensajes como leídos cuando se selecciona una conversación
  useEffect(() => {
    if (selectedConversation) {
      const markMessagesAsRead = async () => {
        try {
          await fetch(`/api/messages/read?senderId=${selectedConversation}`, {
            method: 'POST'
          });
          
          // Actualizar el contador global de mensajes no leídos
          updateUnreadCount();
          
          // Actualizar la lista de conversaciones para reflejar que los mensajes están leídos
          const fetchConversations = async () => {
            try {
              const res = await fetch('/api/messages/conversations');
              if (!res.ok) throw new Error('Error al cargar conversaciones');
              const data = await res.json();
              
              // Ordenar conversaciones por fecha del último mensaje (más reciente primero)
              const sortedConversations = data.sort((a: Conversation, b: Conversation) => {
                const dateA = a.lastMessage?.createdAt || a.createdAt;
                const dateB = b.lastMessage?.createdAt || b.createdAt;
                return new Date(dateB).getTime() - new Date(dateA).getTime();
              });
              
              setConversations(sortedConversations);
            } catch (error) {
              console.error('Error:', error);
            }
          };
          fetchConversations();
        } catch (error) {
          console.error('Error al marcar mensajes como leídos:', error);
        }
      };
      
      markMessagesAsRead();
    }
  }, [selectedConversation]);

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-white">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  // Obtener la conversación seleccionada
  const selectedConversationData = conversations.find(conv => conv.id === selectedConversation);
  const selectedUser = selectedConversationData ? 
    (selectedConversationData.senderId === session?.user?.id ? 
      selectedConversationData.receiver : 
      selectedConversationData.sender) 
    : null;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">Mensajes Directos</h1>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={loadMutualFollowers}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <MessageSquarePlus className="mr-2 h-4 w-4" />
              Nueva conversación
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-blue-900 text-white border border-blue-700">
            <DialogHeader>
              <DialogTitle className="text-xl mb-4">Iniciar nueva conversación</DialogTitle>
            </DialogHeader>
            
            <Input
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mb-4 bg-blue-800 border-blue-700 text-white placeholder:text-blue-300"
            />
            
            <div className="max-h-[300px] overflow-y-auto p-1">
              {filteredUsers.length === 0 ? (
                <div className="text-center p-4 bg-blue-800 rounded-lg">
                  {searchTerm ? (
                    <p>No se encontraron usuarios con ese nombre</p>
                  ) : (
                    <p>No tienes seguidores mutuos para iniciar una conversación</p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredUsers.map(user => (
                    <div 
                      key={user.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-800 cursor-pointer transition-colors"
                      onClick={() => startNewConversation(user.id)}
                    >
                      <Avatar>
                        <AvatarImage src={user.image || ''} />
                        <AvatarFallback>
                          {user.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <span>{user.username || 'Usuario'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
      
      {conversations.length === 0 ? (
        <div className="text-center p-8 bg-blue-900 rounded-lg">
          <p className="text-white">No tienes conversaciones activas.</p>
          <p className="text-blue-300 mt-2">Inicia una nueva conversación haciendo clic en el botón superior.</p>
        </div>
      ) : (
        <div className="flex h-[calc(100vh-150px)] bg-blue-900 rounded-lg overflow-hidden">
          {/* Lista de conversaciones (estilo WhatsApp) */}
          <div className="w-1/3 border-r border-blue-800 overflow-y-auto">
            {conversations.map((conversation) => {
              const otherUser = conversation.senderId === session?.user?.id 
                ? conversation.receiver 
                : conversation.sender;
              
              const isSelected = conversation.id === selectedConversation;
              const lastMessage = conversation.lastMessage?.content || "Inicia una conversación";
              const lastMessageTime = conversation.lastMessage?.createdAt || conversation.createdAt;
              const formattedTime = formatMessageDate(lastMessageTime);
              const hasUnread = (conversation.unreadCount || 0) > 0;
                
              return (
                <div 
                  key={conversation.id} 
                  className={`flex items-center p-4 border-b border-blue-800 cursor-pointer hover:bg-blue-800/50 transition-colors
                    ${isSelected ? 'bg-blue-800' : ''}
                  `}
                  onClick={() => setSelectedConversation(conversation.id)}
                >
                  <Avatar className="h-12 w-12 mr-3">
                    <AvatarImage src={otherUser.image || ''} />
                    <AvatarFallback>
                      {otherUser.username?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-white truncate">
                        {otherUser.username || 'Usuario'}
                      </h3>
                      <span className="text-xs text-blue-300">{formattedTime}</span>
                    </div>
                    
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-sm truncate ${hasUnread ? 'text-white font-medium' : 'text-blue-300'}`}>
                        {lastMessage.length > 30 ? `${lastMessage.substring(0, 30)}...` : lastMessage}
                      </p>
                      
                      {hasUnread && (
                        <div className="rounded-full bg-green-500 text-white text-xs min-w-[20px] h-5 flex items-center justify-center px-1">
                          {conversation.unreadCount}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Ventana de chat seleccionada */}
          <div className="flex-1 bg-blue-950/30">
            {selectedUser ? (
              <ChatWindow 
                otherUser={selectedUser} 
                currentUserId={session?.user?.id as string}
                onMessageSent={() => {
                  // Actualizar la lista de conversaciones después de enviar un mensaje
                  const fetchConversations = async () => {
                    const res = await fetch('/api/messages/conversations');
                    if (res.ok) {
                      const data = await res.json();
                      setConversations(data.sort((a: Conversation, b: Conversation) => {
                        const dateA = a.lastMessage?.createdAt || a.createdAt;
                        const dateB = b.lastMessage?.createdAt || b.createdAt;
                        return new Date(dateB).getTime() - new Date(dateA).getTime();
                      }));
                    }
                  };
                  fetchConversations();
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center p-4">
                  <MessageCircle className="h-16 w-16 text-blue-500/40 mx-auto mb-4" />
                  <p className="text-blue-300">Selecciona una conversación para comenzar a chatear</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}