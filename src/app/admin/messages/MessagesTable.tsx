"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button } from "@/src/app/components/ui/button";
import { Trash2, Eye, CheckCircle } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";

type Message = {
  id: string;
  content: string;
  createdAt: string; // ISO date string
  read: boolean;
  senderId: string;
  receiverId: string;
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
};

type MessagesTableProps = {
  messages: Message[];
};

export default function MessagesTable({ messages }: MessagesTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [filterType, setFilterType] = useState<"all" | "read" | "unread">("all");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [localMessages, setLocalMessages] = useState<Message[]>(messages);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState<string | null>(null);

  // Actualizar localMessages cuando cambian los mensajes (al montar el componente)
  useEffect(() => {
    setLocalMessages(messages);
  }, [messages]);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, filterType, rowsPerPage]);

  // Filtra los mensajes por contenido, remitente o destinatario
  const filteredMessages = useMemo(() => {
    if (!filterValue && filterType === "all") return localMessages;
    
    let filtered = [...localMessages];
    
    // Filtrar por estado (leído/no leído)
    if (filterType === "read") {
      filtered = filtered.filter(message => message.read);
    } else if (filterType === "unread") {
      filtered = filtered.filter(message => !message.read);
    }
    
    // Filtrar por texto si hay un valor
    if (filterValue) {
      const lowercasedFilter = filterValue.toLowerCase();
      
      filtered = filtered.filter(message => {
        const contentMatch = message.content.toLowerCase().includes(lowercasedFilter);
        const senderNameMatch = message.sender?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const senderEmailMatch = message.sender?.email?.toLowerCase().includes(lowercasedFilter) || false;
        const receiverNameMatch = message.receiver?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const receiverEmailMatch = message.receiver?.email?.toLowerCase().includes(lowercasedFilter) || false;
        
        return contentMatch || senderNameMatch || senderEmailMatch || receiverNameMatch || receiverEmailMatch;
      });
    }
    
    return filtered;
  }, [localMessages, filterValue, filterType]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredMessages.length / rowsPerPage);

  // Obtiene los mensajes para la página actual
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredMessages.slice(startIndex, endIndex);
  }, [filteredMessages, currentPage, rowsPerPage]);

  const handleDelete = async (id: string) => {
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
      
      // Cerrar el diálogo
      setIsDeleteDialogOpen(false);
      setMessageToDelete(null);
      
      // Mostrar notificación de éxito
      toast.success("Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      toast.error("No se pudo eliminar el mensaje");
    } finally {
      setIsDeleting(false);
    }
  };

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

  // Filtro de estado del mensaje
  const statusFilterElement = (
    <div className="flex space-x-2">
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
    </div>
  );

  const columns: Column<Message>[] = useMemo(() => [
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
      filterElement: statusFilterElement,
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
      accessorKey: "receiver",
      cell: (message: Message) => {
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
            {message.content}
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
          <div className="flex justify-end space-x-2">
            <Link
              href={`/admin/messages/view/${message.id}`}
              className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-offset-background transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <Eye className="h-3.5 w-3.5 mr-1" />
              Ver
            </Link>
            {!message.read && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAsRead(message.id)}
                disabled={isMarkingAsRead === message.id}
                className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800 ring-offset-background transition-colors hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {isMarkingAsRead === message.id ? (
                  <div className="h-3.5 w-3.5 mr-1 animate-spin rounded-full border-b-2 border-green-800"></div>
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                )}
                Marcar leído
              </Button>
            )}
            <AlertDialog open={isDeleteDialogOpen && messageToDelete === message.id} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setMessageToDelete(message.id)}
                >
                  <Trash2 className="h-4 w-4" />
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
                  <AlertDialogCancel onClick={() => setMessageToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDelete(message.id)}
                    disabled={isDeleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {isDeleting ? (
                      <>
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-b-2 border-white"></div>
                        Eliminando...
                      </>
                    ) : (
                      'Eliminar'
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ], [isDeleteDialogOpen, messageToDelete, isDeleting, isMarkingAsRead, filterType]);

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
        filterPlaceholder="Buscar por usuario o contenido..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No hay mensajes que mostrar"
      />
    </div>
  );
}
