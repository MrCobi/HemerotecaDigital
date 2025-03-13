"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatWindow } from "@/src/app/components/Chat/ChatWindow";
import { Button } from "@/src/app/components/ui/button";
import { MessageSquarePlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/app/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/app/components/ui/avatar";
import { Input } from "@/src/app/components/ui/input";

interface User {
  id: string;
  username: string | null;
  image: string | null;
}

interface Conversation {
  id: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: User;
  receiver: User;
}

export default function MessagesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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
          setConversations(data);
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchConversations();
    }
  }, [session, status, router]);

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
  const startNewConversation = (userId: string) => {
    // Añadir la conversación a la lista actual
    const otherUser = mutualFollowers.find(user => user.id === userId);
    if (otherUser && session?.user) {
      setDialogOpen(false);
      
      // Crear una nueva conversación temporal
      const newConversation: Conversation = {
        id: `temp-${Date.now()}`,
        senderId: session.user.id,
        receiverId: otherUser.id,
        createdAt: new Date().toISOString(),
        sender: {
          id: session.user.id,
          username: session.user.username || null,
          image: session.user.image || null
        },
        receiver: otherUser
      };
      
      setConversations([...conversations, newConversation]);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-white">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conversations.map((conversation) => {
            const otherUser = conversation.senderId === session?.user?.id 
              ? conversation.receiver 
              : conversation.sender;
              
            return (
              <div key={conversation.id} className="border rounded-lg p-4 bg-blue-900">
                <ChatWindow 
                  otherUser={otherUser} 
                  currentUserId={session?.user?.id as string}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}