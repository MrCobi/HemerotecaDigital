"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button, buttonVariants } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";
import { Trash2, ExternalLink, AlertTriangle, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import SafeImage from "@/src/components/ui/SafeImage";
import DeleteDialog from "@/src/components/ui/DeleteDialog";

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  sourceId: string;
  userId: string;
  parentId: string | null;
  isDeleted: boolean;
  source: {
    id: string;
    name: string;
    url: string;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  _count?: {
    replies: number;
  };
};

type CommentsTableProps = {
  comments: Comment[];
};

export default function CommentsTable({ comments: initialComments }: CommentsTableProps) {
  const [comments, setComments] = useState(initialComments);
  const [filterValue, setFilterValue] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const router = useRouter();

  // Filtro para comentarios
  const filteredComments = useMemo(() => {
    let filtered = comments;

    // Filtro por texto
    if (filterValue) {
      filtered = filtered.filter((comment) =>
        comment.content.toLowerCase().includes(filterValue.toLowerCase()) ||
        comment.user?.name?.toLowerCase().includes(filterValue.toLowerCase()) ||
        comment.user?.email?.toLowerCase().includes(filterValue.toLowerCase()) ||
        comment.source?.name.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    // Filtro por tipo (todos, respuestas, eliminados)
    if (activeFilter === "replies") {
      filtered = filtered.filter((comment) => comment.parentId !== null);
    } else if (activeFilter === "deleted") {
      filtered = filtered.filter((comment) => comment.isDeleted);
    }

    return filtered;
  }, [comments, filterValue, activeFilter]);

  // Paginación
  const totalComments = filteredComments.length;
  const totalPages = Math.ceil(totalComments / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentComments = filteredComments.slice(
    startIndex,
    startIndex + rowsPerPage
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Función para manejar la eliminación de un comentario
  const handleDeleteComment = async (commentId: string): Promise<void> => {
    if (isDeleting) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/admin/comments/${commentId}?deleteReplies=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar el comentario');
      }

      // Si el servidor devuelve los IDs de los comentarios eliminados (incluyendo respuestas),
      // actualizamos todos ellos en el estado local
      if (data.deletedIds && Array.isArray(data.deletedIds)) {
        setComments(prevComments => 
          prevComments.map(comment => 
            data.deletedIds.includes(comment.id)
              ? { ...comment, isDeleted: true } 
              : comment
          )
        );
        
        // Si hay respuestas eliminadas, mostrar mensaje más específico
        if (data.deletedIds.length > 1) {
          toast.success(`Comentario eliminado junto con ${data.deletedIds.length - 1} respuestas`);
        } else {
          toast.success('Comentario eliminado correctamente');
        }
      } else {
        // Comportamiento anterior como fallback
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? { ...comment, isDeleted: true } 
              : comment
          )
        );
        
        toast.success('Comentario eliminado correctamente');
      }
      
      // También hacemos un refresh para actualizar los datos del servidor
      router.refresh();
    } catch (error) {
      console.error('Error al eliminar el comentario:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el comentario');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: Column<Comment>[] = useMemo(
    () => [
      {
        header: "Comentario",
        accessorKey: "content",
        cell: (comment: Comment) => {
          return (
            <div className="max-w-md">
              <div className="text-sm text-foreground truncate">
                {comment.content}
              </div>
              <div className="flex gap-2 mt-1">
                {comment._count && comment._count.replies > 0 && (
                  <Badge variant="outline" className="text-xs text-primary">
                    <MessageSquare className="h-3 w-3 mr-1" />
                    {comment._count.replies} respuestas
                  </Badge>
                )}
                {comment.parentId && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Respuesta
                  </Badge>
                )}
                {comment.isDeleted && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Eliminado
                  </Badge>
                )}
              </div>
            </div>
          );
        },
      },
      {
        header: "Fuente",
        accessorKey: "source",
        cell: (comment: Comment) => {
          const { source } = comment;
          return (
            <div>
              <Link
                href={`/sources/${source.id}`}
                className="text-primary hover:text-primary/80 text-sm font-medium"
              >
                {source.name}
              </Link>
              <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:underline flex items-center"
                >
                  <span className="truncate">{source.url}</span>
                  <ExternalLink className="h-3 w-3 ml-1 inline-flex" />
                </a>
              </div>
            </div>
          );
        },
      },
      {
        header: "Usuario",
        accessorKey: "user",
        cell: (comment: Comment) => {
          const { user } = comment;
          if (!user) return <span className="text-sm text-muted-foreground">Usuario eliminado</span>;
          
          return (
            <div className="flex items-center">
              <div className="flex-shrink-0 h-8 w-8">
                {user?.image ? (
                  <SafeImage
                    src={user.image}
                    alt={user?.name || "Avatar"}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                    fallbackSrc="/images/AvatarPredeterminado.webp"
                  />
                ) : (
                  <SafeImage
                    src="/images/AvatarPredeterminado.webp"
                    alt={user?.name || "Avatar"}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                )}
              </div>
              <div className="ml-3">
                <div className="text-sm font-medium text-foreground">
                  {user.name || "Usuario sin nombre"}
                </div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        header: "Fecha",
        accessorKey: "createdAt",
        cell: (comment: Comment) => {
          const { createdAt, updatedAt } = comment;
          return (
            <div>
              <div className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(createdAt), { locale: es, addSuffix: true })}
              </div>
              {updatedAt > createdAt && (
                <div className="text-xs text-muted-foreground mt-1">
                  Editado {formatDistanceToNow(new Date(updatedAt), { locale: es, addSuffix: true })}
                </div>
              )}
            </div>
          );
        },
      },
      {
        header: "Acciones",
        id: "actions",
        cell: (comment: Comment) => {
          return (
            <div className="flex justify-end space-x-2">
              <Link
                href={`/admin/comments/view/${comment.id}`}
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Ver
              </Link>
              {!comment.isDeleted && (
                <DeleteDialog 
                  entityId={comment.id}
                  entityName={comment.content.substring(0, 30) + (comment.content.length > 30 ? '...' : '')}
                  entityType="el comentario"
                  onDelete={() => handleDeleteComment(comment.id)}
                  consequenceText="Esta acción no eliminará físicamente el comentario, sino que lo marcará como eliminado."
                >
                  <Button 
                    variant="destructive" 
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </DeleteDialog>
              )}
            </div>
          );
        },
      },
    ],
    [isDeleting]
  );

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-wrap gap-2">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
        >
          Todos
        </Button>
        <Button
          variant={activeFilter === "replies" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("replies")}
        >
          Respuestas
        </Button>
        <Button
          variant={activeFilter === "deleted" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("deleted")}
        >
          Eliminados
        </Button>
      </div>
      <DataTable<Comment>
        data={currentComments}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar en comentarios..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No hay comentarios para mostrar"
      />
    </div>
  );
}
