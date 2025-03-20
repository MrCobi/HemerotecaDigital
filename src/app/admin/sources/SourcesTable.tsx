"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";

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
  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar fuente ${id}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="overflow-x-auto">
      {sources.length > 0 ? (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Nombre
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  URL
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Categoría
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Estadísticas
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
              {sources.map((source) => (
                <tr key={source.id}>
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
                        <div className="text-sm font-medium text-gray-900">{source.name}</div>
                        <div className="text-sm text-gray-500 truncate max-w-xs">
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
                    <div className="mt-1 text-xs text-gray-500">
                      {source.language} / {source.country}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-4 text-sm text-gray-500">
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
                    <div className="text-sm text-gray-500">
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
                  Mostrando <span className="font-medium">{sources.length}</span> de{" "}
                  <span className="font-medium">{sources.length}</span> fuentes
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
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay fuentes</h3>
          <p className="mt-1 text-sm text-gray-500">No se encontraron fuentes en el sistema.</p>
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
