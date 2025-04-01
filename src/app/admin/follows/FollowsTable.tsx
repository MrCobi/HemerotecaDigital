"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { useState, useMemo, useCallback } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button } from "@/src/app/components/ui/button";
import { Trash2, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type Follow = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower: User;
  following: User;
};

type FollowsTableProps = {
  follows: Follow[];
  onDeleteFollow?: (id: string) => Promise<void>;
};

interface DeleteFollowDialogProps {
  followId: string;
  onDelete: (id: string) => Promise<void>;
}

function DeleteFollowDialog({ followId, onDelete }: DeleteFollowDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  async function handleDelete() {
    try {
      setIsDeleting(true);
      await onDelete(followId);
      setIsOpen(false);
      toast.success("Relación de seguimiento eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar relación de seguimiento:", error);
      toast.error("Error al eliminar relación de seguimiento");
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
          title="Eliminar relación"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs truncate">Eliminar</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar relación de seguimiento
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar esta relación de seguimiento?
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
              "Eliminar relación"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function FollowsTable({ follows, onDeleteFollow }: FollowsTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [_isDeleting, setIsDeleting] = useState(false);

  // Filtra las relaciones de seguimiento según los criterios seleccionados
  const filteredFollows = useMemo(() => {
    if (!filterValue || !follows || follows.length === 0) return follows || [];
    
    return follows.filter((follow) => {
      const lowercasedFilter = filterValue.toLowerCase();
      
      const followerNameMatch = follow.follower?.name?.toLowerCase().includes(lowercasedFilter) || false;
      const followerEmailMatch = follow.follower?.email?.toLowerCase().includes(lowercasedFilter) || false;
      
      const followingNameMatch = follow.following?.name?.toLowerCase().includes(lowercasedFilter) || false;
      const followingEmailMatch = follow.following?.email?.toLowerCase().includes(lowercasedFilter) || false;
      
      return followerNameMatch || followerEmailMatch || followingNameMatch || followingEmailMatch;
    });
  }, [follows, filterValue]);

  // Paginación
  const totalPages = Math.ceil((filteredFollows?.length || 0) / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentFollows = filteredFollows?.slice(startIndex, endIndex) || [];

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      setIsDeleting(true);
      
      if (onDeleteFollow) {
        await onDeleteFollow(id);
      } else {
        // Implementación por defecto si no se proporciona función de eliminación
        const response = await fetch(`/api/admin/follows/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error desconocido');
        }
      }
      
      toast.success("Relación de seguimiento eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar relación de seguimiento:", error);
      toast.error("No se pudo eliminar la relación de seguimiento");
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteFollow]);

  // Función para renderizar la imagen del usuario
  const renderUserImage = (user: User | undefined | null, size: number = 32) => {
    if (!user) return null;
    
    const defaultImage = "/images/AvatarPredeterminado.webp";
    
    return (
      <div className="h-7 w-7 sm:h-8 sm:w-8 overflow-hidden rounded-full flex items-center justify-center bg-gray-100">
        {user.image ? (
          <Image
            src={user.image}
            alt={user.name || "Avatar"}
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

  const columns: Column<Follow>[] = useMemo(() => [
    {
      header: "Seguidor",
      accessorKey: "follower",
      cell: (follow: Follow) => {
        const { follower } = follow;
        if (!follower) return <div className="text-muted-foreground text-xs">Usuario no disponible</div>;
        
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-2 sm:mr-3">
              {renderUserImage(follower)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/users/view/${follower.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm font-medium truncate block max-w-[120px] sm:max-w-full"
              >
                {follower.name || follower.email || "Usuario sin nombre"}
              </Link>
              {follower.email && (
                <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-full">{follower.email}</div>
              )}
            </div>
          </div>
        );
      },
      hideOnMobile: false,
    },
    {
      header: "Sigue a",
      accessorKey: "following",
      cell: (follow: Follow) => {
        const { following } = follow;
        if (!following) return <div className="text-muted-foreground text-xs">Usuario no disponible</div>;
        
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 mr-2 sm:mr-3">
              {renderUserImage(following)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/users/view/${following.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-xs sm:text-sm font-medium truncate block max-w-[120px] sm:max-w-full"
              >
                {following.name || following.email || "Usuario sin nombre"}
              </Link>
              {following.email && (
                <div className="text-xs text-muted-foreground truncate max-w-[120px] sm:max-w-full">{following.email}</div>
              )}
            </div>
          </div>
        );
      },
      hideOnMobile: false,
    },
    {
      header: "Fecha",
      accessorKey: "createdAt",
      cell: (follow: Follow) => {
        const date = new Date(follow.createdAt);
        return (
          <div className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
            {format(date, "dd/MM/yyyy")}
          </div>
        );
      },
      hideOnMobile: true,
    },
    {
      header: "Acciones",
      id: "actions",
      cell: (follow: Follow) => {
        return (
          <div className="flex flex-wrap items-center justify-start gap-1.5">
            <Link
              href={`/admin/users/view/${follow.followerId}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              title="Ver perfil del seguidor"
            >
              <User className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate hidden sm:inline">Seguidor</span>
            </Link>
            <Link
              href={`/admin/users/view/${follow.followingId}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors"
              title="Ver perfil del seguido"
            >
              <User className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate hidden sm:inline">Seguido</span>
            </Link>
            <DeleteFollowDialog 
              followId={follow.id} 
              onDelete={handleDelete}
            />
          </div>
        );
      },
      hideOnMobile: false,
    },
  ], [handleDelete]);

  return (
    <div className="space-y-4">
      {filteredFollows && filteredFollows.length > 0 ? (
        <DataTable<Follow>
          data={currentFollows}
          columns={columns}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onFilterChange={setFilterValue}
          filterValue={filterValue}
          filterPlaceholder="Buscar por nombre o email..."
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={setRowsPerPage}
          emptyMessage="No hay relaciones de seguimiento para mostrar"
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="text-muted-foreground mb-2">No hay relaciones de seguimiento para mostrar</p>
          {filterValue && (
            <Button variant="outline" onClick={() => setFilterValue("")}>
              Limpiar filtro
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
