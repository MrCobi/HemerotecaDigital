"use client";

import Link from "next/link";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button } from "@/src/app/components/ui/button";
import { ExternalLink, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";

type Favorite = {
  id: string;
  createdAt: Date;
  updatedAt: Date;
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
    name: string;
    url: string;
    imageUrl: string | null;
    category: string;
  };
};

type FavoritesTableProps = {
  favorites: Favorite[];
};

export default function FavoritesTable({ favorites }: FavoritesTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [favoriteToDelete, setFavoriteToDelete] = useState<string | null>(null);

  // Obtiene categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = favorites.map(favorite => favorite.source.category);
    return [...new Set(categories)].sort();
  }, [favorites]);

  const handleCategoryFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCategoryFilter(value === "all" ? null : value);
    setCurrentPage(1);
  };

  // Filtra los favoritos según los criterios seleccionados
  const filteredFavorites = useMemo(() => {
    if (!filterValue && categoryFilter === null) return favorites;
    
    return favorites.filter((favorite) => {
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
        const sourceUrlMatch = favorite.source.url.toLowerCase().includes(lowercasedFilter);
        
        return userNameMatch || userEmailMatch || sourceNameMatch || sourceUrlMatch;
      }
      
      return true;
    });
  }, [favorites, filterValue, categoryFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredFavorites.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentFavorites = filteredFavorites.slice(startIndex, endIndex);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar favorito ${id}`);
    setIsDeleteDialogOpen(false);
    setFavoriteToDelete(null);
  };

  const columns: Column<Favorite>[] = useMemo(() => [
    {
      header: "Usuario",
      accessorKey: "user",
      cell: (favorite: Favorite) => {
        const { user } = favorite;
        if (!user) return <span className="text-sm text-muted-foreground">Usuario eliminado</span>;
        
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8">
              {user?.image && user?.image.includes('cloudinary') ? (
                <CldImage
                  src={user.image}
                  alt={user?.name || "Avatar"}
                  width={32}
                  height={32}
                  crop="fill"
                  gravity="face"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : user?.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
                <CldImage
                  src={user.image}
                  alt={user?.name || "Avatar"}
                  width={32}
                  height={32}
                  crop="fill"
                  gravity="face"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : (
                <Image
                  src={user?.image || "/images/AvatarPredeterminado.webp"}
                  alt={user?.name || "Avatar"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
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
      header: "Fuente",
      accessorKey: "source",
      cell: (favorite: Favorite) => {
        const { source } = favorite;
        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-10 w-10 mr-3">
              {source.imageUrl ? (
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
              ) : (
                <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {source.name.substring(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <Link
                href={`/admin/sources/view/${source.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
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
                  <span className="truncate">{source.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}</span>
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
      cell: (favorite: Favorite) => {
        return (
          <div className="flex justify-end space-x-2">
            <Link
              href={`/admin/sources/view/${favorite.source.id}`}
              className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-offset-background transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Ver fuente
            </Link>
            <AlertDialog open={isDeleteDialogOpen && favoriteToDelete === favorite.id} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setFavoriteToDelete(favorite.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará el favorito y no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setFavoriteToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(favorite.id)}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      }
    }
  ], [isDeleteDialogOpen, favoriteToDelete, categoryFilter]);

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
