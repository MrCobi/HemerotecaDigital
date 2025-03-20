"use client";

import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import Link from "next/link";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
  createdAt: Date;
  emailVerified: Date | null;
  _count?: {
    sources: number;
    comments: number;
    ratings: number;
    favoriteSources: number;
    sentMessages: number;
    receivedMessages: number;
  };
};

type UsersTableProps = {
  users: User[];
};

export default function UsersTable({ users }: UsersTableProps) {
  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación de usuario
    console.log(`Eliminar usuario ${id}`);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="overflow-x-auto">
      {users.length > 0 ? (
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
                  Rol
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Actividad
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fecha Registro
                </th>
                <th scope="col" className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
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
                        <div className="text-sm font-medium text-gray-900">
                          {user.name || "Usuario sin nombre"}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
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
                      <div className="flex flex-col text-sm text-gray-500">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <div>
                            <span className="font-medium">{user._count.sources || 0}</span> fuentes
                          </div>
                          <div>
                            <span className="font-medium">{user._count.comments || 0}</span> comentarios
                          </div>
                          <div>
                            <span className="font-medium">{user._count.ratings || 0}</span> valoraciones
                          </div>
                          <div>
                            <span className="font-medium">{user._count.favoriteSources || 0}</span> favoritos
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">Sin actividad</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
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
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
          <p className="mt-1 text-sm text-gray-500">No se encontraron usuarios en el sistema.</p>
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
