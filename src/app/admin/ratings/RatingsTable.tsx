"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";

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
  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar valoración ${id}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="overflow-x-auto">
      {ratings.length > 0 ? (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Usuario
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fuente
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Valoración
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Comentario
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
              {ratings.map((rating) => (
                <tr key={rating.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <img
                          className="h-10 w-10 rounded-full"
                          src={rating.user.image || "/placeholders/user.png"}
                          alt={rating.user.name || "Usuario"}
                        />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {rating.user.name || "Usuario sin nombre"}
                        </div>
                        <div className="text-sm text-gray-500">{rating.user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{rating.source.title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-900 mr-2">{rating.value}</span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <svg
                            key={i}
                            className={`h-5 w-5 ${i < rating.value ? "text-yellow-400" : "text-gray-300"}`}
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 15.585l-7.7 4.726 2.122-9.058L.764 6.364l9.09-.965L10 0l4.146 5.399 9.09.965-6.658 4.889 2.122 9.058L10 15.585z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {rating.comment ? (
                        <p className="line-clamp-2">{rating.comment}</p>
                      ) : (
                        <span className="text-gray-500 italic">Sin comentario</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
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
          <div className="py-3 flex items-center justify-between border-t border-gray-200 px-4 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={true}
              >
                Anterior
              </button>
              <button
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                disabled={true}
              >
                Siguiente
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{ratings.length}</span> de{" "}
                  <span className="font-medium">{ratings.length}</span> valoraciones
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  disabled={true}
                >
                  Anterior
                </button>
                <button
                  className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  disabled={true}
                >
                  Siguiente
                </button>
              </div>
            </div>
          </div>
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
              d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay valoraciones</h3>
          <p className="mt-1 text-sm text-gray-500">No se encontraron valoraciones en el sistema.</p>
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
