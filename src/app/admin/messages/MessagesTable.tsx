"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Trash2, Eye, CheckCircle, Users, MessageSquare } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";
import { Badge } from "@/src/app/components/ui/badge";

type MessageType = "text" | "image" | "voice" | "file" | "video";

type Message = {
  id: string;
  content: string | null;
  createdAt: string; // ISO date string
  read: boolean;
  senderId: string;
  receiverId: string | null;
  mediaUrl: string | null;
  messageType: MessageType;
  conversationId: string;
  sender: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  receiver: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  conversation: {
    id: string;
    name: string | null;
    isGroup: boolean;
    imageUrl: string | null;
    participants?: {
      user: {
        id: string;
        name: string | null;
        image: string | null;
      }
    }[];
  };
  readBy?: {
    id: string;
    userId: string;
    readAt: string;
    user: {
      id: string;
      name: string | null;
      image: string | null;
    }
  }[];
};

type MessagesTableProps = {
  messages: Message[];
};

interface DeleteMessageDialogProps {
  messageId: string;
  onDelete: (id: string) => Promise<void>;
}

function DeleteMessageDialog({ messageId, onDelete }: DeleteMessageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  async function handleDelete() {
    try {
      setIsDeleting(true);
      await onDelete(messageId);
      setIsOpen(false);
      toast.success("Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      toast.error("Error al eliminar mensaje");
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
          title="Eliminar mensaje"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs truncate">Borrar</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar mensaje
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar este mensaje?
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
              "Eliminar mensaje"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function MessagesTable({ messages }: MessagesTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [filterType, setFilterType] = useState<"all" | "read" | "unread" | "individual" | "group">("all");
  const [_isDeleting, setIsDeleting] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);

  // Actualizar localMessages cuando cambian los mensajes (al montar el componente)
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, filterType, rowsPerPage]);

  // Filtra los mensajes por contenido, remitente, destinatario o tipo
  const filteredMessages = useMemo(() => {
    if (!filterValue && filterType === "all") return localMessages;
    
    let filtered = [...localMessages];
    
    // Filtrar por estado o tipo
    switch (filterType) {
      case "read":
        filtered = filtered.filter(message => message.read);
        break;
      case "unread":
        filtered = filtered.filter(message => !message.read);
        break;
      case "group":
        filtered = filtered.filter(message => message.conversation.isGroup);
        break;
      case "individual":
        filtered = filtered.filter(message => !message.conversation.isGroup);
        break;
    }
    
    // Filtrar por texto si hay un valor
    if (filterValue) {
      const lowercasedFilter = filterValue.toLowerCase();
      
      filtered = filtered.filter(message => {
        const contentMatch = message.content?.toLowerCase().includes(lowercasedFilter) || false;
        const senderNameMatch = message.sender?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const senderEmailMatch = message.sender?.email?.toLowerCase().includes(lowercasedFilter) || false;
        const receiverNameMatch = message.receiver?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const receiverEmailMatch = message.receiver?.email?.toLowerCase().includes(lowercasedFilter) || false;
        const groupNameMatch = message.conversation.isGroup && 
          message.conversation.name?.toLowerCase().includes(lowercasedFilter) || false;
        
        return contentMatch || senderNameMatch || senderEmailMatch || 
               receiverNameMatch || receiverEmailMatch || groupNameMatch;
      });
    }
    
    return filtered;
  }, [filterValue, filterType, localMessages]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredMessages.length / rowsPerPage);

  // Obtiene los mensajes para la página actual
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredMessages.slice(startIndex, endIndex);
  }, [filteredMessages, currentPage, rowsPerPage]);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/messages/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }
      
      // Actualizar la lista de mensajes localmente
      setLocalMessages(prev => prev.filter(message => message.id !== id));
      
      // Si estamos en la última página y ya no hay elementos, retrocedemos una página
      if (paginatedMessages.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
      
      // Mostrar notificación de éxito
      toast.success("Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      toast.error("No se pudo eliminar el mensaje");
    } finally {
      setIsDeleting(false);
    }
  }, [paginatedMessages, currentPage]);

  const handleMarkAsRead = async (id: string) => {
    try {
      setIsMarkingAsRead(id);
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
      setLocalMessages(prev => 
        prev.map(message => 
          message.id === id ? { ...message, read: true } : message
        )
      );
      
      toast.success("Mensaje marcado como leído");
    } catch (error) {
      console.error("Error al marcar mensaje como leído:", error);
      toast.error("No se pudo marcar el mensaje como leído");
    } finally {
      setIsMarkingAsRead(null);
    }
  };

  // Función para renderizar la imagen del usuario
  const renderUserImage = (user: Message['sender'] | Message['receiver'], size: number = 32) => {
    if (!user) return null;
    
    const defaultImage = "/images/AvatarPredeterminado.webp";
    
    return (
      <div className="h-8 w-8 overflow-hidden rounded-full flex items-center justify-center bg-gray-100">
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

  // Función para renderizar la imagen de grupo
  const renderGroupImage = (conversation: Message['conversation'], size: number = 32) => {
    if (!conversation.isGroup) return null;
    
    const defaultGroupImage = "/images/GroupPredeterminado.webp";
    
    return (
      <div className="h-8 w-8 overflow-hidden rounded-full flex items-center justify-center bg-gray-100">
        {conversation.imageUrl ? (
          <Image
            src={conversation.imageUrl}
            alt={conversation.name || "Grupo"}
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.src = defaultGroupImage;
            }}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center bg-primary text-white">
            <Users className="h-5 w-5" />
          </div>
        )}
      </div>
    );
  };

  // Función para renderizar el mensaje según su tipo
  const renderMessageContent = (message: Message) => {
    if (!message.content && !message.mediaUrl) {
      return <span className="text-muted-foreground text-sm italic">Sin contenido</span>;
    }

    const contentPreview = message.content || "";
    
    if (message.mediaUrl) {
      switch (message.messageType) {
        case "image":
          return (
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 bg-blue-50 text-blue-700 border-blue-200">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11a2 2 0 100-4 2 2 0 000 4z" />
                </svg>
                Imagen
              </Badge>
              {contentPreview && <span className="text-sm truncate">{contentPreview}</span>}
            </div>
          );
        case "voice":
          return (
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 bg-purple-50 text-purple-700 border-purple-200">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                Audio
              </Badge>
              {contentPreview && <span className="text-sm truncate">{contentPreview}</span>}
            </div>
          );
        case "video":
          return (
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 bg-red-50 text-red-700 border-red-200">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Video
              </Badge>
              {contentPreview && <span className="text-sm truncate">{contentPreview}</span>}
            </div>
          );
        case "file":
          return (
            <div className="flex items-center">
              <Badge variant="outline" className="mr-2 bg-green-50 text-green-700 border-green-200">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Archivo
              </Badge>
              {contentPreview && <span className="text-sm truncate">{contentPreview}</span>}
            </div>
          );
        default:
          return <span className="text-sm truncate">{contentPreview}</span>;
      }
    }
    
    return <span className="text-sm truncate">{contentPreview}</span>;
  };

  // Filtros para tipo de conversación y estado
  const filterElement = useMemo(() => (
    <div className="flex flex-wrap gap-2">
      <button 
        onClick={() => setFilterType("all")}
        className={`px-3 py-1 text-sm rounded-md ${
          filterType === "all" 
            ? "bg-primary text-white" 
            : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
        }`}
      >
        Todos
      </button>
      <button 
        onClick={() => setFilterType("read")}
        className={`px-3 py-1 text-sm rounded-md ${
          filterType === "read" 
            ? "bg-primary text-white" 
            : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
        }`}
      >
        Leídos
      </button>
      <button 
        onClick={() => setFilterType("unread")}
        className={`px-3 py-1 text-sm rounded-md ${
          filterType === "unread" 
            ? "bg-primary text-white" 
            : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
        }`}
      >
        No leídos
      </button>
      <button 
        onClick={() => setFilterType("individual")}
        className={`px-3 py-1 text-sm rounded-md ${
          filterType === "individual" 
            ? "bg-primary text-white" 
            : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
        }`}
      >
        <MessageSquare className="h-3.5 w-3.5 mr-1 inline" />
        Individuales
      </button>
      <button 
        onClick={() => setFilterType("group")}
        className={`px-3 py-1 text-sm rounded-md ${
          filterType === "group" 
            ? "bg-primary text-white" 
            : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
        }`}
      >
        <Users className="h-3.5 w-3.5 mr-1 inline" />
        Grupos
      </button>
    </div>
  ), [filterType]);

  const columns: Column<Message>[] = useMemo(() => [
    {
      header: "Tipo",
      accessorKey: "conversation.isGroup",
      cell: (message: Message) => {
        return (
          <span 
            className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
              message.conversation.isGroup 
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" 
                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
            }`}
          >
            {message.conversation.isGroup ? (
              <>
                <Users className="h-3.5 w-3.5 mr-1" />
                Grupo
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                Individual
              </>
            )}
          </span>
        );
      },
      filterElement: filterElement,
    },
    {
      header: "Estado",
      accessorKey: "read",
      cell: (message: Message) => {
        return (
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
              message.read 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            }`}
          >
            {message.read ? "Leído" : "No leído"}
          </span>
        );
      },
    },
    {
      header: "Remitente",
      accessorKey: "sender",
      cell: (message: Message) => {
        if (!message.sender) {
          return <span className="text-sm text-muted-foreground">Usuario eliminado</span>;
        }
        
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 flex-shrink-0 mr-3">
              {renderUserImage(message.sender)}
            </div>
            <div>
              <Link
                href={`/admin/users/view/${message.sender.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
              >
                {message.sender.name || "Usuario sin nombre"}
              </Link>
              <div className="text-xs text-muted-foreground">{message.sender.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Destinatario",
      accessorKey: "recipient",
      cell: (message: Message) => {
        if (message.conversation.isGroup) {
          return (
            <div className="flex items-center">
              <div className="h-8 w-8 flex-shrink-0 mr-3">
                {renderGroupImage(message.conversation)}
              </div>
              <div>
                <Link
                  href={`/admin/messages/group/${message.conversation.id}`}
                  className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
                >
                  {message.conversation.name || "Grupo sin nombre"}
                </Link>
                <div className="text-xs text-muted-foreground">
                  {message.conversation.participants ? 
                    `${message.conversation.participants.length} participantes` : 
                    "Grupo"}
                </div>
              </div>
            </div>
          );
        }
        
        if (!message.receiver) {
          return <span className="text-sm text-muted-foreground">Usuario eliminado</span>;
        }
        
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 flex-shrink-0 mr-3">
              {renderUserImage(message.receiver)}
            </div>
            <div>
              <Link
                href={`/admin/users/view/${message.receiver.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
              >
                {message.receiver.name || "Usuario sin nombre"}
              </Link>
              <div className="text-xs text-muted-foreground">{message.receiver.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Mensaje",
      accessorKey: "content",
      cell: (message: Message) => {
        return (
          <div className="text-sm text-foreground max-w-xs truncate">
            {renderMessageContent(message)}
          </div>
        );
      },
    },
    {
      header: "Fecha",
      accessorKey: "createdAt",
      cell: (message: Message) => {
        const date = new Date(message.createdAt);
        return (
          <div className="text-sm text-muted-foreground">
            {formatDistanceToNow(date, { locale: es, addSuffix: true })}
          </div>
        );
      },
    },
    {
      header: "Acciones",
      id: "actions",
      cell: (message: Message) => {
        return (
          <div className="flex justify-end items-center space-x-2">
            <Link
              href={`/admin/messages/view/${message.id}`}
              className="inline-flex items-center justify-center h-8 py-0.5 px-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              title="Ver mensaje"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs font-medium">Ver</span>
            </Link>
            {!message.read && (
              <button
                onClick={() => handleMarkAsRead(message.id)}
                disabled={isMarkingAsRead === message.id}
                className="inline-flex items-center justify-center h-8 py-0.5 px-2 rounded bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/40 transition-colors"
                title="Marcar como leído"
              >
                {isMarkingAsRead === message.id ? (
                  <div className="h-3.5 w-3.5 mr-1 animate-spin rounded-full border-b-2 border-green-800"></div>
                ) : (
                  <CheckCircle className="h-3.5 w-3.5" />
                )}
                <span className="ml-1 text-xs font-medium">Marcar leído</span>
              </button>
            )}
            <DeleteMessageDialog 
              messageId={message.id} 
              onDelete={handleDelete}
            />
          </div>
        );
      },
    },
  ], [isMarkingAsRead, filterElement, handleDelete]);

  return (
    <div className="space-y-4">
      <DataTable<Message>
        data={paginatedMessages}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar por usuario, grupo o contenido..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No hay mensajes que mostrar"
      />
    </div>
  );
}
