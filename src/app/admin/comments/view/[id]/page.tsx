"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { format } from "date-fns";
import { ChevronLeft, User, Calendar, ExternalLink, MessageSquare, AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/src/app/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Badge } from "@/src/app/components/ui/badge";
import { Separator } from "@/src/app/components/ui/separator";
import { Skeleton } from "@/src/app/components/ui/skeleton";
import { toast } from "sonner";
import DeleteDialog from "@/src/components/ui/DeleteDialog";

// Definición del tipo de comentario adaptada al esquema actual
type Comment = {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
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
  parent?: {
    id: string;
    content: string;
    user: {
      id: string;
      name: string | null;
    } | null;
  };
  replies?: Comment[];
  _count?: {
    replies: number;
  };
};

export default function CommentViewPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  
  const [comment, setComment] = useState<Comment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function fetchComment() {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await fetch(`/api/admin/comments/${id}`);
        
        if (!response.ok) {
          throw new Error(`Error al cargar el comentario: ${response.status}`);
        }
        
        const data = await response.json();
        setComment(data);
      } catch (err) {
        console.error("Error al cargar el comentario:", err);
        setError("No se pudo cargar la información del comentario. Verifica que el ID sea correcto.");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (id) {
      fetchComment();
    }
  }, [id]);

  const handleDeleteComment = async (): Promise<void> => {
    if (isDeleting || !comment) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/admin/comments/${comment.id}?deleteReplies=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar el comentario');
      }
      
      const data = await response.json();
      
      // Mostrar mensaje apropiado si se eliminaron respuestas
      if (data.deletedIds && Array.isArray(data.deletedIds) && data.deletedIds.length > 1) {
        toast.success(`Comentario eliminado junto con ${data.deletedIds.length - 1} respuestas`);
      } else {
        toast.success('Comentario eliminado correctamente');
      }
      
      // Actualizar estado local para reflejar el cambio
      setComment(prev => prev ? { ...prev, isDeleted: true } : null);
      
      // Redireccionar después de un breve retraso
      setTimeout(() => {
        router.push('/admin/comments');
      }, 1500);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Error al eliminar el comentario');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link
            href="/admin/comments"
            className="text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-2xl font-bold">Cargando comentario...</h2>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
            <div className="flex gap-4 mt-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link
            href="/admin/comments"
            className="text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-2xl font-bold">Error</h2>
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">No se pudo cargar el comentario</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error}</p>
          </CardContent>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/admin/comments">Volver a comentarios</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!comment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center">
          <Link
            href="/admin/comments"
            className="text-muted-foreground hover:text-foreground transition-colors mr-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <h2 className="text-2xl font-bold">Comentario no encontrado</h2>
        </div>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">El comentario no existe</CardTitle>
            <CardDescription>
              No se pudo encontrar el comentario con el ID proporcionado.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button asChild variant="outline">
              <Link href="/admin/comments">Volver a comentarios</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <Link
          href="/admin/comments"
          className="text-muted-foreground hover:text-foreground transition-colors mr-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <h2 className="text-2xl font-bold">Detalle del comentario</h2>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Comentario ID: {comment.id}</CardTitle>
              <CardDescription className="mt-1">
                {comment.parentId ? "Respuesta a otro comentario" : "Comentario principal"}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {comment.isDeleted && (
                <Badge variant="destructive" className="flex gap-1 items-center">
                  <AlertTriangle className="h-3 w-3" />
                  Comentario eliminado
                </Badge>
              )}
              {!comment.isDeleted && (
                <DeleteDialog 
                  entityId={comment.id}
                  entityName="este comentario"
                  entityType="el comentario"
                  onDelete={handleDeleteComment}
                  consequenceText="Esta acción no eliminará físicamente el comentario, sino que lo marcará como eliminado."
                >
                  <Button 
                    variant="destructive" 
                    size="sm"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Eliminar
                  </Button>
                </DeleteDialog>
              )}
            </div>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="pt-6">
          <div className="space-y-6">
            {/* Si es una respuesta, mostrar el comentario padre */}
            {comment.parentId && comment.parent && (
              <div className="bg-muted/50 p-4 rounded-md mb-6 border border-muted">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">En respuesta a:</span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">{comment.parent.content}</p>
                <div className="mt-2">
                  <Link 
                    href={`/admin/comments/view/${comment.parentId}`}
                    className="text-xs text-primary hover:underline"
                  >
                    Ver comentario original
                  </Link>
                </div>
              </div>
            )}

            {/* Contenido del comentario */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Contenido</h3>
              <div className="bg-background p-4 rounded-md border text-foreground whitespace-pre-wrap">
                {comment.content}
              </div>
            </div>

            {/* Información de usuario */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <User className="h-4 w-4" /> Usuario
              </h3>
              <div className="flex items-center gap-3 p-3 bg-background rounded-md border">
                <div className="relative h-12 w-12 rounded-full overflow-hidden">
                  <Image
                    src={comment.user?.image || "/images/AvatarPredeterminado.webp"}
                    alt={comment.user?.name || "Usuario"}
                    fill
                    className="object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/AvatarPredeterminado.webp";
                    }}
                  />
                </div>
                <div>
                  <p className="font-medium">{comment.user?.name || "Usuario eliminado"}</p>
                  {comment.user?.email && (
                    <p className="text-sm text-muted-foreground">{comment.user.email}</p>
                  )}
                  {comment.user?.id && (
                    <Link 
                      href={`/admin/users/edit/${comment.user.id}`}
                      className="text-xs text-primary hover:underline mt-1 inline-block"
                    >
                      Ver perfil
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Información de fuente */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <ExternalLink className="h-4 w-4" /> Fuente
              </h3>
              <div className="p-3 bg-background rounded-md border">
                <p className="font-medium">{comment.source.name}</p>
                <a 
                  href={comment.source.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-sm text-primary hover:underline flex items-center gap-1 mt-1"
                >
                  {comment.source.url}
                  <ExternalLink className="h-3 w-3" />
                </a>
                <Link 
                  href={`/admin/sources/edit/${comment.source.id}`}
                  className="text-xs text-primary hover:underline mt-2 inline-block"
                >
                  Editar fuente
                </Link>
              </div>
            </div>

            {/* Fechas */}
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Fechas
              </h3>
              <div className="p-3 bg-background rounded-md border grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <p className="text-sm text-muted-foreground">Creado:</p>
                  <p>{format(new Date(comment.createdAt), "PPP 'a las' HH:mm:ss")}</p>
                  <p className="text-xs text-muted-foreground">
                    ({formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })})
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Actualizado:</p>
                  <p>{format(new Date(comment.updatedAt), "PPP 'a las' HH:mm:ss")}</p>
                  <p className="text-xs text-muted-foreground">
                    ({formatDistanceToNow(new Date(comment.updatedAt), { addSuffix: true })})
                  </p>
                </div>
              </div>
            </div>

            {/* Respuestas */}
            {comment._count && comment._count.replies > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1">
                  <MessageSquare className="h-4 w-4" /> Respuestas
                </h3>
                <div className="p-3 bg-background rounded-md border">
                  <p className="text-sm">Este comentario tiene {comment._count?.replies} respuestas.</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2"
                    asChild
                  >
                    <Link href={`/sources/${comment.source.id}?commentId=${comment.id}`}>
                      Ver en contexto
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="border-t pt-6 flex justify-between">
          <Button 
            variant="outline" 
            asChild
          >
            <Link href="/admin/comments">
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver
            </Link>
          </Button>
          {!comment.isDeleted && (
            <DeleteDialog 
              entityId={comment.id}
              entityName="este comentario"
              entityType="el comentario"
              onDelete={handleDeleteComment}
              consequenceText="Esta acción no eliminará físicamente el comentario, sino que lo marcará como eliminado."
            >
              <Button 
                variant="destructive"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar comentario
              </Button>
            </DeleteDialog>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
