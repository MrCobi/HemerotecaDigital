"use client";

import { useState, useMemo } from "react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import Image from 'next/image';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValue, setFilterValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const rowsPerPage = 10;

  // Obtiene categorías únicas para el filtro
  const uniqueCategories = useMemo(() => {
    const categories = sources.map(source => source.category);
    return [...new Set(categories)].sort();
  }, [sources]);

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

  // Funciones de ayuda para obtener clases CSS según la categoría
  const getCategoryClasses = (category: string) => {
    switch (category.toLowerCase()) {
      case 'general':
        return 'bg-blue-100 text-blue-800';
      case 'business':
        return 'bg-green-100 text-green-800';
      case 'technology':
        return 'bg-purple-100 text-purple-800';
      case 'entertainment':
        return 'bg-pink-100 text-pink-800';
      case 'sports':
        return 'bg-orange-100 text-orange-800';
      case 'science':
        return 'bg-teal-100 text-teal-800';
      case 'health':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-card">
      {/* Filtros */}
      <div className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border">
        <div className="w-full md:w-64">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-4 h-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
              </svg>
            </div>
            <input
              type="text"
              className="block w-full p-2 pl-10 text-sm border border-border rounded-lg bg-background focus:ring-primary focus:border-primary"
              placeholder="Buscar fuentes..."
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            />
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Categoría:</span>
          <select
            className="p-2 text-sm rounded-md border border-border bg-background"
            value={categoryFilter || ""}
            onChange={(e) => setCategoryFilter(e.target.value === "" ? null : e.target.value)}
          >
            <option value="">Todas</option>
            {uniqueCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla - Solo visible en pantallas no móviles */}
      <div className="hidden md:block">
        <table className="w-full">
          <thead className="bg-muted/30">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Nombre</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[25%]">URL</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[15%]">Categoría</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[20%]">Estadísticas</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Fecha</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider w-[10%]">Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {paginatedSources.length > 0 ? (
              paginatedSources.map((source) => (
                <tr 
                  key={source.id} 
                  className="hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => window.location.href = `/admin/sources/view/${source.id}`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <Image
                          src={source.imageUrl || "/images/default_periodico.jpg"}
                          alt={source.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full object-cover bg-background"
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium">{source.name}</div>
                        {source.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {source.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm break-all">
                      <a 
                        href={source.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {source.url.length > 30 ? `${source.url.substring(0, 30)}...` : source.url}
                      </a>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryClasses(source.category)}`}>
                      {source.category}
                      {source.language && ` | ${source.language}`}
                      {source.country && ` | ${source.country}`}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col md:flex-row gap-2 md:gap-4">
                      <div className="flex items-center">
                        <div className="p-1 rounded-full bg-blue-100">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="ml-1 text-xs">{source._count.favoriteSources} favoritos</span>
                      </div>
                      <div className="flex items-center">
                        <div className="p-1 rounded-full bg-yellow-100">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </div>
                        <span className="ml-1 text-xs">{source._count.ratings} valoraciones</span>
                      </div>
                      <div className="flex items-center">
                        <div className="p-1 rounded-full bg-green-100">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <span className="ml-1 text-xs">{source._count.comments} comentarios</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(source.createdAt), { locale: es, addSuffix: true })}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/admin/sources/edit/${source.id}`}
                        className="text-primary hover:text-primary/80 transition-colors duration-200"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Editar
                      </Link>
                      <button
                        className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          // Implementar lógica de eliminación
                          console.log(`Eliminar fuente ${source.id}`);
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No se encontraron fuentes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Vista móvil */}
      <div className="md:hidden">
        {paginatedSources.length > 0 ? (
          paginatedSources.map((source) => (
            <div
              key={source.id}
              className="p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => window.location.href = `/admin/sources/view/${source.id}`}
            >
              <div className="flex items-center mb-2">
                <div className="h-10 w-10 mr-3 flex-shrink-0">
                  <Image
                    src={source.imageUrl || "/images/default_periodico.jpg"}
                    alt={source.name}
                    width={40}
                    height={40}
                    className="h-10 w-10 rounded-full object-cover bg-background"
                  />
                </div>
                <div>
                  <div className="font-medium text-sm">{source.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(source.createdAt), { locale: es, addSuffix: true })}
                  </div>
                </div>
              </div>
              
              <div className="text-xs mb-2 break-all">
                <a 
                  href={source.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {source.url.length > 30 ? `${source.url.substring(0, 30)}...` : source.url}
                </a>
              </div>
              
              <div className="mb-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryClasses(source.category)}`}>
                  {source.category}
                  {source.language && ` | ${source.language}`}
                  {source.country && ` | ${source.country}`}
                </span>
              </div>
              
              <div className="flex flex-wrap gap-3 my-2">
                <div className="flex items-center">
                  <div className="p-1 rounded-full bg-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="ml-1 text-xs">{source._count.favoriteSources}</span>
                </div>
                <div className="flex items-center">
                  <div className="p-1 rounded-full bg-yellow-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </div>
                  <span className="ml-1 text-xs">{source._count.ratings}</span>
                </div>
                <div className="flex items-center">
                  <div className="p-1 rounded-full bg-green-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <span className="ml-1 text-xs">{source._count.comments}</span>
                </div>
              </div>
              
              <div className="flex justify-end mt-2 space-x-3">
                <Link
                  href={`/admin/sources/edit/${source.id}`}
                  className="text-xs text-primary hover:text-primary/80 transition-colors duration-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  Editar
                </Link>
                <button
                  className="text-xs text-destructive hover:text-destructive/80 transition-colors duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Implementar lógica de eliminación
                    console.log(`Eliminar fuente ${source.id}`);
                  }}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-muted-foreground">
            No se encontraron fuentes
          </div>
        )}
      </div>

      {/* Paginación */}
      {paginatedSources.length > 0 && (
        <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="flex-1 flex justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Siguiente
            </button>
          </div>
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Mostrando <span className="font-medium">{Math.min((currentPage - 1) * rowsPerPage + 1, filteredSources.length)}</span> a <span className="font-medium">{Math.min(currentPage * rowsPerPage, filteredSources.length)}</span> de{' '}
                <span className="font-medium">{filteredSources.length}</span> resultados
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Primera</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Anterior</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                
                {/* Números de página */}
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  const pageNum = currentPage <= 3
                    ? i + 1
                    : currentPage >= totalPages - 2
                      ? totalPages - 4 + i
                      : currentPage - 2 + i;
                  
                  if (pageNum > 0 && pageNum <= totalPages) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === pageNum
                            ? 'z-10 bg-primary border-primary text-white'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  }
                  return null;
                })}
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Siguiente</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010 1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Última</span>
                  <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010 1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
