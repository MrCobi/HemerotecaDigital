"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";
import { useState, useEffect, useMemo } from "react";
import Pagination from "../components/Pagination";
import RowsPerPageSelector from "../components/RowsPerPageSelector";
import TableFilter from "../components/TableFilter";

type Message = {
  id: string;
  content: string;
  createdAt: Date;
  isRead: boolean;
  senderId: string;
  receiverId: string;
  sender: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  receiver: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
};

type MessagesTableProps = {
  messages: Message[];
};

export default function MessagesTable({ messages }: MessagesTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [filterType, setFilterType] = useState<"all" | "read" | "unread">("all");

  // Reset a la página 1 cuando cambia el filtro o el número de filas
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue, filterType, rowsPerPage]);

  // Filtra los mensajes por contenido, remitente o destinatario
  const filteredMessages = useMemo(() => {
    if (!filterValue && filterType === "all") return messages;
    
    let filtered = [...messages];
    
    // Filtrar por estado (leído/no leído)
    if (filterType === "read") {
      filtered = filtered.filter(message => message.isRead);
    } else if (filterType === "unread") {
      filtered = filtered.filter(message => !message.isRead);
    }
    
    // Filtrar por texto si hay un valor
    if (filterValue) {
      const lowercasedFilter = filterValue.toLowerCase();
      
      filtered = filtered.filter(message => {
        const contentMatch = message.content.toLowerCase().includes(lowercasedFilter);
        const senderNameMatch = message.sender?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const senderEmailMatch = message.sender?.email?.toLowerCase().includes(lowercasedFilter) || false;
        const receiverNameMatch = message.receiver?.name?.toLowerCase().includes(lowercasedFilter) || false;
        const receiverEmailMatch = message.receiver?.email?.toLowerCase().includes(lowercasedFilter) || false;
        
        return contentMatch || senderNameMatch || senderEmailMatch || receiverNameMatch || receiverEmailMatch;
      });
    }
    
    return filtered;
  }, [messages, filterValue, filterType]);

  // Calcula el total de páginas
  const totalPages = Math.ceil(filteredMessages.length / rowsPerPage);

  // Obtiene los mensajes para la página actual
  const paginatedMessages = useMemo(() => {
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    return filteredMessages.slice(startIndex, endIndex);
  }, [filteredMessages, currentPage, rowsPerPage]);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar mensaje ${id}`);
  };

  const handleMarkAsRead = (id: string) => {
    // Implementar lógica para marcar como leído
    console.log(`Marcar mensaje ${id} como leído`);
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
              placeholder="Buscar mensajes..." 
            />
          </div>
          <div className="flex space-x-2">
            <button 
              onClick={() => setFilterType("all")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterType === "all" 
                  ? "bg-primary text-white" 
                  : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
              }`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterType("read")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterType === "read" 
                  ? "bg-primary text-white" 
                  : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
              }`}
            >
              Leídos
            </button>
            <button 
              onClick={() => setFilterType("unread")}
              className={`px-3 py-1 text-sm rounded-md ${
                filterType === "unread" 
                  ? "bg-primary text-white" 
                  : "bg-card hover:bg-accent/50 text-foreground border border-gray-200 dark:border-gray-700"
              }`}
            >
              No leídos
            </button>
          </div>
        </div>
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage} 
          onRowsPerPageChange={setRowsPerPage} 
        />
      </div>
    
      <div className="overflow-x-auto">
        {paginatedMessages.length > 0 ? (
          <>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-card text-foreground">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Remitente
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Destinatario
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-foreground/70 uppercase tracking-wider"
                  >
                    Mensaje
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
                {paginatedMessages.map((message) => (
                  <tr key={message.id} className={`hover:bg-accent/5 transition-colors ${message.isRead ? "" : "bg-blue-50/10 dark:bg-blue-900/10 border-l-4 border-blue-500 dark:border-blue-600"}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          message.isRead 
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" 
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                        }`}
                      >
                        {message.isRead ? "Leído" : "No leído"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {message.sender ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <img
                              className="h-8 w-8 rounded-full object-cover"
                              src={message.sender.image || "/placeholders/user.png"}
                              alt={message.sender.name || "Remitente"}
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-foreground">
                              {message.sender.name || "Usuario sin nombre"}
                            </div>
                            <div className="text-xs text-muted-foreground">{message.sender.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Usuario eliminado</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {message.receiver ? (
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8">
                            <img
                              className="h-8 w-8 rounded-full object-cover"
                              src={message.receiver.image || "/placeholders/user.png"}
                              alt={message.receiver.name || "Destinatario"}
                            />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-foreground">
                              {message.receiver.name || "Usuario sin nombre"}
                            </div>
                            <div className="text-xs text-muted-foreground">{message.receiver.email}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Usuario eliminado</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-foreground max-w-xs truncate">{message.content}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(message.createdAt), { locale: es, addSuffix: true })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <Link
                          href={`/admin/messages/view/${message.id}`}
                          className="text-primary hover:text-primary/80 transition-colors duration-200 mr-2"
                        >
                          Ver
                        </Link>
                        {!message.isRead && (
                          <button
                            onClick={() => handleMarkAsRead(message.id)}
                            className="text-green-600 hover:text-green-800 transition-colors duration-200 mr-2"
                          >
                            Marcar leído
                          </button>
                        )}
                        <button
                          className="text-destructive hover:text-destructive/80 transition-colors duration-200"
                          onClick={() => handleDelete(message.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            <div className="border-t border-gray-200 dark:border-gray-700">
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
            <h3 className="mt-2 text-sm font-medium text-foreground">No hay mensajes que coincidan con la búsqueda</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {filterValue || filterType !== "all"
                ? "Intenta ajustar los filtros de búsqueda"
                : "No se encontraron mensajes en el sistema."}
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
