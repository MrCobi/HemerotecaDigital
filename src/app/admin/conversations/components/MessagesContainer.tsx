"use client";

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

  // Renderizar estado de lectura del mensaje
  const renderReadStatus = (message: Message) => {
    return (
      <div className="flex items-center gap-0.5 text-[7px] sm:text-[8px] md:text-[10px] text-muted-foreground">
        {message.read ? (
          <>
            <CheckCheck className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-blue-500" />
            <span>Leído</span>
          </>
        ) : (
          <>
            <Check className="h-2 w-2 sm:h-2.5 sm:w-2.5 md:h-3 md:w-3 text-gray-400" />
            <span>Enviado</span>
          </>
        )}
      </div>
    );
  };

  // Renderizar contenido del mensaje según su tipo
  const renderMessageContent = (message: Message) => {
    return (
      <>
        {message.content && (
          <div className="text-[10px] sm:text-[11px] md:text-xs break-words mb-2">
            {message.content}
          </div>
        )}
        
        {message.mediaUrl && (
          <div className="mt-1">
            {message.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
              <div className="max-w-[80px] sm:max-w-[100px] md:max-w-[160px] overflow-hidden rounded">
                <Image
                  src={message.mediaUrl}
                  alt="Imagen"
                  width={160}
                  height={100}
                  className="w-full h-auto object-cover rounded"
                />
              </div>
            )}
            
            {message.mediaUrl.endsWith('.mp3') && (
              <div className="flex flex-col items-start gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] md:text-xs">
                <div className="flex items-center">
                  <Mic className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-blue-500 mr-0.5 sm:mr-1" />
                  <span>Audio</span>
                </div>
                <audio 
                  controls 
                  className="max-w-[70px] sm:max-w-[90px] md:max-w-[140px] h-5 sm:h-6 md:h-7"
                  style={{ minWidth: "70px" }}
                >
                  <source src={message.mediaUrl} type="audio/mpeg" />
                </audio>
              </div>
            )}
            
            {!message.mediaUrl.match(/\.(jpg|jpeg|png|gif|webp|mp3)$/i) && (
              <div className="flex items-center gap-0.5 sm:gap-1 text-[9px] sm:text-[10px] md:text-xs">
                <File className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-4 md:w-4 text-blue-500" />
                <a 
                  href={message.mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline truncate max-w-[60px] sm:max-w-[80px] md:max-w-[120px]"
                >
                  Archivo
                </a>
              </div>
            )}
          </div>
        )}
      </>
    );
  };

  // Función para renderizar el avatar del usuario
  const renderAvatar = (user: User | null, size: number = 36) => {
    if (!user) {
      return (
        <div className="h-7 w-7 sm:h-9 sm:w-9 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-gray-500 text-[10px] sm:text-xs">?</span>
        </div>
      );
    }

    return (
      <div className="h-7 w-7 sm:h-9 sm:w-9 overflow-hidden rounded-full flex-shrink-0">
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

  return (
    <div className="p-2 sm:p-4 space-y-3 sm:space-y-4 overflow-y-auto bg-muted/10 max-h-[500px]">
      {sortedMessages.length === 0 ? (
        <div className="text-center text-muted-foreground text-xs sm:text-sm py-4">
          No hay mensajes para mostrar
        </div>
      ) : (
        sortedMessages.map((message) => {
          const sender = message.sender;
          const messageClass = "flex flex-col p-1.5 sm:p-2 md:p-3 rounded-lg max-w-[75%]";
          return (
            <div key={message.id} className="group">
              <div className="flex items-start gap-1 sm:gap-2 group relative">
                <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 md:w-9 md:h-9">
                  {renderAvatar(sender, 24)}
                </div>
                
                <div className="flex-1 min-w-0 max-w-[calc(100%-32px)]">
                  <div className="flex items-center gap-1 mb-0.5 sm:mb-1">
                    <Link 
                      href={`/admin/users/view/${sender?.id}`} 
                      className="text-[9px] sm:text-[10px] md:text-xs font-medium text-primary truncate max-w-[80px] sm:max-w-[100px] md:max-w-[200px]"
                    >
                      {sender?.name || sender?.email || "Usuario"}
                    </Link>
                    <span className="text-[8px] sm:text-[9px] md:text-[10px] text-muted-foreground">
                      {format(new Date(message.createdAt), 'HH:mm')}
                    </span>
                  </div>
                  
                  <div className={`${messageClass} bg-card border border-border`}>
                    {renderMessageContent(message)}
                    
                    <div className="flex justify-end items-center gap-0.5 sm:gap-1 mt-0.5 sm:mt-1">
                      {renderReadStatus(message)}
                    </div>
                  </div>
                </div>
                
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <AlertDialog open={messageIdToDelete === message.id} onOpenChange={(open) => {
                    if (!open) setMessageIdToDelete(null);
                  }}>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-4 w-4 sm:h-5 sm:w-5 md:h-7 md:w-7 rounded-full text-muted-foreground hover:text-destructive p-0 flex-shrink-0"
                        onClick={() => setMessageIdToDelete(message.id)}
                      >
                        <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 md:h-3.5 md:w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
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
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
