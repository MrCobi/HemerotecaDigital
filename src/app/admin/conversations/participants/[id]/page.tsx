"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, Users, UserPlus, Search, Shield, CircleUser, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";
import { Input } from "@/src/app/components/ui/input";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/src/app/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/app/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/app/components/ui/dropdown-menu";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username?: string | null;
}

interface Participant {
  id: string;
  userId: string;
  conversationId: string;
  role: string;
  isAdmin?: boolean; // Para compatibilidad con código existente
  createdAt: string;
  user: User;
}

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  imageUrl?: string | null;
  description?: string | null;
  participants: Participant[];
  creatorId?: string;
  creator?: User | null;
  _count?: {
    participants: number;
  };
}

export default function ConversationParticipantsPage({ params }: PageProps) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [removingParticipant, setRemovingParticipant] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [_searching, _setSearching] = useState(false);

  // Función para cargar la conversación (usando useCallback para evitar dependencias circulares)
  const loadConversation = useCallback(async () => {
    if (!conversationId) return;
    
    setLoading(true);
    
    try {
      const sessionRes = await fetch('/api/auth/session');
      const sessionData = await sessionRes.json();
      
      if (!sessionData.user) {
        router.push('/auth/signin');
        return;
      }
      
      const response = await fetch(`/api/admin/conversations/${conversationId}`);
      
      if (!response.ok) {
        throw new Error(`Error al cargar la conversación: ${response.status}`);
      }
      
      const data: Conversation = await response.json();
      setConversation(data);
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar conversación:", err);
      setError("Error al cargar los datos de la conversación");
      setLoading(false);
    }
  }, [conversationId, router]);
  
  // Obtener el ID de la conversación desde los parámetros
  useEffect(() => {
    async function getParamId() {
      try {
        const parameters = await params;
        setConversationId(parameters.id);
      } catch (err) {
        console.error("Error al obtener ID de parámetros:", err);
        setError("Error al cargar la página");
        setLoading(false);
      }
    }
    
    getParamId();
  }, [params]);

  // Cargar los datos de la conversación
  useEffect(() => {
    if (!conversationId) return;
    loadConversation();
  }, [conversationId, loadConversation]);

  // Filtrar participantes según el término de búsqueda
  const filteredParticipants = conversation?.participants?.filter(participant => {
    const userName = participant.user.name || "";
    const userEmail = participant.user.email || "";
    const searchLower = searchTerm.toLowerCase();
    
    return userName.toLowerCase().includes(searchLower) || 
           userEmail.toLowerCase().includes(searchLower);
  }) || [];

  // Buscar usuarios para añadir como participantes
  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    
    setSearchingUsers(true);
    
    try {
      const response = await fetch(`/api/admin/users/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        throw new Error("Error al buscar usuarios");
      }
      
      const data: User[] = await response.json();
      
      // Filtrar usuarios que ya son participantes
      const existingUserIds = conversation?.participants.map(p => p.userId) || [];
      const filteredResults = data.filter((user: User) => !existingUserIds.includes(user.id));
      
      setSearchResults(filteredResults);
    } catch (err) {
      console.error("Error buscando usuarios:", err);
      toast.error("Error al buscar usuarios");
    } finally {
      setSearchingUsers(false);
    }
  };

  // Añadir un participante a la conversación
  const addParticipant = async (userId: string, role: string) => {
    if (!conversationId) return;
    
    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al añadir participante");
      }
      
      const newParticipant: Participant = await response.json();
      
      // Actualizar el estado local con la conversación actualizada
      if (newParticipant.conversationId) {
        loadConversation();
        setSearchTerm("");
        toast.success("Participante añadido con éxito");
      } else {
        toast.error("Error al añadir participante");
      }
    } catch (err: Error | unknown) {
      console.error("Error añadiendo participante:", err);
      toast.error(err instanceof Error ? err.message : "No se pudo añadir el participante");
    } finally {
      setAddingParticipant(false);
    }
  };

  // Eliminar un participante de la conversación
  const _removeParticipant = async (participantId: string) => {
    if (!conversationId) {
      toast.error("ID de conversación no disponible");
      return;
    }
    
    if (!participantId) {
      toast.error("ID de participante no válido");
      return;
    }
    
    setRemovingParticipant(participantId);
    
    try {
      console.log(`Eliminando participante ${participantId} de la conversación ${conversationId}`);
      
      const response = await fetch(`/api/admin/conversations/${conversationId}/participants/${participantId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log(`Respuesta del servidor: ${response.status}`);
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Error al eliminar participante");
      }
      
      // Actualizar el estado local eliminando el participante
      if (conversation) {
        const updatedParticipants = conversation.participants.filter(p => p.id !== participantId);
        setConversation({
          ...conversation,
          participants: updatedParticipants
        });
        
        toast.success("Participante eliminado correctamente");
      } else {
        toast.warning("Participante eliminado, pero no se pudo actualizar la interfaz");
      }
    } catch (err: Error | unknown) {
      console.error("Error eliminando participante:", err);
      toast.error(err instanceof Error ? err.message : "No se pudo eliminar el participante");
    } finally {
      setRemovingParticipant(null);
    }
  };

  // Cambiar el rol de un participante
  const changeParticipantRole = async (participantId: string, isAdmin: boolean) => {
    if (!conversationId) return;
    
    setChangingRole(participantId);
    
    try {
      const response = await fetch(`/api/admin/conversations/${conversationId}/participants/${participantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isAdmin }),
      });
      
      if (!response.ok) {
        throw new Error("Error al cambiar el rol del participante");
      }
      
      // Actualizar el estado local cambiando el rol del participante
      if (conversation) {
        const updatedParticipants = conversation.participants.map(p => {
          if (p.id === participantId) {
            return { ...p, isAdmin };
          }
          return p;
        });
        
        setConversation({
          ...conversation,
          participants: updatedParticipants
        });
      }
      
      toast.success(`Usuario ${isAdmin ? 'promovido a administrador' : 'cambiado a miembro normal'}`);
    } catch (err) {
      console.error("Error cambiando rol:", err);
      toast.error("No se pudo cambiar el rol del participante");
    } finally {
      setChangingRole(null);
    }
  };

  // Renderizar avatar de usuario
  const renderUserAvatar = (user: User) => {
    const defaultImage = "/images/AvatarPredeterminado.webp";
    return (
      <div className="h-10 w-10 rounded-full overflow-hidden">
        <Image
          src={user.image || defaultImage}
          alt={user.name || "Usuario"}
          width={40}
          height={40}
          className="h-full w-full object-cover"
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.src = defaultImage;
          }}
        />
      </div>
    );
  };

  // Mostrar pantalla de carga
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground">Cargando participantes...</p>
      </div>
    );
  }

  // Mostrar error si ocurrió alguno
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <X className="h-12 w-12 text-red-500 mb-2" />
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground text-center">{error}</p>
        <Button onClick={() => router.push('/admin/conversations')} className="mt-4">
          Volver a conversaciones
        </Button>
      </div>
    );
  }

  // Determinar si la conversación es privada (1:1) o un grupo
  const _isPrivateChat = conversationId?.startsWith('conv_');
  const isGroupChat = conversationId?.startsWith('group_');

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 max-w-5xl">
        {/* Encabezado y navegación */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/admin/conversations/view/${conversationId}`)}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Participantes</h1>
              <p className="text-muted-foreground text-sm">
                {conversation?.name || "Conversación"} 
                {conversation?.isGroup 
                  ? ` (Grupo con ${conversation.participants.length} participantes)`
                  : " (Conversación privada)"}
              </p>
            </div>
          </div>
          
          {isGroupChat && (
            <Dialog open={addingParticipant} onOpenChange={setAddingParticipant}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Añadir participante
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Añadir participante</DialogTitle>
                  <DialogDescription>
                    Busca usuarios por nombre o correo electrónico para añadirlos al grupo.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4 py-4">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Buscar usuarios..."
                      onChange={(e) => searchUsers(e.target.value)}
                      className="flex-1"
                    />
                    <Button variant="outline" size="icon">
                      {searchingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </Button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {searchResults.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        {searchingUsers ? "Buscando..." : "No se encontraron usuarios"}
                      </p>
                    ) : (
                      searchResults.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-2 rounded-md hover:bg-accent">
                          <div className="flex items-center space-x-3">
                            {renderUserAvatar(user)}
                            <div>
                              <p className="font-medium">{user.name || "Sin nombre"}</p>
                              <p className="text-sm text-muted-foreground">{user.email}</p>
                            </div>
                          </div>
                          <Button size="sm" onClick={() => addParticipant(user.id, "member")}>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Añadir
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddingParticipant(false)}>
                    Cancelar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Contenido principal */}
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          {/* Buscador */}
          <div className="p-4 border-b border-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar participante..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          {/* Lista de participantes */}
          <div className="divide-y divide-border">
            {filteredParticipants.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
                <p className="text-muted-foreground">No se encontraron participantes</p>
              </div>
            ) : (
              filteredParticipants.map((participant) => (
                <div key={participant.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Link href={`/admin/users/view/${participant.user.id}`}>
                      {renderUserAvatar(participant.user)}
                    </Link>
                    <div>
                      <div className="flex items-center">
                        <Link 
                          href={`/admin/users/view/${participant.user.id}`}
                          className="font-medium hover:text-primary transition"
                        >
                          {participant.user.name || participant.user.email}
                        </Link>
                        
                        {conversation?.creatorId === participant.user.id && (
                          <Badge variant="secondary" className="ml-2">Creador</Badge>
                        )}
                        
                        {participant.isAdmin && (
                          <Badge variant="outline" className="ml-2 flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{participant.user.email}</p>
                    </div>
                  </div>
                  
                  {isGroupChat && (
                    <div className="flex items-center space-x-2">
                      {changingRole === participant.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              Opciones
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            
                            {conversation?.creatorId !== participant.user.id && (
                              <>
                                {participant.isAdmin ? (
                                  <DropdownMenuItem onClick={() => changeParticipantRole(participant.id, false)}>
                                    <CircleUser className="h-4 w-4 mr-2" />
                                    Cambiar a miembro
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => changeParticipantRole(participant.id, true)}>
                                    <Shield className="h-4 w-4 mr-2" />
                                    Hacer administrador
                                  </DropdownMenuItem>
                                )}
                                
                                <DropdownMenuSeparator />
                                
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <DropdownMenuItem 
                                      className="text-red-600"
                                      onSelect={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                      }}
                                    >
                                      <X className="h-4 w-4 mr-2" />
                                      Eliminar del grupo
                                    </DropdownMenuItem>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>¿Eliminar participante?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Esta acción eliminará a <span className="font-medium">{participant.user.name || participant.user.email}</span> del grupo.
                                        No podrá ver mensajes nuevos una vez eliminado.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction 
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                        onClick={async () => {
                                          try {
                                            console.log(`Intentando eliminar participante: ${participant.id}`);
                                            const res = await fetch(`/api/admin/conversations/${conversationId}/participants/${participant.id}`, {
                                              method: 'DELETE',
                                            });
                                            
                                            if (res.ok) {
                                              // Actualizar la UI directamente
                                              if (conversation) {
                                                const newParticipants = conversation.participants.filter(p => p.id !== participant.id);
                                                setConversation({
                                                  ...conversation,
                                                  participants: newParticipants
                                                });
                                                toast.success("Participante eliminado correctamente");
                                              }
                                            } else {
                                              const data = await res.json();
                                              toast.error(data.error || "Error al eliminar el participante");
                                            }
                                          } catch (err) {
                                            console.error("Error:", err);
                                            toast.error("Ocurrió un error al eliminar el participante");
                                          }
                                        }}
                                      >
                                        {removingParticipant === participant.id ? (
                                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                          <X className="h-4 w-4 mr-2" />
                                        )}
                                        Eliminar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
