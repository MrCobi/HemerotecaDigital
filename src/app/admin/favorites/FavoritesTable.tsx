"use client";

import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";

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

  // Obtiene categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = favorites.map(favorite => favorite.source.category);
    return [...new Set(categories)].sort();
  }, [favorites]);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, categoryFilter, rowsPerPage]);

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

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredFavorites.length / rowsPerPage);

  // Obtiene los favoritos para la página actual
  const paginatedFavorites = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredFavorites.slice(startIndex, endIndex);
  }, [filteredFavorites, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar favorito ${id}`);
  };

  return (
    <div>
      <div className="p-4 bg-card border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <TableFilter 
              onFilterChange={setFilterValue} 
              placeholder="Buscar favoritos..." 
            />
          </div>
          {uniqueCategories.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-foreground/70">Categoría:</span>
              <select
                value={categoryFilter || ""}
                onChange={(e) => setCategoryFilter(e.target.value === "" ? null : e.target.value)}
                className="text-sm rounded-md border border-input bg-background px-3 py-1 pr-8"
              >
                <option value="">Todas</option>
                {uniqueCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={setRowsPerPage} 
        />
      </div>
    
      <div className="overflow-x-auto">
        {paginatedFavorites.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-card">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Usuario
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Fuente
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Categoría
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Fecha
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedFavorites.map((favorite) => (
                  <tr key={favorite.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 mr-3">
                          <Image
                            src={favorite.user.image || "/images/AvatarPredeterminado.webp"}
                            alt={favorite.user.name || "Usuario"}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {favorite.user.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {favorite.user.email || "Sin correo"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <Image
                            src={favorite.source.imageUrl || "/images/default_periodico.jpg"}
                            alt={favorite.source.name || "Fuente"}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {favorite.source.name}
                          </div>
                          <a
                            href={favorite.source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline truncate max-w-xs inline-block"
                          >
                            {favorite.source.url}
                          </a>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                        {favorite.source.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(favorite.createdAt), { locale: es, addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/sources/view/${favorite.sourceId}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200 mr-2"
                        >
                          Ver fuente
                        </Link>
                        <button
                          className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                          onClick={() => handleDelete(favorite.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="border-t border-gray-200">
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={setCurrentPage} 
              />
            </div>
          </>
        ) : (
          <div className="text-center py-10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay favoritos que coincidan con la búsqueda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue || categoryFilter !== null
                ? "Intenta ajustar los filtros de búsqueda"
                : "No se encontraron favoritos en el sistema."}
            </p>
            {(filterValue || categoryFilter !== null) && (
              <div className="mt-6">
                <button
                  onClick={() => { setFilterValue(""); setCategoryFilter(null); }}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
