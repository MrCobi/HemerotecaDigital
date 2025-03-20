"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";

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
  const handleDelete = (id: string) => {
    // Implementar lu00f3gica de eliminaciu00f3n
    console.log(`Eliminar comentario ${id}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="overflow-x-auto">
      {comments.length > 0 ? (
        <>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
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
                  Fuente
                </th>
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
                  Fecha
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {comments.map((comment) => (
                <tr key={comment.id}>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-md truncate">
                      {comment.content}
                    </div>
                    {comment._count && comment._count.replies > 0 && (
                      <div className="text-xs text-primary mt-1">
                        {comment._count.replies} respuestas
                      </div>
                    )}
                    {comment.parentId && (
                      <div className="text-xs text-gray-500 mt-1">
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
                    <div className="text-xs text-gray-500 mt-1 truncate max-w-xs">
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
                          <div className="text-sm font-medium text-gray-900">
                            {comment.user.name || "Usuario sin nombre"}
                          </div>
                          <div className="text-xs text-gray-500">{comment.user.email}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Usuario eliminado</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), { locale: es, addSuffix: true })}
                    </div>
                    {comment.updatedAt > comment.createdAt && (
                      <div className="text-xs text-gray-500 mt-1">
                        Editado {formatDistanceToNow(new Date(comment.updatedAt), { locale: es, addSuffix: true })}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Link
                        href={`/admin/comments/view/${comment.id}`}
                        className="text-blue-600 hover:text-blue-800 transition-colors duration-200 mr-2"
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
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay comentarios</h3>
          <p className="mt-1 text-sm text-gray-500">No se encontraron comentarios en el sistema.</p>
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
