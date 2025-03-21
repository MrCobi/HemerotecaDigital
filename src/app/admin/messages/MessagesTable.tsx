"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { useState, useEffect, useMemo } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button } from "@/src/app/components/ui/button";
import { Trash2, Eye, CheckCircle, Mail } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";

type Message = {
  id: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
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

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, filterType, rowsPerPage]);

  // Filtra los mensajes por contenido, remitente o destinatario
  const filteredMessages = useMemo(() => {
    if (!filterValue && filterType === "all") return messages;
    
    let filtered = [...messages];
    
    // Filtrar por estado (leído/no leído)
    if (filterType === "read") {
      filtered = filtered.filter(message => message.isRead);
    } else if (filterType === "unread") {
      filtered = filtered.filter(message => !message.isRead);
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
  }, [messages, filterValue, filterType]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredMessages.length / rowsPerPage);

  // Obtiene los mensajes para la página actual
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredMessages.slice(startIndex, endIndex);
  }, [filteredMessages, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar mensaje ${id}`);
    setIsDeleteDialogOpen(false);
    setMessageToDelete(null);
  };

  const handleMarkAsRead = (id: string) => {
    // Implementar lógica para marcar como leído
    console.log(`Marcar mensaje ${id} como leído`);
  };

  // Función para renderizar la imagen del usuario
  const renderUserImage = (user: Message['sender'] | Message['receiver'], size: number = 32) => {
    if (!user) return null;
    
    if (user?.image && user?.image.includes('cloudinary')) {
      return (
        <CldImage
          src={user.image}
          alt={user?.name || "Avatar"}
          width={size}
          height={size}
          crop="fill"
          gravity="face"
          className={`h-${size/4} w-${size/4} rounded-full object-cover`}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.src = "/images/AvatarPredeterminado.webp";
          }}
        />
      );
    } else if (user?.image && !user.image.startsWith('/') && !user.image.startsWith('http')) {
      return (
        <CldImage
          src={user.image}
          alt={user?.name || "Avatar"}
          width={size}
          height={size}
          crop="fill"
          gravity="face"
          className={`h-${size/4} w-${size/4} rounded-full object-cover`}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.src = "/images/AvatarPredeterminado.webp";
          }}
        />
      );
    } else {
      return (
        <Image
          src={user?.image || "/images/AvatarPredeterminado.webp"}
          alt={user?.name || "Avatar"}
          width={size}
          height={size}
          className={`h-${size/4} w-${size/4} rounded-full object-cover`}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.src = "/images/AvatarPredeterminado.webp";
          }}
        />
      );
    }
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
      accessorKey: "isRead",
      cell: (message: Message) => {
        return (
          <span
            className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
              message.isRead 
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            }`}
          >
            {message.isRead ? "Leído" : "No leído"}
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
            {!message.isRead && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleMarkAsRead(message.id)}
                className="inline-flex items-center rounded-md bg-green-100 px-2 py-1 text-xs font-medium text-green-800 ring-offset-background transition-colors hover:bg-green-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
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
                  <AlertDialogAction onClick={() => handleDelete(message.id)}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ], [isDeleteDialogOpen, messageToDelete]);

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
        emptyMessage="No hay mensajes para mostrar"
      />
    </div>
  );
}
