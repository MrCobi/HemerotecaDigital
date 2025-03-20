"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";

type Comment = {
  id: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
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
  _count?: {
    replies: number;
  };
};

type CommentsTableProps = {
  comments: Comment[];
};

export default function CommentsTable({ comments }: CommentsTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [filterType, setFilterType] = useState<"all" | "replies" | "deleted">("all");

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, filterType, rowsPerPage]);

  // Filtra los comentarios según los criterios seleccionados
  const filteredComments = useMemo(() => {
    if (!filterValue && filterType === "all") return comments;
    
    let filtered = [...comments];
    
    // Filtrar por tipo
    if (filterType === "replies") {
      filtered = filtered.filter(comment => comment.parentId !== null);
    } else if (filterType === "deleted") {
      filtered = filtered.filter(comment => comment.isDeleted);
    }
    
    // Filtrar por texto si hay un valor
    if (filterValue) {
      const lowercasedFilter = filterValue.toLowerCase();
      
      filtered = filtered.filter(comment => {
        const contentMatch = comment.content.toLowerCase().includes(lowercasedFilter);
        const sourceNameMatch = comment.source.name.toLowerCase().includes(lowercasedFilter);
        const userNameMatch = comment.user?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const userEmailMatch = comment.user?.email?.toLowerCase().includes(lowercasedFilter) || false;
        
        return contentMatch || sourceNameMatch || userNameMatch || userEmailMatch;
      });
    }
    
    return filtered;
  }, [comments, filterValue, filterType]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredComments.length / rowsPerPage);

  // Obtiene los comentarios para la página actual
  const paginatedComments = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredComments.slice(startIndex, endIndex);
  }, [filteredComments, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar comentario ${id}`);
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
              placeholder="Buscar comentarios..." 
            />
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterType === "all" 
                  ? "bg-primary text-white" 
                  : "bg-card hover:bg-accent/50 text-foreground"
              }`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterType("replies")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterType === "replies" 
                  ? "bg-primary text-white" 
                  : "bg-card hover:bg-accent/50 text-foreground"
              }`}
            >
              Respuestas
            </button>
            <button 
              onClick={() => setFilterType("deleted")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterType === "deleted" 
                  ? "bg-primary text-white" 
                  : "bg-card hover:bg-accent/50 text-foreground"
              }`}
            >
              Eliminados
            </button>
          </div>
        </div>
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={setRowsPerPage} 
        />
      </div>
    
      <div className="overflow-x-auto">
        {paginatedComments.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-card">
                <tr>
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
                    Fuente
                  </th>
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
                    Fecha
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedComments.map((comment) => (
                  <tr key={comment.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground max-w-md truncate">
                        {comment.content}
                      </div>
                      {comment._count && comment._count.replies > 0 && (
                        <div className="text-xs text-primary mt-1">
                          {comment._count.replies} respuestas
                        </div>
                      )}
                      {comment.parentId && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Respuesta a otro comentario
                        </div>
                      )}
                      {comment.isDeleted && (
                        <div className="text-xs text-red-500 mt-1 font-semibold">
                          Comentario eliminado
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/sources/${comment.sourceId}`}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        {comment.source.name}
                      </Link>
                      <div className="text-xs text-muted-foreground mt-1 truncate max-w-xs">
                        <a href={comment.source.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                          {comment.source.url}
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {comment.user ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <img
                              className="h-8 w-8 rounded-full object-cover"
                              src={comment.user.image || "/placeholders/user.png"}
                              alt={comment.user.name || "Usuario"}
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-foreground">
                              {comment.user.name || "Usuario sin nombre"}
                            </div>
                            <div className="text-xs text-muted-foreground">{comment.user.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Usuario eliminado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                      </div>
                      {comment.updatedAt > comment.createdAt && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Editado {formatDistanceToNow(new Date(comment.updatedAt), { locale: es, addSuffix: true })}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/comments/view/${comment.id}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200 mr-2"
                        >
                          Ver
                        </Link>
                        {!comment.isDeleted && (
                          <button
                            className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                            onClick={() => handleDelete(comment.id)}
                          >
                            Eliminar
                          </button>
                        )}
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
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay comentarios que coincidan con la búsqueda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue || filterType !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "No se encontraron comentarios en el sistema."}
            </p>
            {(filterValue || filterType !== "all") && (
              <div className="mt-6">
                <button
                  onClick={() => { setFilterValue(""); setFilterType("all"); }}
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
