"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";
import Image from "next/image";

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
};

export default function FollowsTable({ follows }: FollowsTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, rowsPerPage]);

  // Filtra las relaciones de seguimiento según los criterios seleccionados
  const filteredFollows = useMemo(() => {
    if (!filterValue) return follows;
    
    return follows.filter((follow) => {
      const lowercasedFilter = filterValue.toLowerCase();
      
      const followerNameMatch = follow.follower.name?.toLowerCase().includes(lowercasedFilter) || false;
      const followerEmailMatch = follow.follower.email?.toLowerCase().includes(lowercasedFilter) || false;
      
      const followingNameMatch = follow.following.name?.toLowerCase().includes(lowercasedFilter) || false;
      const followingEmailMatch = follow.following.email?.toLowerCase().includes(lowercasedFilter) || false;
      
      return followerNameMatch || followerEmailMatch || followingNameMatch || followingEmailMatch;
    });
  }, [follows, filterValue]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredFollows.length / rowsPerPage);

  // Obtiene las relaciones para la página actual
  const paginatedFollows = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredFollows.slice(startIndex, endIndex);
  }, [filteredFollows, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar relación de seguimiento ${id}`);
  };

  return (
    <div>
      <div className="p-4 bg-card border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-64">
          <TableFilter 
            onFilterChange={setFilterValue} 
            placeholder="Buscar seguidores..." 
          />
        </div>
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={setRowsPerPage} 
        />
      </div>
    
      <div className="overflow-x-auto">
        {paginatedFollows.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-card">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Seguidor
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Sigue a
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Fecha de seguimiento
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedFollows.map((follow) => (
                  <tr key={follow.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted flex items-center justify-center mr-2">
                          <Image
                            src={follow.follower.image || "/images/AvatarPredeterminado.webp"}
                            alt={follow.follower.name || ""}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {follow.follower.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {follow.follower.email || "Sin correo"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted flex items-center justify-center mr-2">
                          <Image
                            src={follow.following.image || "/images/AvatarPredeterminado.webp"}
                            alt={follow.following.name || ""}
                            width={32}
                            height={32}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {follow.following.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {follow.following.email || "Sin correo"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(follow.createdAt), { 
                          locale: es, 
                          addSuffix: true 
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/users/view/${follow.followerId}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200 mr-2"
                        >
                          Ver seguidor
                        </Link>
                        <Link
                          href={`/admin/users/view/${follow.followingId}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200 mr-2"
                        >
                          Ver seguido
                        </Link>
                        <button
                          className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                          onClick={() => handleDelete(follow.id)}
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
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay relaciones de seguimiento</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue 
                ? "Intenta ajustar los filtros de búsqueda"
                : "No se encontraron relaciones de seguimiento en el sistema."}
            </p>
            {filterValue && (
              <div className="mt-6">
                <button
                  onClick={() => setFilterValue("")}
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
