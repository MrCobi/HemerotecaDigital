"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { ArrowLeft, CheckCircle, Trash2, Users } from "lucide-react";
import { Button } from "@/src/app/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";
import { Badge } from "@/src/app/components/ui/badge";

type Participant = {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
    email: string | null;
  };
};

type Message = {
  id: string;
  content: string;
  createdAt: string;
  read: boolean;
  senderId: string;
  receiverId: string;
  messageType?: string;
  mediaUrl?: string;
  sender: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
  } | null;
  receiver: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
  } | null;
  conversation?: {
    id: string;
    name: string | null;
    isGroup: boolean;
    imageUrl: string | null;
    description: string | null;
    participants: Participant[];
  } | null;
};

export default function MessageViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  
  const [message, setMessage] = useState<Message | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  useEffect(() => {
    async function loadMessage() {
      try {
        // Verificar sesión
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

        // Cargar datos del mensaje
        const res = await fetch(`/api/admin/messages/${id}`);
        
        if (!res.ok) {
          if (res.status === 404) {
            throw new Error('Mensaje no encontrado');
          }
          throw new Error(`Error al cargar mensaje: ${res.status}`);
        }
        
        const data = await res.json();
        setMessage(data);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar mensaje:", err);
        setError(err instanceof Error ? err.message : "Error al cargar datos del mensaje");
        setLoading(false);
      }
    }

    if (id) {
      loadMessage();
    }
  }, [id, router]);

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }
      
      toast.success("Mensaje eliminado correctamente");
      router.push("/admin/messages");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      toast.error("No se pudo eliminar el mensaje");
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  const handleMarkAsRead = async () => {
    if (!message || message.read) return;
    
    try {
      setIsMarkingAsRead(true);
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ read: true }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }
      
      // Actualizar el estado localmente
      setMessage(prevMessage => prevMessage ? { ...prevMessage, read: true } : null);
      toast.success("Mensaje marcado como leído");
    } catch (error) {
      console.error("Error al marcar mensaje como leído:", error);
      toast.error("No se pudo marcar el mensaje como leído");
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  // Función para renderizar la imagen del usuario
  const renderUserImage = (user: Message['sender'] | Message['receiver'], size: number = 40) => {
    if (!user) return null;
    
    const defaultImage = "/images/AvatarPredeterminado.webp";
    const containerStyle = { width: `${size}px`, height: `${size}px` };
    
    return (
      <div className="overflow-hidden rounded-full flex items-center justify-center bg-gray-100" style={containerStyle}>
        {user.image ? (
          <Image
            src={user.image}
            alt={user?.name || "Avatar"}
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.src = defaultImage;
            }}
          />
        ) : (
          <Image
            src={defaultImage}
            alt="Avatar predeterminado"
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
          />
        )}
      </div>
    );
  };

  // Función para renderizar la imagen del grupo
  const renderGroupImage = (conversation: Message['conversation'], size: number = 40) => {
    if (!conversation) return null;
    
    const defaultImage = "/images/GroupAvatarPredeterminado.webp";
    const containerStyle = { width: `${size}px`, height: `${size}px` };
    
    return (
      <div className="overflow-hidden rounded-full flex items-center justify-center bg-gray-100" style={containerStyle}>
        {conversation.imageUrl ? (
          <Image
            src={conversation.imageUrl}
            alt={conversation.name || "Grupo"}
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.src = defaultImage;
            }}
          />
        ) : (
          <div className="bg-primary h-full w-full flex items-center justify-center text-white">
            <Users className="h-[60%] w-[60%]" />
          </div>
        )}
      </div>
    );
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
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <Link
                  href="/admin/messages"
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Volver a mensajes
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <div className="p-8">
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
          <p className="text-sm text-blue-700">Mensaje no encontrado</p>
          <div className="mt-4">
            <Link
              href="/admin/messages"
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark transition-colors duration-200"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a mensajes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 sm:mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Detalle del Mensaje</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/messages"
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-secondary hover:bg-secondary/80 transition-colors duration-200"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Link>
          {!message.read && (
            <Button
              variant="outline"
              onClick={handleMarkAsRead}
              disabled={isMarkingAsRead}
              className="inline-flex items-center rounded-md bg-green-100 px-3 py-2 text-sm font-medium text-green-800 ring-offset-background transition-colors hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isMarkingAsRead ? (
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-green-800"></div>
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              <span className="sm:inline hidden">Marcar como leído</span>
              <span className="sm:hidden inline">Leído</span>
            </Button>
          )}
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isDeleting}
                className="px-3 py-2"
              >
                {isDeleting ? (
                  <div className="h-4 w-4 mr-0 sm:mr-2 animate-spin rounded-full border-b-2 border-white"></div>
                ) : (
                  <Trash2 className="h-4 w-4 mr-0 sm:mr-2" />
                )}
                <span className="sm:inline hidden">Eliminar</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción eliminará el mensaje y no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="bg-card shadow overflow-hidden rounded-lg">
        <div className="p-3 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    message.read 
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                      : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {message.read ? "Leído" : "No leído"}
                </span>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(message.createdAt), { 
                    locale: es, 
                    addSuffix: true 
                  })}
                </p>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground overflow-hidden text-ellipsis">
                ID: <span className="font-mono">{message.id}</span>
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-medium">Remitente</h3>
                {message.sender ? (
                  <div className="flex items-center p-3 sm:p-4 bg-card/50 rounded-lg border">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 mr-3 sm:mr-4">
                      {renderUserImage(message.sender, 48)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/users/view/${message.sender.id}`}
                        className="text-primary hover:text-primary/80 transition-colors text-sm sm:text-md font-medium truncate block"
                      >
                        {message.sender.name || message.sender.username || "Usuario sin nombre"}
                      </Link>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">{message.sender.email}</div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 sm:p-4 bg-card/50 rounded-lg border text-muted-foreground">
                    Usuario eliminado
                  </div>
                )}
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                <h3 className="text-base sm:text-lg font-medium">Destinatario</h3>
                {message.conversation?.isGroup ? (
                  // Es un mensaje de grupo
                  <div className="p-3 sm:p-4 bg-card/50 rounded-lg border">
                    <div className="flex items-center mb-3">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 mr-3 sm:mr-4">
                        {renderGroupImage(message.conversation, 48)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-primary text-sm sm:text-md font-medium flex items-center">
                          <span className="truncate">{message.conversation.name || "Grupo sin nombre"}</span>
                          <Badge className="ml-2 flex-shrink-0" variant="secondary">Grupo</Badge>
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground">
                          {message.conversation.participants.length} participantes
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs sm:text-sm font-medium mb-2">Participantes:</p>
                      <div className="flex flex-wrap gap-2">
                        {message.conversation.participants.map((participant) => (
                          <Link 
                            key={participant.user.id}
                            href={`/admin/users/view/${participant.user.id}`}
                            className="inline-flex items-center text-xs bg-card/80 hover:bg-card p-1 px-2 rounded-full border"
                          >
                            <div className="h-4 w-4 sm:h-5 sm:w-5 mr-1">
                              {renderUserImage(participant.user, 20)}
                            </div>
                            <span className="truncate max-w-[100px] sm:max-w-[150px]">
                              {participant.user.name || participant.user.username || participant.user.email || "Usuario"}
                            </span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : message.receiver ? (
                  // Es un mensaje individual con receptor
                  <div className="flex items-center p-3 sm:p-4 bg-card/50 rounded-lg border">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 flex-shrink-0 mr-3 sm:mr-4">
                      {renderUserImage(message.receiver, 48)}
                    </div>
                    <div className="min-w-0">
                      <Link
                        href={`/admin/users/view/${message.receiver.id}`}
                        className="text-primary hover:text-primary/80 transition-colors text-sm sm:text-md font-medium truncate block"
                      >
                        {message.receiver.name || message.receiver.username || "Usuario sin nombre"}
                      </Link>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">{message.receiver.email}</div>
                    </div>
                  </div>
                ) : (
                  // Es un mensaje individual sin receptor (eliminado)
                  <div className="p-3 sm:p-4 bg-card/50 rounded-lg border text-muted-foreground">
                    Usuario eliminado
                  </div>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-base sm:text-lg font-medium">Contenido del mensaje</h3>
              <div className="p-3 sm:p-4 bg-card/50 rounded-lg border whitespace-pre-wrap break-words">
                {message.messageType && message.messageType !== 'text' && (
                  <Badge className="mb-2" variant="outline">
                    {message.messageType === 'image' && 'Imagen'}
                    {message.messageType === 'voice' && 'Audio'}
                    {message.messageType === 'video' && 'Video'}
                    {message.messageType === 'file' && 'Archivo'}
                  </Badge>
                )}
                
                {message.mediaUrl && ['image'].includes(message.messageType || '') ? (
                  <div className="mb-3">
                    <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
                      <Image 
                        src={message.mediaUrl} 
                        alt="Contenido multimedia" 
                        width={300} 
                        height={200} 
                        className="max-w-full h-auto rounded-md"
                      />
                    </a>
                  </div>
                ) : message.mediaUrl ? (
                  <div className="mb-3">
                    <a 
                      href={message.mediaUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 underline flex items-center"
                    >
                      Ver archivo adjunto
                    </a>
                  </div>
                ) : null}
                
                <div className="text-sm sm:text-base">{message.content}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
