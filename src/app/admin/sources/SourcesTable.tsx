"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";

type Source = {
  id: string;
  name: string;
  description: string | null;
  url: string;
  imageUrl: string | null;
  category: string;
  language: string;
  country: string;
  createdAt: Date;
  updatedAt?: Date;
  userId?: string | null;
  user?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  _count: {
    comments: number;
    ratings: number;
    favoriteSources: number;
  };
};

type SourcesTableProps = {
  sources: Source[];
};

export default function SourcesTable({ sources }: SourcesTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Obtiene categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = sources.map(source => source.category);
    return [...new Set(categories)].sort();
  }, [sources]);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, categoryFilter, rowsPerPage]);

  // Filtra las fuentes según los criterios seleccionados
  const filteredSources = useMemo(() => {
    if (!filterValue && categoryFilter === null) return sources;
    
    return sources.filter((source) => {
      // Filtrar por categoría
      if (categoryFilter !== null && source.category !== categoryFilter) {
        return false;
      }
      
      // Filtrar por texto si hay un valor
      if (filterValue) {
        const lowercasedFilter = filterValue.toLowerCase();
        
        const nameMatch = source.name.toLowerCase().includes(lowercasedFilter);
        const descriptionMatch = source.description?.toLowerCase().includes(lowercasedFilter) || false;
        const urlMatch = source.url.toLowerCase().includes(lowercasedFilter);
        const countryMatch = source.country.toLowerCase().includes(lowercasedFilter);
        const languageMatch = source.language.toLowerCase().includes(lowercasedFilter);
        
        return nameMatch || descriptionMatch || urlMatch || countryMatch || languageMatch;
      }
      
      return true;
    });
  }, [sources, filterValue, categoryFilter]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredSources.length / rowsPerPage);

  // Obtiene las fuentes para la página actual
  const paginatedSources = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredSources.slice(startIndex, endIndex);
  }, [filteredSources, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar fuente ${id}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div>
      <div className="p-4 bg-card border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <TableFilter 
              onFilterChange={setFilterValue} 
              placeholder="Buscar fuentes..." 
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
        {paginatedSources.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-card">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    URL
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
                    Estadísticas
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
                {paginatedSources.map((source) => (
                  <tr key={source.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-md object-cover"
                            src={source.imageUrl || "/placeholders/source.png"}
                            alt={source.name}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">{source.name}</div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {source.description || "Sin descripción"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate max-w-xs inline-block"
                      >
                        {source.url}
                      </a>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary/10 text-primary">
                        {source.category}
                      </span>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {source.language} / {source.country}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">{source._count.favoriteSources}</span> favoritos
                        </div>
                        <div>
                          <span className="font-medium">{source._count.ratings}</span> valoraciones
                        </div>
                        <div>
                          <span className="font-medium">{source._count.comments}</span> comentarios
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(source.createdAt), { locale: es, addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/sources/edit/${source.id}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200 mr-2"
                        >
                          Editar
                        </Link>
                        <button
                          className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                          onClick={() => handleDelete(source.id)}
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
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay fuentes que coincidan con la búsqueda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue || categoryFilter !== null
                ? "Intenta ajustar los filtros de búsqueda"
                : "No se encontraron fuentes en el sistema."}
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
