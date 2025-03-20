"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: Date;
  emailVerified: Date | null;
  _count?: {
    comments: number;
    ratings: number;
    favoriteSources: number;
    sentMessages: number;
    receivedMessages: number;
    accounts: number;
  };
};

type UsersTableProps = {
  users: User[];
};

export default function UsersTable({ users }: UsersTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, rowsPerPage]);

  // Filtra los usuarios por nombre o email
  const filteredUsers = useMemo(() => {
    if (!filterValue) return users;
    
    const lowercasedFilter = filterValue.toLowerCase();
    return users.filter(user => {
      const nameMatch = user.name?.toLowerCase().includes(lowercasedFilter) || false;
      const emailMatch = user.email?.toLowerCase().includes(lowercasedFilter) || false;
      return nameMatch || emailMatch;
    });
  }, [users, filterValue]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);

  // Obtiene los usuarios para la página actual
  const paginatedUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredUsers.slice(startIndex, endIndex);
  }, [filteredUsers, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación de usuario
    console.log(`Eliminar usuario ${id}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div>
      <div className="p-4 bg-card border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="w-full sm:w-64">
          <TableFilter 
            onFilterChange={setFilterValue} 
            placeholder="Buscar por nombre o email..."
          />
        </div>
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={setRowsPerPage} 
        />
      </div>
    
      <div className="overflow-x-auto">
        {paginatedUsers.length > 0 ? (
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
                    Rol
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Actividad
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Fecha Registro
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-gray-200">
                {paginatedUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={user.image || "/placeholders/user.png"}
                            alt={user.name || "Usuario sin nombre"}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {user.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-sm text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.role === "admin" ? "bg-purple-100 text-purple-800" : "bg-green-100 text-green-800"}`}>
                        {user.role === "admin" ? "Administrador" : "Usuario"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user._count ? (
                        <div className="flex flex-col text-sm text-muted-foreground">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div>
                              <span className="font-medium">{user._count.comments || 0}</span> comentarios
                            </div>
                            <div>
                              <span className="font-medium">{user._count.ratings || 0}</span> valoraciones
                            </div>
                            <div>
                              <span className="font-medium">{user._count.favoriteSources || 0}</span> favoritos
                            </div>
                            <div>
                              <span className="font-medium">{user._count.sentMessages || 0}</span> mensajes enviados
                            </div>
                            <div>
                              <span className="font-medium">{user._count.receivedMessages || 0}</span> mensajes recibidos
                            </div>
                            <div>
                              <span className="font-medium">{user._count.accounts || 0}</span> cuentas
                            </div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Sin actividad</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(user.createdAt), { locale: es, addSuffix: true })}
                      </div>
                      {user.emailVerified && (
                        <div className="text-xs text-green-600">Email verificado</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/users/edit/${user.id}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200 mr-2"
                        >
                          Editar
                        </Link>
                        <button
                          className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                          onClick={() => handleDelete(user.id)}
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
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay usuarios que coincidan con la búsqueda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue ? "Intenta con otros términos de búsqueda" : "Aún no hay usuarios registrados en el sistema"}
            </p>
            {filterValue && (
              <div className="mt-6">
                <button
                  onClick={() => setFilterValue("")}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                >
                  Limpiar filtro
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
