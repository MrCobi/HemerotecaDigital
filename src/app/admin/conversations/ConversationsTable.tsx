"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useMemo, useCallback } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Trash2, Eye, Users, MessageSquare, UserPlus } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";
import { Badge } from "@/src/app/components/ui/badge";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type ParticipantRole = "member" | "admin" | "moderator" | "owner";

type ConversationParticipant = {
  userId: string;
  isAdmin: boolean;
  role: ParticipantRole;
  nickname: string | null;
  isMuted: boolean;
  user: User;
};

type Conversation = {
  id: string;
  name: string | null;
  isGroup: boolean;
  imageUrl: string | null;
  description: string | null;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  creatorId: string | null;
  creator: User | null;
  participants: ConversationParticipant[];
  _count?: {
    messages: number;
    participants: number;
  };
};

type ConversationsTableProps = {
  conversations: Conversation[];
};

interface DeleteConversationDialogProps {
  conversationId: string;
  onDelete: (id: string) => Promise<void>;
}

function DeleteConversationDialog({ conversationId, onDelete }: DeleteConversationDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  async function handleDelete() {
    try {
      setIsDeleting(true);
      await onDelete(conversationId);
      setIsOpen(false);
      toast.success("Conversación eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
      toast.error("Error al eliminar conversación");
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
          title="Eliminar conversación"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs truncate hidden sm:inline">Borrar</span>
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
            {"\n"}
            Esta acción eliminará todos los mensajes asociados a esta conversación.
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
  );
}

export default function ConversationsTable({ conversations }: ConversationsTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [filterType, setFilterType] = useState<"all" | "group" | "individual">("all");
  const [_isDeleting, setIsDeleting] = useState(false);
  const [localConversations, setLocalConversations] = useState<Conversation[]>(conversations);

  // Actualizar localConversations cuando cambian las conversaciones (al montar el componente)
  useEffect(() => {
    setLocalConversations(conversations);
  }, [conversations]);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, filterType, rowsPerPage]);

  // Filtra las conversaciones por nombre, participantes o tipo
  const filteredConversations = useMemo(() => {
    if (!filterValue && filterType === "all") return localConversations;
    
    let filtered = [...localConversations];
    
    // Filtrar por tipo
    switch (filterType) {
      case "group":
        filtered = filtered.filter(conversation => conversation.isGroup);
        break;
      case "individual":
        filtered = filtered.filter(conversation => !conversation.isGroup);
        break;
    }
    
    // Filtrar por texto si hay un valor
    if (filterValue) {
      const lowercasedFilter = filterValue.toLowerCase();
      
      filtered = filtered.filter(conversation => {
        const nameMatch = conversation.name?.toLowerCase().includes(lowercasedFilter) || false;
        const descriptionMatch = conversation.description?.toLowerCase().includes(lowercasedFilter) || false;
        
        // Buscar en participantes (incluyendo nickname)
        const participantsMatch = conversation.participants.some(participant => {
          const nicknameMatch = participant.nickname?.toLowerCase().includes(lowercasedFilter) || false;
          return (
            participant.user.name?.toLowerCase().includes(lowercasedFilter) || 
            participant.user.email?.toLowerCase().includes(lowercasedFilter) ||
            nicknameMatch
          );
        });
        
        return nameMatch || descriptionMatch || participantsMatch;
      });
    }
    
    return filtered;
  }, [filterValue, filterType, localConversations]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredConversations.length / rowsPerPage);

  // Obtiene las conversaciones para la página actual
  const paginatedConversations = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredConversations.slice(startIndex, endIndex);
  }, [filteredConversations, currentPage, rowsPerPage]);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/conversations/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }
      
      // Actualizar la lista de conversaciones localmente
      setLocalConversations(prev => prev.filter(conversation => conversation.id !== id));
      
      // Si estamos en la última página y ya no hay elementos, retrocedemos una página
      if (paginatedConversations.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
      
      // Mostrar notificación de éxito
      toast.success("Conversación eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
      toast.error("No se pudo eliminar la conversación");
    } finally {
      setIsDeleting(false);
    }
  }, [paginatedConversations, currentPage]);

  // Función para renderizar la imagen de usuario o grupo
  const renderImage = (conversation: Conversation, size: number = 32) => {
    const defaultUserImage = "/images/AvatarPredeterminado.webp";
    const defaultGroupImage = "/images/GroupPredeterminado.webp";
    
    const isGroup = conversation.isGroup;
    const imageUrl = conversation.imageUrl;
    const alt = conversation.name || (isGroup ? "Grupo" : "Conversación");
    
    return (
      <div className="h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-full flex items-center justify-center bg-gray-100">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={alt}
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
            onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
              const target = e.target as HTMLImageElement;
              target.src = isGroup ? defaultGroupImage : defaultUserImage;
            }}
          />
        ) : isGroup ? (
          <div className="h-full w-full flex items-center justify-center bg-primary text-white">
            <Users className="h-4 w-4" />
          </div>
        ) : (
          <Image
            src={defaultUserImage}
            alt="Avatar predeterminado"
            width={size}
            height={size}
            className="h-full w-full object-cover rounded-full"
          />
        )}
      </div>
    );
  };

  // Filtros para tipo de conversación
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

  const columns: Column<Conversation>[] = useMemo(() => [
    {
      header: "Tipo",
      accessorKey: "isGroup",
      cell: (conversation: Conversation) => {
        return (
          <span 
            className={`px-2 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full ${
              conversation.isGroup 
                ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" 
                : "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300"
            }`}
          >
            {conversation.isGroup ? (
              <>
                <Users className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Grupo</span>
                <span className="sm:hidden">G</span>
              </>
            ) : (
              <>
                <MessageSquare className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Individual</span>
                <span className="sm:hidden">I</span>
              </>
            )}
          </span>
        );
      },
      filterElement: filterElement,
      hideOnMobile: false,
      className: "w-[8%]", // Ancho ajustado
    },
    {
      header: "Nombre/Participantes",
      accessorKey: "name",
      cell: (conversation: Conversation) => {
        // Para conversaciones individuales, mostramos los participantes
        if (!conversation.isGroup) {
          const participants = conversation.participants;
          if (participants.length === 0) {
            return <div className="text-xs sm:text-sm text-muted-foreground">Sin participantes</div>;
          }
          
          // Mostrar ambos participantes de la conversación individual
          return (
            <div className="flex flex-col space-y-1">
              {participants.slice(0, 2).map((participant, index) => (
                <div key={index} className="flex items-center">
                  <div className="flex-shrink-0 mr-2">
                    <div className="h-6 w-6 overflow-hidden rounded-full flex items-center justify-center bg-gray-100">
                      {participant.user.image ? (
                        <Image
                          src={participant.user.image}
                          alt={participant.user.name || "Avatar"}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover rounded-full"
                        />
                      ) : (
                        <Image
                          src="/images/AvatarPredeterminado.webp"
                          alt="Avatar predeterminado"
                          width={24}
                          height={24}
                          className="h-full w-full object-cover rounded-full"
                        />
                      )}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <Link
                      href={`/admin/users/view/${participant.user.id}`}
                      className="text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm font-medium truncate block max-w-[120px] sm:max-w-full"
                    >
                      {participant.user.name || participant.user.email || "Usuario sin nombre"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          );
        }
        
        // Para grupos, mostramos el nombre y número de participantes
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-2 sm:mr-3">
              {renderImage(conversation)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/conversations/view/${conversation.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm font-medium truncate block max-w-[120px] sm:max-w-full"
              >
                {conversation.name || "Grupo sin nombre"}
              </Link>
              <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-full">
                {conversation._count?.participants || conversation.participants.length} participantes
              </div>
            </div>
          </div>
        );
      },
      hideOnMobile: false,
      className: "w-[30%]", // Ancho ajustado
    },
    {
      header: "Creador",
      accessorKey: "creator",
      cell: (conversation: Conversation) => {
        // Si tenemos el creador directamente (objeto completo)
        if (conversation.creator) {
          return (
            <div className="flex items-center">
              <div className="flex-shrink-0 mr-2">
                <div className="h-6 w-6 overflow-hidden rounded-full flex items-center justify-center bg-gray-100">
                  {conversation.creator.image ? (
                    <Image
                      src={conversation.creator.image}
                      alt={conversation.creator.name || "Avatar"}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover rounded-full"
                    />
                  ) : (
                    <Image
                      src="/images/AvatarPredeterminado.webp"
                      alt="Avatar predeterminado"
                      width={24}
                      height={24}
                      className="h-full w-full object-cover rounded-full"
                    />
                  )}
                </div>
              </div>
              <div className="min-w-0">
                <Link
                  href={`/admin/users/view/${conversation.creator.id}`}
                  className="text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm font-medium truncate block max-w-[120px] sm:max-w-full"
                >
                  {conversation.creator.name || conversation.creator.email || "Usuario sin nombre"}
                </Link>
              </div>
            </div>
          );
        }
        
        // Si el creador está disponible en los participantes
        if (conversation.participants && conversation.participants.length > 0) {
          // Buscar el creador entre los participantes (por lo general será un administrador o el dueño)
          const creatorParticipant = conversation.participants.find(
            p => p.isAdmin || p.role === "owner" || (conversation.creatorId && p.userId === conversation.creatorId)
          );
          
          if (creatorParticipant) {
            return (
              <div className="flex items-center">
                <div className="flex-shrink-0 mr-2">
                  <div className="h-6 w-6 overflow-hidden rounded-full flex items-center justify-center bg-gray-100">
                    {creatorParticipant.user.image ? (
                      <Image
                        src={creatorParticipant.user.image}
                        alt={creatorParticipant.user.name || "Avatar"}
                        width={24}
                        height={24}
                        className="h-full w-full object-cover rounded-full"
                      />
                    ) : (
                      <Image
                        src="/images/AvatarPredeterminado.webp"
                        alt="Avatar predeterminado"
                        width={24}
                        height={24}
                        className="h-full w-full object-cover rounded-full"
                      />
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <Link
                    href={`/admin/users/view/${creatorParticipant.user.id}`}
                    className="text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm font-medium truncate block max-w-[120px] sm:max-w-full"
                  >
                    {creatorParticipant.user.name || creatorParticipant.user.email || "Usuario sin nombre"}
                  </Link>
                </div>
              </div>
            );
          }
        }
        
        // Si no encontramos información del creador
        return <span className="text-xs sm:text-sm text-muted-foreground">No disponible</span>;
      },
      hideOnMobile: true,
      className: "w-[20%]", // Ancho ajustado
    },
    {
      header: "Mensajes",
      accessorKey: "messageCount",
      cell: (conversation: Conversation) => {
        const messageCount = conversation._count?.messages || 0;
        return (
          <div className="text-xs sm:text-sm text-foreground">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
              <MessageSquare className="h-3 w-3 mr-1" />
              {messageCount}
            </Badge>
          </div>
        );
      },
      hideOnMobile: true,
      className: "w-[10%]", // Ancho ajustado
    },
    {
      header: "Creado",
      accessorKey: "createdAt",
      cell: (conversation: Conversation) => {
        const date = new Date(conversation.createdAt);
        return (
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(date, { locale: es, addSuffix: true })}
          </div>
        );
      },
      hideOnMobile: true,
      className: "w-[12%]", // Ancho ajustado
    },
    {
      header: "Acciones",
      id: "actions",
      cell: (conversation: Conversation) => {
        return (
          <div className="flex flex-wrap justify-end items-center gap-1.5">
            <Link
              href={`/admin/conversations/view/${conversation.id}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              title="Ver conversación"
            >
              <Eye className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs font-medium hidden sm:inline">Ver</span>
            </Link>
            {conversation.isGroup && (
              <Link
                href={`/admin/conversations/participants/${conversation.id}`}
                className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
                title="Gestionar participantes"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span className="ml-1 text-xs font-medium hidden sm:inline">Participantes</span>
              </Link>
            )}
            <DeleteConversationDialog 
              conversationId={conversation.id} 
              onDelete={handleDelete}
            />
          </div>
        );
      },
      hideOnMobile: false,
      className: "w-[20%]", // Ancho ajustado
    },
  ], [filterElement, handleDelete]);

  return (
    <div className="space-y-4 overflow-hidden">
      <DataTable<Conversation>
        data={paginatedConversations}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar por nombre, descripción o participantes..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No hay conversaciones que mostrar"
      />
    </div>
  );
}
