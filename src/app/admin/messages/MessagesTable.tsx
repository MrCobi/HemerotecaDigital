"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";

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
  const handleDelete = (id: string) => {
    // Implementar lu00f3gica de eliminaciu00f3n
    console.log(`Eliminar mensaje ${id}`);
  };

  const handleMarkAsRead = (id: string) => {
    // Implementar lu00f3gica para marcar como leu00eddo
    console.log(`Marcar mensaje ${id} como leu00eddo`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="overflow-x-auto">
      {messages.length > 0 ? (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Remitente
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Destinatario
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Mensaje
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fecha
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {messages.map((message) => (
                <tr key={message.id} className={message.isRead ? "" : "bg-blue-50"}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${message.isRead ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}
                    >
                      {message.isRead ? "Leu00eddo" : "No leu00eddo"}
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
                          <div className="text-sm font-medium text-gray-900">
                            {message.sender.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-xs text-gray-500">{message.sender.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Usuario eliminado</span>
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
                          <div className="text-sm font-medium text-gray-900">
                            {message.receiver.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-xs text-gray-500">{message.receiver.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Usuario eliminado</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">{message.content}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(message.createdAt), { locale: es, addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/admin/messages/view/${message.id}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200 mr-2"
                      >
                        Ver
                      </Link>
                      {!message.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(message.id)}
                          className="text-green-600 hover:text-green-800 transition-colors duration-200 mr-2"
                        >
                          Marcar leu00eddo
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
        </>
      ) : (
        <div className="text-center py-10">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay mensajes</h3>
          <p className="mt-1 text-sm text-gray-500">No se encontraron mensajes en el sistema.</p>
          <div className="mt-6 flex justify-center space-x-4">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
            >
              Volver al Dashboard
            </Link>
            <button
              onClick={handleReload}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors duration-200"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
