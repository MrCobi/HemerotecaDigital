"use client";

import Link from "next/link";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { format } from "date-fns";
import { useState, useMemo, useCallback } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { ExternalLink, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";
import { Favorite } from "./types"; // Importar el tipo desde el archivo compartido

interface FavoritesTableProps {
  favorites: Favorite[];
}

// Componente para el diálogo de confirmación de eliminación
interface DeleteFavoriteDialogProps {
  favoriteId: string;
  onDelete: (id: string) => Promise<void>;
}

function DeleteFavoriteDialog({ favoriteId, onDelete }: DeleteFavoriteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  async function handleDelete() {
    try {
      setIsDeleting(true);
      await onDelete(favoriteId);
      setIsOpen(false);
      toast.success("Favorito eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar favorito:", error);
      toast.error("Error al eliminar favorito");
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
          title="Eliminar favorito"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs truncate">Eliminar</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Eliminar favorito
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar este favorito?
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
              "Eliminar favorito"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default function FavoritesTable({ favorites }: FavoritesTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [localFavorites, setLocalFavorites] = useState<Favorite[]>(favorites);
  const [_isDeleting, setIsDeleting] = useState(false);

  // Actualizar localFavorites cuando cambian los favoritos (al montar el componente)
  useMemo(() => {
    setLocalFavorites(favorites);
  }, [favorites]);

  // Obtiene categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = localFavorites.map(favorite => favorite.source.category);
    return [...new Set(categories)].sort();
  }, [localFavorites]);

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategoryFilter(value === "all" ? null : value);
    setCurrentPage(1);
  };

  // Filtra los favoritos según los criterios seleccionados
  const filteredFavorites = useMemo(() => {
    if (!filterValue && categoryFilter === null) return localFavorites;
    
    return localFavorites.filter((favorite) => {
      // Filtrar por categoría
      if (categoryFilter !== null && favorite.source.category !== categoryFilter) {
        return false;
      }
      
      // Filtrar por texto si hay un valor
      if (filterValue) {
        const lowercasedFilter = filterValue.toLowerCase();
        
        const userNameMatch = favorite.user.name?.toLowerCase().includes(lowercasedFilter) || false;
        const userEmailMatch = favorite.user.email?.toLowerCase().includes(lowercasedFilter) || false;
        const sourceNameMatch = favorite.source.name.toLowerCase().includes(lowercasedFilter);
        const sourceUrlMatch = favorite.source.url?.toLowerCase().includes(lowercasedFilter) || false;
        
        return userNameMatch || userEmailMatch || sourceNameMatch || sourceUrlMatch;
      }
      
      return true;
    });
  }, [localFavorites, filterValue, categoryFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredFavorites.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentFavorites = filteredFavorites.slice(startIndex, endIndex);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      setIsDeleting(true);
      const response = await fetch(`/api/admin/favorites/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error desconocido');
      }
      
      // Actualizar la lista de favoritos localmente
      setLocalFavorites(prev => prev.filter(favorite => favorite.id !== id));
      
      // Si estamos en la última página y ya no hay elementos, retrocedemos una página
      if (currentFavorites.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
      
      // Mostrar notificación de éxito
      toast.success("Favorito eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar favorito:", error);
      toast.error("No se pudo eliminar el favorito");
    } finally {
      setIsDeleting(false);
    }
  }, [currentFavorites, currentPage]);

  const columns: Column<Favorite>[] = useMemo(() => [
    {
      header: "Usuario",
      accessorKey: "user",
      className: "w-[25%]",
      cell: (favorite: Favorite) => {
        const { user } = favorite;
        if (!user) return <span className="text-sm text-muted-foreground">Usuario eliminado</span>;
        
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8 mr-2">
              {user?.image ? (
                user.image.includes('cloudinary') ? (
                  <CldImage
                    src={(() => {
                      let publicId = user.image;
                      if (user.image.includes('cloudinary.com')) {
                        const match = user.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                        if (match && match[1]) {
                          publicId = `hemeroteca_digital/${match[1]}`;
                        } else {
                          publicId = user.image.replace(/.*\/v\d+\//, '').split('?')[0];
                        }
                      }
                      if (publicId.includes('https://')) {
                        publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                      }
                      return publicId;
                    })()}
                    alt={user?.name || "Avatar"}
                    width={32}
                    height={32}
                    crop="fill"
                    gravity="face"
                    quality="auto"
                    format="auto"
                    effects={[{ improve: true }, { sharpen: "100" }]}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/AvatarPredeterminado.webp";
                    }}
                  />
                ) : (
                  <Image
                    src={user.image}
                    alt={user?.name || "Avatar"}
                    width={32}
                    height={32}
                    className="h-8 w-8 rounded-full object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/AvatarPredeterminado.webp";
                    }}
                  />
                )
              ) : (
                <Image
                  src="/images/AvatarPredeterminado.webp"
                  alt="Avatar predeterminado"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                />
              )}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground truncate max-w-[150px]">
                {user.name || "Usuario sin nombre"}
              </div>
              <div className="text-xs text-muted-foreground truncate max-w-[150px]">{user.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Fuente",
      accessorKey: "source",
      className: "w-[15%]",
      cell: (favorite: Favorite) => {
        const { source } = favorite;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 mr-3">
              {source.imageUrl ? (
                source.imageUrl.includes('cloudinary') ? (
                  <CldImage
                    src={(() => {
                      let publicId = source.imageUrl;
                      if (source.imageUrl.includes('cloudinary.com')) {
                        const match = source.imageUrl.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                        if (match && match[1]) {
                          publicId = `hemeroteca_digital/${match[1]}`;
                        } else {
                          publicId = source.imageUrl.replace(/.*\/v\d+\//, '').split('?')[0];
                        }
                      }
                      if (publicId.includes('https://')) {
                        publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                      }
                      return publicId;
                    })()}
                    alt={source.name}
                    width={40}
                    height={40}
                    crop="fill"
                    gravity="auto"
                    quality="auto"
                    format="auto"
                    effects={[{ improve: true }, { sharpen: "100" }]}
                    className="h-10 w-10 rounded-md object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/default_periodico.jpg";
                    }}
                  />
                ) : (
                  <Image
                    src={source.imageUrl}
                    alt={source.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-md object-cover"
                    onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/default_periodico.jpg";
                    }}
                  />
                )
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {source.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <Link
                href={`/sources/${source.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
              >
                {source.name}
              </Link>
              <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                <a 
                  href={source.url || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:underline flex items-center"
                >
                  <span className="truncate">{source.url ? source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0] : 'URL no disponible'}</span>
                  <ExternalLink className="h-3 w-3 ml-1 inline-flex" />
                </a>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Categoría",
      accessorKey: "category",
      className: "w-[20%]",
      cell: (favorite: Favorite) => {
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300">
            {favorite.source.category}
          </span>
        );
      },
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
      header: "Fecha",
      accessorKey: "createdAt",
      className: "w-[15%]",
      cell: (favorite: Favorite) => {
        const date = new Date(favorite.createdAt);
        return (
          <div className="text-sm text-muted-foreground">
            {format(date, "dd/MM/yyyy")}
          </div>
        );
      }
    },
    {
      header: "Acciones",
      id: "actions",
      className: "w-[25%]",
      cell: (favorite: Favorite) => {
        return (
          <div className="flex items-center space-x-2">
            <Link
              href={`/sources/${favorite.source.id}`}
              className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
              title="Ver detalle de la fuente"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="ml-1 text-xs truncate">Visitar</span>
            </Link>
            <DeleteFavoriteDialog 
              favoriteId={favorite.id} 
              onDelete={handleDelete}
            />
          </div>
        );
      },
    }
  ], [handleDelete, uniqueCategories, categoryFilter]);

  return (
    <div className="space-y-4">
      <DataTable<Favorite>
        data={currentFavorites}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar favoritos..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No hay favoritos para mostrar"
      />
    </div>
  );
}
