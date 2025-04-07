"use client";

import Link from "next/link";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo, useCallback } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Trash2, Book } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";

type Rating = {
  id: string;
  value: number;
  comment: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  userId: string;
  sourceId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  source: {
    id: string;
    title?: string;
    name?: string;
  };
};

type RatingsTableProps = {
  ratings: Rating[];
  onRatingDeleted?: (id: string) => void;
};

interface DeleteRatingDialogProps {
  ratingId: string;
  onDelete: (id: string) => Promise<void>;
}

function DeleteRatingDialog({ ratingId, onDelete }: DeleteRatingDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  async function handleDelete() {
    try {
      setIsDeleting(true);
      await onDelete(ratingId);
      setIsOpen(false);
      toast.success("Valoración eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar valoración:", error);
      toast.error("Error al eliminar valoración");
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
          title="Eliminar valoración"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs truncate">Eliminar</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar valoración
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar esta valoración?
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
              "Eliminar valoración"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function RatingsTable({ ratings, onRatingDeleted }: RatingsTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [localRatings, setLocalRatings] = useState<Rating[]>(ratings);
  const [_isDeleting, setIsDeleting] = useState(false);

  // Actualizar localRatings cuando cambian las ratings (al montar el componente)
  useMemo(() => {
    setLocalRatings(ratings);
  }, [ratings]);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, ratingFilter, rowsPerPage]);

  // Filtra las calificaciones según los criterios seleccionados
  const filteredRatings = useMemo(() => {
    if (!filterValue && ratingFilter === null) return localRatings;

    return localRatings.filter((rating) => {
      // Filtrar por valor de calificación
      if (ratingFilter !== null && rating.value !== ratingFilter) {
        return false;
      }

      // Filtrar por texto si hay un valor
      if (filterValue) {
        const lowercasedFilter = filterValue.toLowerCase();

        const userNameMatch = rating.user?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const userEmailMatch = rating.user?.email?.toLowerCase().includes(lowercasedFilter) || false;
        const sourceTitleMatch = rating.source?.title?.toLowerCase().includes(lowercasedFilter) || false;
        const sourceNameMatch = rating.source?.name?.toLowerCase().includes(lowercasedFilter) || false;

        return userNameMatch || userEmailMatch || sourceTitleMatch || sourceNameMatch;
      }

      return true;
    });
  }, [localRatings, filterValue, ratingFilter]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredRatings.length / rowsPerPage);

  // Obtiene las calificaciones para la página actual
  const paginatedRatings = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredRatings.slice(startIndex, endIndex);
  }, [filteredRatings, currentPage, rowsPerPage]);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/ratings/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar la valoración');
      }

      // Actualizar el estado local en lugar de recargar todos los datos
      setLocalRatings(prev => prev.filter(rating => rating.id !== id));

      // Si estamos en la última página y ya no hay elementos, retrocedemos una página
      if (paginatedRatings.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }

      // Notificar al componente padre si es necesario
      if (onRatingDeleted) {
        onRatingDeleted(id);
      }

      // Mostrar notificación de éxito
      toast.success("Valoración eliminada correctamente");
    } catch (error) {
      console.error('Error al eliminar la valoración:', error);
      toast.error('Error al eliminar la valoración');
    } finally {
      setIsDeleting(false);
    }
  }, [currentPage, onRatingDeleted, paginatedRatings.length]);

  // Función para renderizar la imagen del usuario
  const renderUserImage = (user: Rating['user'], size: number = 32) => {
    if (!user) return null;

    // Si el usuario tiene una imagen válida de Cloudinary
    if (user.image && user.image.includes('cloudinary.com')) {
      // Extraer el public_id limpio, manejando diferentes formatos
      let publicId = user.image;

      // Si es una URL completa de Cloudinary
      if (user.image.includes('cloudinary.com')) {
        // Extraer el public_id eliminando la parte de la URL
        // Buscamos 'hemeroteca_digital' como punto de referencia seguro
        const match = user.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
        if (match && match[1]) {
          publicId = `hemeroteca_digital/${match[1]}`;
        } else {
          // Si no encontramos el patrón específico, intentamos una extracción más general
          publicId = user.image.replace(/.*\/v\d+\//, '').split('?')[0];
        }
      }

      // Verificar que el ID no esté duplicado o anidado
      if (publicId.includes('https://')) {
        console.warn('ID público contiene URL completa:', publicId);
        publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
      }

      try {
        return (
          <CldImage
            src={publicId}
            alt={user?.name || "Avatar"}
            width={size}
            height={size}
            crop="fill"
            gravity="face"
            className="h-8 w-8 rounded-full object-cover"
            onError={() => {
              throw new Error('Falló carga de imagen Cloudinary');
            }}
          />
        );
      } catch {
        // Si hay algún error con Cloudinary, usamos la imagen predeterminada
        return (
          <Image
            src="/images/AvatarPredeterminado.webp"
            alt={user?.name || "Avatar"}
            width={size}
            height={size}
            className="h-8 w-8 rounded-full object-cover"
          />
        );
      }
    }

    // Usar imagen predeterminada para usuarios sin imagen de Cloudinary
    return (
      <Image
        src="/images/AvatarPredeterminado.webp"
        alt={user?.name || "Avatar"}
        width={size}
        height={size}
        className="h-8 w-8 rounded-full object-cover"
      />
    );
  };

  // Renderizar estrellas para la calificación
  const renderStars = (value: number) => {
    return (
      <div className="flex items-center">
        <span className="text-sm font-medium text-foreground mr-2">{value}</span>
        <div className="flex">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              className={`h-5 w-5 ${i < value ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
              />
            </svg>
          ))}
        </div>
      </div>
    );
  };

  // Filtro de estrellas
  const ratingFilterElement = useMemo(() => (
    <div className="flex space-x-2 items-center">
      <span className="text-sm text-foreground/70">Filtrar por estrellas:</span>
      <div className="flex space-x-1">
        {[null, 1, 2, 3, 4, 5].map((value) => (
          <button
            key={value === null ? 'all' : value}
            onClick={() => setRatingFilter(value)}
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm ${
              ratingFilter === value
                ? 'bg-primary text-white'
                : 'bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700'
            }`}
          >
            {value === null ? 'All' : value}
          </button>
        ))}
      </div>
    </div>
  ), [ratingFilter]);

  const columns: Column<Rating>[] = useMemo(() => [
    {
      header: "Usuario",
      accessorKey: "user",
      className: "w-[25%]",
      cell: (rating: Rating) => {
        const { user } = rating;
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 flex-shrink-0 mr-2">
              {renderUserImage(user)}
            </div>
            <div className="min-w-0">
              <Link
                href={`/admin/users/view/${user.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-sm font-medium truncate block"
              >
                {user.name || "Usuario sin nombre"}
              </Link>
              <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Fuente",
      accessorKey: "source",
      className: "w-[15%]",
      cell: (rating: Rating) => {
        return (
          <div className="min-w-0 truncate">
            <Link
              href={`/sources/${rating.sourceId}`}
              className="text-primary hover:text-primary/80 transition-colors text-sm font-medium truncate block"
            >
              {rating.source?.title || rating.source?.name || rating.sourceId}
            </Link>
          </div>
        );
      },
    },
    {
      header: "Valoración",
      accessorKey: "value",
      className: "w-[25%]",
      cell: (rating: Rating) => renderStars(rating.value),
      filterElement: ratingFilterElement,
    },
    {
      header: "Fecha",
      accessorKey: "createdAt",
      className: "w-[15%]",
      cell: (rating: Rating) => {
        // Asegurarse de que createdAt sea una fecha válida
        const date = typeof rating.createdAt === 'string' 
          ? new Date(rating.createdAt) 
          : rating.createdAt;
        
        return (
          <div className="text-sm text-muted-foreground whitespace-nowrap">
            {formatDistanceToNow(date, { locale: es, addSuffix: true })}
          </div>
        );
      },
    },
    {
      header: "Acciones",
      id: "actions",
      className: "w-[20%]",
      cell: (rating: Rating) => {
        return (
          <div className="flex items-center justify-start gap-1">
            <Link
              href={`/sources/${rating.sourceId}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              title="Ver fuente"
            >
              <Book className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate hidden sm:inline">Ver</span>
            </Link>
            <DeleteRatingDialog 
              ratingId={rating.id} 
              onDelete={handleDelete}
            />
          </div>
        );
      },
    },
  ], [handleDelete, ratingFilterElement]);

  return (
    <div className="space-y-4">
      <DataTable<Rating>
        data={paginatedRatings}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar por usuario o fuente..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No hay valoraciones para mostrar"
      />
    </div>
  );
}
