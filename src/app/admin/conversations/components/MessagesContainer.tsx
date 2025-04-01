"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { format } from "date-fns/format";
import Image from "next/image";
import { Check, CheckCheck, File, Mic, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
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
import { Button } from "@/src/app/components/ui/button";

// Exportar los tipos para poder usarlos en otros componentes
export type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

export type MessageRead = {
  id: string;
  userId: string;
  messageId: string;
  readAt: string;
  user: User;
};

export type Message = {
  id: string;
  content: string | null;
  senderId: string;
  receiverId: string | null;
  conversationId: string;
  createdAt: string;
  updatedAt: string;
  messageType: string;
  mediaUrl: string | null;
  read: boolean;
  sender: User;
  receiver: User | null;
  readBy: MessageRead[];
};

export type ConversationParticipant = {
  userId: string;
  role: string;
  user: User;
};

type MessagesContainerProps = {
  messages: Message[];
  participantMap: Record<string, ConversationParticipant>;
  onMessageDeleted?: (messageId: string) => void;
};

export default function MessagesContainer({ 
  messages, 
  participantMap: _participantMap, 
  onMessageDeleted 
}: MessagesContainerProps) {
  const [messageIdToDelete, setMessageIdToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedMessages, setDeletedMessages] = useState<Set<string>>(new Set());

  // Ordenar mensajes por fecha (más antiguos primero)
  const sortedMessages = [...messages]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .filter(message => !deletedMessages.has(message.id));

  // Función para renderizar el avatar del usuario
  const renderAvatar = (user: User | null, size: number = 36) => {
    if (!user) {
      return (
        <div className="h-9 w-9 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-xs">?</span>
        </div>
      );
    }

    return (
      <div className="h-9 w-9 overflow-hidden rounded-full flex-shrink-0">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "Usuario"}
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.src = "/images/AvatarPredeterminado.webp";
            }}
          />
        ) : (
          <Image
            src="/images/AvatarPredeterminado.webp"
            alt="Avatar predeterminado"
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
          />
        )}
      </div>
    );
  };

  // Función para renderizar el estado de lectura de un mensaje
  const renderReadStatus = (message: Message) => {
    // Verificar que readBy existe y tiene la propiedad length
    const readBy = message.readBy || [];
    const readCount = readBy.length;
    
    if (readCount === 0) {
      return (
        <div className="flex items-center text-gray-400" title="Enviado">
          <Check className="h-3.5 w-3.5" />
        </div>
      );
    }
    
    return (
      <div className="flex items-center text-green-500" title={`Leído por ${readCount} persona(s)`}>
        <CheckCheck className="h-3.5 w-3.5" />
        {readCount > 1 && <span className="ml-1 text-xs">{readCount}</span>}
      </div>
    );
  };

  // Manejar la eliminación de un mensaje
  const handleDeleteMessage = async (messageId: string) => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/admin/messages/${messageId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      // Actualizar la lista local de mensajes eliminados
      setDeletedMessages(prev => {
        const newSet = new Set(prev);
        newSet.add(messageId);
        return newSet;
      });
      
      // Notificar a la página padre si se proporcionó la función de callback
      if (onMessageDeleted) {
        onMessageDeleted(messageId);
      }
      
      toast.success("Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      toast.error("No se pudo eliminar el mensaje");
    } finally {
      setIsDeleting(false);
      setMessageIdToDelete(null);
    }
  };

  // Renderizar contenido del mensaje según tipo
  const renderMessageContent = (message: Message) => {
    switch (message.messageType) {
      case "text":
        return <p className="text-sm whitespace-pre-wrap overflow-hidden break-words">{message.content}</p>;
      
      case "image":
        return (
          <div>
            {message.content && <p className="text-sm mb-2">{message.content}</p>}
            <div className="relative rounded-lg overflow-hidden bg-gray-100 mt-1 max-w-xs">
              {message.mediaUrl && message.mediaUrl.includes('cloudinary') ? (
                // Extracción directa de la última parte de la URL (después de la última /)
                <Image
                  src={message.mediaUrl}
                  alt="Imagen compartida"
                  width={300}
                  height={200}
                  className="object-contain max-h-60"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/ImagenPredeterminada.webp";
                  }}
                />
              ) : (
                <Image
                  src={message.mediaUrl || "/images/ImagenPredeterminada.webp"}
                  alt="Imagen compartida"
                  width={300}
                  height={200}
                  className="object-contain max-h-60"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/ImagenPredeterminada.webp";
                  }}
                />
              )}
            </div>
          </div>
        );
      
      case "file":
        return (
          <div>
            {message.content && <p className="text-sm mb-2">{message.content}</p>}
            <a 
              href={message.mediaUrl || "#"} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center p-3 rounded-md bg-gray-100 dark:bg-gray-800 mt-1 max-w-xs hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <File className="h-6 w-6 text-blue-500 mr-2" />
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">
                  {message.mediaUrl?.split('/').pop() || "Archivo"}
                </p>
                <p className="text-xs text-muted-foreground">Descargar archivo</p>
              </div>
            </a>
          </div>
        );
      
      case "voice":
      case "audio":
        return (
          <div>
            {message.content && <p className="text-sm mb-2">{message.content}</p>}
            <div className="flex items-center p-3 rounded-md bg-gray-100 dark:bg-gray-800 mt-1 max-w-xs">
              <Mic className="h-6 w-6 text-blue-500 mr-2" />
              <div className="w-full">
                <p className="text-sm font-medium">Mensaje de voz</p>
                {message.mediaUrl ? (
                  <audio controls className="mt-2 max-w-full w-full">
                    <source src={message.mediaUrl} type="audio/mpeg" />
                    <source src={message.mediaUrl} type="video/mp4" />
                    <source src={message.mediaUrl} type="audio/wav" />
                    <source src={message.mediaUrl} type="audio/ogg" />
                    Tu navegador no soporta el elemento de audio.
                  </audio>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">Audio no disponible</p>
                )}
              </div>
            </div>
          </div>
        );
      
      default:
        return <p className="text-sm">{message.content || "[Contenido no disponible]"}</p>;
    }
  };

  return (
    <div className="space-y-6">
      {sortedMessages.length === 0 ? (
        <p className="text-center text-muted-foreground">No hay mensajes para mostrar</p>
      ) : (
        sortedMessages.map((message) => {
          const date = new Date(message.createdAt);
          const formattedDate = format(date, "dd/MM/yyyy HH:mm");
          const timeAgo = formatDistanceToNow(date, { locale: es, addSuffix: true });
          
          return (
            <div key={message.id} className="flex items-start group">
              <div className="mr-3">
                <Link href={`/admin/users/view/${message.sender.id}`}>
                  {renderAvatar(message.sender)}
                </Link>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 mb-1">
                  <Link 
                    href={`/admin/users/view/${message.sender.id}`}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition"
                  >
                    {message.sender.name || message.sender.email || "Usuario"}
                  </Link>
                  <span className="text-xs text-muted-foreground" title={formattedDate}>
                    {timeAgo}
                  </span>
                  
                  {/* Botón de eliminar mensaje */}
                  <AlertDialog open={messageIdToDelete === message.id} onOpenChange={(open) => {
                    if (!open) setMessageIdToDelete(null);
                  }}>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-0 h-6 w-6"
                        onClick={() => setMessageIdToDelete(message.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Eliminar mensaje</span>
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <Trash2 className="h-5 w-5 text-destructive" />
                          Eliminar mensaje
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          ¿Estás seguro de que deseas eliminar este mensaje?
                          <br />
                          Esta acción no se puede deshacer.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteMessage(message.id);
                          }}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {isDeleting ? (
                            <span className="animate-pulse">Eliminando...</span>
                          ) : (
                            "Eliminar mensaje"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                <div className="relative rounded-lg bg-gray-50 dark:bg-gray-900 p-3 mb-1">
                  {renderMessageContent(message)}
                </div>
                
                <div className="flex justify-end mr-2">
                  {renderReadStatus(message)}
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
