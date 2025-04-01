"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { ChevronLeft, Users, MessageSquare, Trash2, PencilLine } from "lucide-react";
import { Badge } from "@/src/app/components/ui/badge";
import { toast } from "sonner";
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
import MessagesContainer, { 
  Message,
  User as MessageUser,
  ConversationParticipant
} from "../../components/MessagesContainer";

interface _User {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  username?: string | null;
}

interface Conversation {
  id: string;
  name: string | null;
  isGroup: boolean;
  createdAt: string;
  lastMessageAt: string;
  imageUrl?: string | null;
  image?: string | null;
  messages: Message[];
  participants: ConversationParticipant[];
  creator?: MessageUser;
  _count?: {
    messages?: number;
    participants?: number;
  };
  description?: string;
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function ViewConversationPage({ params }: PageProps) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  useEffect(() => {
    if (!conversationId) return;
    
    async function loadConversation() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (!sessionData || !sessionData.user) {
          router.push("/api/auth/signin");
          return;
        }
        
        if (sessionData.user.role !== "admin") {
          router.push("/acceso-denegado");
          return;
        }

        const res = await fetch(`/api/admin/conversations/${conversationId}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            setError("Conversación no encontrada");
          } else {
            throw new Error('Error al cargar la conversación');
          }
          setLoading(false);
          return;
        }
        
        const data = await res.json();
        setConversation(data);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar conversación:", err);
        setError("Error al cargar los datos de la conversación");
        setLoading(false);
      }
    }

    loadConversation();
  }, [router, conversationId]);

  const handleDelete = async () => {
    if (!conversationId) return;
    
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }
      
      toast.success("Conversación eliminada correctamente");
      router.push("/admin/conversations");
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
      toast.error("Error al eliminar la conversación");
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <Link href="/admin/conversations" className="flex items-center text-primary hover:text-primary/80 transition">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver a conversaciones
          </Link>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-orange-700">No se pudo cargar la información de la conversación</p>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <Link href="/admin/conversations" className="flex items-center text-primary hover:text-primary/80 transition">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver a conversaciones
          </Link>
        </div>
      </div>
    );
  }

  const renderImage = () => {
    const defaultUserImage = "/images/AvatarPredeterminado.webp";
    const defaultGroupImage = "/images/AvatarPredeterminado.webp";
    
    const isGroup = conversation.isGroup;
    const imageUrl = conversation.imageUrl || conversation.image; 
    const alt = conversation.name || (isGroup ? "Grupo" : "Conversación");
    
    return (
      <div className="h-16 w-16 sm:h-24 sm:w-24 overflow-hidden rounded-full flex items-center justify-center bg-gray-100 border-2 border-white shadow-md">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alt}
            width={96}
            height={96}
            className="h-full w-full object-cover rounded-full"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.src = isGroup ? defaultGroupImage : defaultUserImage;
            }}
          />
        ) : isGroup ? (
          <div className="h-full w-full flex items-center justify-center bg-primary text-white">
            <Users className="h-8 w-8" />
          </div>
        ) : (
          <Image
            src={defaultUserImage}
            alt="Avatar predeterminado"
            width={96}
            height={96}
            className="h-full w-full object-cover rounded-full"
          />
        )}
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link href="/admin/conversations" className="flex items-center text-primary hover:text-primary/80 transition">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a conversaciones
        </Link>
      </div>
      
      <div className="bg-card shadow rounded-xl overflow-hidden">
        {/* Cabecera */}
        <div className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex flex-col sm:flex-row items-start sm:items-center">
            {renderImage()}
            
            <div className="mt-4 sm:mt-0 sm:ml-6 flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                <div>
                  <div className="flex items-center mb-1">
                    <h1 className="text-2xl font-bold text-foreground">
                      {conversation.isGroup 
                        ? (conversation.name || "Grupo sin nombre") 
                        : "Conversación individual"}
                    </h1>
                    <Badge
                      variant="outline"
                      className={`ml-3 ${
                        conversation.isGroup
                          ? "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                          : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800"
                      }`}
                    >
                      {conversation.isGroup ? (
                        <>
                          <Users className="h-3 w-3 mr-1" />
                          Grupo
                        </>
                      ) : (
                        <>
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Individual
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  {conversation.description && (
                    <p className="text-muted-foreground text-sm mb-2">{conversation.description}</p>
                  )}
                  
                  <div className="text-xs text-muted-foreground">
                    Creado: {formatDistanceToNow(new Date(conversation.createdAt), { locale: es, addSuffix: true })}
                  </div>
                </div>
                
                <div className="flex items-center mt-4 sm:mt-0 space-x-2">
                  <Link
                    href={`/admin/conversations/edit/${conversationId}`}
                    className="inline-flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40"
                  >
                    <PencilLine className="h-4 w-4 mr-1" />
                    Editar
                  </Link>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <button
                        className="inline-flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Eliminar
                      </button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          Eliminar conversación
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que deseas eliminar esta conversación? 
                          <br />
                          Esta acción eliminará todos los mensajes y participantes asociados a esta conversación.
                        </AlertDialogDescription>
                        <p className="text-destructive font-medium text-sm mt-2">
                          Esta acción no se puede deshacer.
                        </p>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                            e.preventDefault();
                            handleDelete();
                          }}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isDeleting ? (
                            <span className="animate-pulse">Eliminando...</span>
                          ) : (
                            "Eliminar conversación"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Información y estadísticas */}
        <div className="px-6 py-4 border-b border-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Participantes</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="flex items-center">
                  <Users className="h-3 w-3 mr-1" />
                  {conversation._count?.participants || conversation.participants?.length || 0} personas
                </Badge>
                
                <Link
                  href={`/admin/conversations/participants/${conversationId}`}
                  className="text-xs text-primary hover:text-primary/80 transition"
                >
                  Ver participantes
                </Link>
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Mensajes</h3>
              <Badge variant="secondary" className="flex items-center">
                <MessageSquare className="h-3 w-3 mr-1" />
                {conversation._count?.messages || conversation.messages?.length || 0} mensajes
              </Badge>
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Creado por</h3>
              {conversation.creator ? (
                <Link
                  href={`/admin/users/view/${conversation.creator.id}`}
                  className="flex items-center text-primary hover:text-primary/80 transition"
                >
                  <div className="h-5 w-5 overflow-hidden rounded-full mr-1">
                    <Image
                      src={conversation.creator.image || "/images/AvatarPredeterminado.webp"}
                      alt={conversation.creator.name || "Usuario"}
                      width={20}
                      height={20}
                      className="h-full w-full object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  </div>
                  <span className="text-sm">
                    {conversation.creator.name || conversation.creator.email || "Usuario"}
                  </span>
                </Link>
              ) : (
                <span className="text-sm text-muted-foreground">No disponible</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Mensajes de la conversación */}
        <div className="px-6 py-4">
          <h2 className="text-lg font-medium mb-4">Mensajes recientes</h2>
          
          {conversation.messages && conversation.messages.length > 0 ? (
            <MessagesContainer 
              messages={conversation.messages} 
              participantMap={
                conversation.participants.reduce((acc: Record<string, ConversationParticipant>, participant: ConversationParticipant) => {
                  acc[participant.userId] = participant;
                  return acc;
                }, {})
              } 
              onMessageDeleted={(messageId: string) => {
                // Actualizar el estado local para reflejar el mensaje eliminado
                setConversation((prev: Conversation | null) => {
                  if (!prev) return null;
                  
                  return {
                    ...prev,
                    messages: prev.messages.filter((msg: Message) => msg.id !== messageId),
                    _count: {
                      ...prev._count,
                      messages: ((prev._count?.messages || prev.messages.length) - 1)
                    }
                  };
                });
              }}
            />
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No hay mensajes en esta conversación</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
