"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";
import Image from "next/image";

type Rating = {
  id: string;
  value: number;
  comment: string | null;
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
    title: string;
  };
};

type RatingsTableProps = {
  ratings: Rating[];
};

export default function RatingsTable({ ratings }: RatingsTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, ratingFilter, rowsPerPage]);

  // Filtra las calificaciones según los criterios seleccionados
  const filteredRatings = useMemo(() => {
    if (!filterValue && ratingFilter === null) return ratings;
    
    return ratings.filter((rating) => {
      // Filtrar por valor de calificación
      if (ratingFilter !== null && rating.value !== ratingFilter) {
        return false;
      }
      
      // Filtrar por texto si hay un valor
      if (filterValue) {
        const lowercasedFilter = filterValue.toLowerCase();
        
        const userNameMatch = rating.user?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const userEmailMatch = rating.user?.email?.toLowerCase().includes(lowercasedFilter) || false;
        const sourceTitleMatch = rating.source.title.toLowerCase().includes(lowercasedFilter);
        const commentMatch = rating.comment?.toLowerCase().includes(lowercasedFilter) || false;
        
        return userNameMatch || userEmailMatch || sourceTitleMatch || commentMatch;
      }
      
      return true;
    });
  }, [ratings, filterValue, ratingFilter]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredRatings.length / rowsPerPage);

  // Obtiene las calificaciones para la página actual
  const paginatedRatings = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredRatings.slice(startIndex, endIndex);
  }, [filteredRatings, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar valoración ${id}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div>
      <div className="p-4 bg-card border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <TableFilter 
              onFilterChange={setFilterValue} 
              placeholder="Buscar valoraciones..." 
            />
          </div>
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
        </div>
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={setRowsPerPage} 
        />
      </div>
    
      <div className="overflow-x-auto">
        {paginatedRatings.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-card text-foreground">
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
                    Valoración
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Comentario
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
              <tbody className="bg-card divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedRatings.map((rating) => (
                  <tr key={rating.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8 mr-3">
                          <Image
                            src={rating.user.image || "/images/AvatarPredeterminado.webp"}
                            alt={rating.user.name || "Usuario"}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {rating.user.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-sm text-muted-foreground">{rating.user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-foreground">{rating.source.title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="text-sm font-medium text-foreground mr-2">{rating.value}</span>
                        <div className="flex">
                          {[...Array(5)].map((_, i) => (
                            <svg
                              key={i}
                              className={`h-5 w-5 ${i < rating.value ? "text-yellow-400" : "text-gray-300 dark:text-gray-600"}`}
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
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground">
                        {rating.comment ? (
                          <p className="line-clamp-2">{rating.comment}</p>
                        ) : (
                          <span className="text-muted-foreground italic">Sin comentario</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(rating.createdAt), { locale: es, addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/sources/${rating.source.id}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200"
                        >
                          Ver fuente
                        </Link>
                        <button
                          className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                          onClick={() => handleDelete(rating.id)}
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
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay valoraciones que coincidan con la búsqueda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue || ratingFilter !== null
                ? "Intenta ajustar los filtros de búsqueda"
                : "No se encontraron valoraciones en el sistema."}
            </p>
            {(filterValue || ratingFilter !== null) && (
              <div className="mt-6">
                <button
                  onClick={() => { setFilterValue(""); setRatingFilter(null); }}
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
