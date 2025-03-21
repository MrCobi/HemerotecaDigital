"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button, buttonVariants } from "@/src/app/components/ui/button";
import { Badge } from "@/src/app/components/ui/badge";
import { Trash2, Edit, ExternalLink, Star, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";
import Image from "next/image";

// Componente para el diálogo de confirmación de eliminación
interface DeleteSourceDialogProps {
  sourceId: string;
  sourceName: string;
  onDelete: () => Promise<void>;
}

function DeleteSourceDialog({ sourceId, sourceName, onDelete }: DeleteSourceDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  async function handleDelete() {
    try {
      setIsDeleting(true);
      await onDelete();
      setIsOpen(false);
      toast.success("Fuente eliminada correctamente");
    } catch (error) {
      console.error("Error al eliminar fuente:", error);
      toast.error("Error al eliminar fuente");
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          title="Eliminar fuente"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar fuente
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar la fuente <span className="font-semibold">{sourceName}</span>?
          </AlertDialogDescription>
          <p className="text-destructive font-medium text-sm mt-2">
            Esta acción no se puede deshacer y eliminará toda la información asociada a esta fuente.
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: any) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className={buttonVariants({ variant: "destructive" })}
          >
            {isDeleting ? (
              <>
                <span className="animate-pulse">Eliminando...</span>
              </>
            ) : (
              "Eliminar fuente"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Definimos el tipo Source basado en el modelo Prisma
export interface Source {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string | null;
  category: string;
  language: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
  avgRating?: number;
  ratingCount?: number;
  _count?: {
    comments: number;
    favoriteSources: number;
    ratings: number;
  }
}

type SourcesTableProps = {
  sources: Source[];
};

export default function SourcesTable({ sources }: SourcesTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const router = useRouter();

  // Obtener categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = sources.map(source => source.category);
    return [...new Set(categories)].sort();
  }, [sources]);

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategoryFilter(value === "all" ? null : value);
    setCurrentPage(1);
  };

  const filteredSources = useMemo(() => {
    if (!filterValue && categoryFilter === null) return sources;

    return sources.filter((source) => {
      const matchesFilter =
        !filterValue ||
        source.name.toLowerCase().includes(filterValue.toLowerCase()) ||
        source.description.toLowerCase().includes(filterValue.toLowerCase()) ||
        source.url.toLowerCase().includes(filterValue.toLowerCase());

      const matchesCategory =
        !categoryFilter ||
        source.category === categoryFilter;

      return matchesFilter && matchesCategory;
    });
  }, [sources, filterValue, categoryFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredSources.length / rowsPerPage);
  const paginatedSources = filteredSources.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Función para manejar la eliminación de una fuente
  const handleDeleteSource = async (sourceId: string) => {
    try {
      const response = await fetch(`/api/admin/sources/${sourceId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error desconocido');
      }
      
      // Recargar la página para actualizar la lista
      router.refresh();
    } catch (error) {
      console.error("Error al eliminar fuente:", error);
      throw error;
    }
  };

  // Funciones de ayuda para obtener clases CSS según la categoría
  const getCategoryBadgeClass = (category: string) => {
    const categories: Record<string, string> = {
      'general': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'business': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'technology': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      'entertainment': 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      'sports': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'science': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300',
      'health': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    };
    
    return categories[category.toLowerCase()] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const columns: Column<Source>[] = useMemo(
    () => [
      {
        header: "Fuente",
        accessorKey: "source",
        cell: (source: Source) => (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0 rounded-md bg-muted flex items-center justify-center mr-3">
              {source.imageUrl ? (
                <Image
                  src={source.imageUrl}
                  alt={source.name}
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-md object-cover"
                  priority
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/placeholder.webp";
                  }}
                />
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {source.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div className="font-medium text-foreground">{source.name}</div>
              <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground flex items-center hover:text-primary">
                <ExternalLink className="h-3 w-3 mr-1" />
                {source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
              </a>
            </div>
          </div>
        )
      },
      {
        header: "Categoría",
        accessorKey: "category",
        cell: (source: Source) => (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryBadgeClass(source.category)}`}>
            {source.category}
          </span>
        ),
        filterElement: (
          <select
            className="block w-full rounded-md border border-input bg-background text-foreground py-1.5 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
            value={categoryFilter || "all"}
            onChange={handleCategoryFilterChange}
          >
            <option value="all">Todas las categorías</option>
            {uniqueCategories.map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        )
      },
      {
        header: "Estadísticas",
        id: "stats",
        cell: (source: Source) => (
          <div className="space-y-1">
            <div className="flex items-center text-amber-500">
              <Star className="h-4 w-4 mr-1" />
              <span>
                {source.avgRating !== undefined 
                  ? `${source.avgRating.toFixed(1)} (${source.ratingCount || source._count?.ratings || 0})` 
                  : "Sin valoraciones"}
              </span>
            </div>
            <div className="text-xs text-muted-foreground">
              {source._count?.comments || 0} comentarios
            </div>
            <div className="text-xs text-muted-foreground">
              {source._count?.favoriteSources || 0} favoritos
            </div>
          </div>
        )
      },
      {
        header: "Ubicación",
        accessorKey: "location",
        cell: (source: Source) => (
          <div>
            <div className="text-sm font-medium">
              {source.country}
            </div>
            <div className="text-xs text-muted-foreground">
              {source.language}
            </div>
          </div>
        )
      },
      {
        header: "Creado",
        accessorKey: "createdAt",
        cell: (source: Source) => {
          const date = new Date(source.createdAt);
          return (
            <div className="text-sm text-muted-foreground">
              {format(date, "dd MMM yyyy")}
            </div>
          );
        }
      },
      {
        header: "Acciones",
        accessorKey: "actions",
        cell: (source: Source) => (
          <div className="flex space-x-2">
            <Link
              href={`/admin/sources/view/${source.id}`}
              className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors text-sm bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md"
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Ver
            </Link>
            <Link
              href={`/admin/sources/edit/${source.id}`}
              className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium transition-colors text-sm bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-800/50"
            >
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Link>
            <DeleteSourceDialog
              sourceId={source.id}
              sourceName={source.name}
              onDelete={() => handleDeleteSource(source.id)}
            />
          </div>
        )
      }
    ],
    []
  );

  return (
    <div className="space-y-4">
      <DataTable<Source>
        data={paginatedSources}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar fuentes..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No se encontraron fuentes"
      />
    </div>
  );
}
