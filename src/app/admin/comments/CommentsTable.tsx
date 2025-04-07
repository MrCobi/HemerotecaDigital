"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";
import { ExternalLink, AlertTriangle, MessageSquare, Eye } from "lucide-react";
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

  const filteredComments = useMemo(() => {
    let filtered = comments;

    if (filterValue) {
      filtered = filtered.filter((comment) =>
        comment.content.toLowerCase().includes(filterValue.toLowerCase()) ||
        comment.user?.name?.toLowerCase().includes(filterValue.toLowerCase()) ||
        comment.user?.email?.toLowerCase().includes(filterValue.toLowerCase()) ||
        comment.source?.name.toLowerCase().includes(filterValue.toLowerCase())
      );
    }

    if (activeFilter === "replies") {
      filtered = filtered.filter((comment) => comment.parentId !== null);
    } else if (activeFilter === "deleted") {
      filtered = filtered.filter((comment) => comment.isDeleted);
    }

    return filtered;
  }, [comments, filterValue, activeFilter]);

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

  const handleDeleteComment = useCallback(async (commentId: string): Promise<void> => {
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

      if (data.deletedIds && Array.isArray(data.deletedIds)) {
        setComments(prevComments => 
          prevComments.map(comment => 
            data.deletedIds.includes(comment.id)
              ? { ...comment, isDeleted: true } 
              : comment
          )
        );
        
        if (data.deletedIds.length > 1) {
          toast.success(`Comentario eliminado junto con ${data.deletedIds.length - 1} respuestas`);
        } else {
          toast.success('Comentario eliminado correctamente');
        }
      } else {
        setComments(prevComments => 
          prevComments.map(comment => 
            comment.id === commentId 
              ? { ...comment, isDeleted: true } 
              : comment
          )
        );
        
        toast.success('Comentario eliminado correctamente');
      }
      
      router.refresh();
    } catch (error) {
      console.error('Error al eliminar el comentario:', error);
      toast.error(error instanceof Error ? error.message : 'Error al eliminar el comentario');
      throw error;
    } finally {
      setIsDeleting(false);
    }
  }, [isDeleting, setComments, router]);

  const columns: Column<Comment>[] = useMemo(
    () => [
      {
        header: "Comentario",
        accessorKey: "content",
        className: "w-[30%]",
        cell: (comment: Comment) => {
          return (
            <div className="max-w-[180px] sm:max-w-md">
              <div className="text-sm text-foreground line-clamp-2 sm:truncate">
                {comment.content}
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
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
        hideOnMobile: true,
        className: "w-[20%]",
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
              <div className="text-xs text-muted-foreground mt-1 truncate max-w-[150px] sm:max-w-xs">
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:underline flex items-center"
                >
                  <span className="truncate">{source.url}</span>
                  <ExternalLink className="h-3 w-3 ml-1 inline-flex flex-shrink-0" />
                </a>
              </div>
            </div>
          );
        },
      },
      {
        header: "Usuario",
        accessorKey: "user",
        hideOnMobile: true,
        className: "w-[20%]",
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
                <div className="text-sm font-medium text-foreground truncate max-w-[100px] sm:max-w-none">
                  {user.name || "Usuario sin nombre"}
                </div>
                <div className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-none">{user.email}</div>
              </div>
            </div>
          );
        },
      },
      {
        header: "Fecha",
        accessorKey: "createdAt",
        hideOnMobile: true,
        className: "w-[15%]",
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
        className: "w-[15%]",
        cell: (comment: Comment) => {
          return (
            <div className="flex items-center justify-start gap-1.5">
              <Link
                href={`/admin/comments/view/${comment.id}`}
                className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
                title="Ver comentario"
                priority={1}
              >
                <Eye className="h-3.5 w-3.5 sm:mr-0 md:mr-1" />
                <span className="hidden md:inline ml-1 text-xs truncate">Ver</span>
              </Link>
              {!comment.isDeleted && (
                <DeleteDialog 
                  entityId={comment.id}
                  entityName={comment.content.substring(0, 30) + (comment.content.length > 30 ? '...' : '')}
                  entityType="el comentario"
                  onDelete={() => handleDeleteComment(comment.id)}
                  consequenceText="Esta acción no eliminará físicamente el comentario, sino que lo marcará como eliminado."
                  priority={2}
                />
              )}
            </div>
          );
        },
      },
    ],
    [handleDeleteComment]
  );

  return (
    <div className="space-y-4">
      <div className="mb-4 flex flex-wrap gap-2 justify-center sm:justify-start">
        <Button
          variant={activeFilter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("all")}
          className="w-full sm:w-auto"
        >
          Todos
        </Button>
        <Button
          variant={activeFilter === "replies" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("replies")}
          className="w-full sm:w-auto"
        >
          Respuestas
        </Button>
        <Button
          variant={activeFilter === "deleted" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveFilter("deleted")}
          className="w-full sm:w-auto"
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
