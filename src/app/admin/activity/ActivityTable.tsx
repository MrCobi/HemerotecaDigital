"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";

type Activity = {
  id: string;
  type: 'comment' | 'rating' | 'favorite' | 'login';
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  targetName: string;
  targetId: string;
  targetType: string;
  createdAt: Date;
  details: string | null;
};

type ActivityTableProps = {
  activities: Activity[];
};

export default function ActivityTable({ activities }: ActivityTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, typeFilter, rowsPerPage]);

  // Filtra las actividades según los criterios seleccionados
  const filteredActivities = useMemo(() => {
    if (!filterValue && typeFilter === null) return activities;
    
    return activities.filter((activity) => {
      // Filtrar por tipo de actividad
      if (typeFilter !== null && activity.type !== typeFilter) {
        return false;
      }
      
      // Filtrar por texto si hay un valor
      if (filterValue) {
        const lowercasedFilter = filterValue.toLowerCase();
        
        const userNameMatch = activity.userName?.toLowerCase().includes(lowercasedFilter) || false;
        const userEmailMatch = activity.userEmail?.toLowerCase().includes(lowercasedFilter) || false;
        const targetNameMatch = activity.targetName.toLowerCase().includes(lowercasedFilter);
        const detailsMatch = activity.details?.toLowerCase().includes(lowercasedFilter) || false;
        
        return userNameMatch || userEmailMatch || targetNameMatch || detailsMatch;
      }
      
      return true;
    });
  }, [activities, filterValue, typeFilter]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredActivities.length / rowsPerPage);

  // Obtiene las actividades para la página actual
  const paginatedActivities = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredActivities.slice(startIndex, endIndex);
  }, [filteredActivities, currentPage, rowsPerPage]);

  // Función para obtener ícono según el tipo de actividad
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
          </svg>
        );
      case 'rating':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        );
      case 'favorite':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        );
      case 'login':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 3a1 1 0 011 1v12a1 1 0 11-2 0V4a1 1 0 011-1zm7.707 3.293a1 1 0 010 1.414L9.414 9H17a1 1 0 110 2H9.414l1.293 1.293a1 1 0 01-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  // Función para obtener texto descriptivo según el tipo de actividad
  const getActivityDescription = (activity: Activity) => {
    switch (activity.type) {
      case 'comment':
        return `comentó en ${activity.targetName}`;
      case 'rating':
        return `valoró ${activity.targetName}`;
      case 'favorite':
        return `agregó ${activity.targetName} a favoritos`;
      case 'login':
        return `inició sesión en la plataforma`;
      default:
        return `realizó una acción`;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'comment':
        return 'Comentario';
      case 'rating':
        return 'Valoración';
      case 'favorite':
        return 'Favorito';
      case 'login':
        return 'Inicio de sesión';
      default:
        return 'Desconocido';
    }
  };

  const getActivityLink = (activity: Activity) => {
    switch (activity.type) {
      case 'comment':
        return `/admin/comments`;
      case 'rating':
        return `/admin/ratings`;
      case 'favorite':
        return `/admin/favorites`;
      default:
        return '#';
    }
  };

  return (
    <div>
      <div className="p-4 bg-card border-b border-gray-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <TableFilter 
              onFilterChange={setFilterValue} 
              placeholder="Buscar actividad..." 
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-foreground/70">Tipo:</span>
            <select
              value={typeFilter || ""}
              onChange={(e) => setTypeFilter(e.target.value === "" ? null : e.target.value)}
              className="text-sm rounded-md border border-input bg-background px-3 py-1 pr-8"
            >
              <option value="">Todos</option>
              <option value="comment">Comentarios</option>
              <option value="rating">Valoraciones</option>
              <option value="favorite">Favoritos</option>
            </select>
          </div>
        </div>
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={setRowsPerPage} 
        />
      </div>
    
      <div className="overflow-x-auto">
        {paginatedActivities.length > 0 ? (
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
                    Actividad
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Detalles
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
                {paginatedActivities.map((activity) => (
                  <tr key={activity.id} className="hover:bg-accent/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={activity.userImage || "/placeholders/user.png"}
                            alt={activity.userName || "Usuario"}
                          />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {activity.userName || "Usuario sin nombre"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {activity.userEmail || "Sin correo"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="ml-2">
                          <div className="text-sm font-medium text-foreground">
                            {getActivityLabel(activity.type)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {getActivityDescription(activity)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-muted-foreground truncate max-w-md">
                        {activity.details || "Sin detalles"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.createdAt), { locale: es, addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={getActivityLink(activity)}
                        className="text-primary hover:text-primary/80 transition-colors duration-200"
                      >
                        Ver detalles
                      </Link>
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
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay actividades que coincidan con la búsqueda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue || typeFilter !== null
                ? "Intenta ajustar los filtros de búsqueda"
                : "No se encontraron actividades recientes."}
            </p>
            {(filterValue || typeFilter !== null) && (
              <div className="mt-6">
                <button
                  onClick={() => { setFilterValue(""); setTypeFilter(null); }}
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
