"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { DataTable, Column } from "../components/DataTable";
import { Button, buttonVariants } from "@/src/app/components/ui/button";
import { Trash2, Edit, User } from "lucide-react";
import { useRouter } from "next/navigation";

// Definimos el tipo Role explícitamente
export type Role = "ADMIN" | "EDITOR" | "USER";

// Definimos el tipo User manualmente ya que tenemos problemas con la importación de Prisma
export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  createdAt: Date;
  emailVerified: Date | null;
  username?: string; // Añadimos username para poder redirigir al perfil del usuario
}

type UsersTableProps = {
  users: User[];
};

export default function UsersTable({ users }: UsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | null>(null);
  const router = useRouter();

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Role | "all";
    setRoleFilter(value === "all" ? null : value);
    setCurrentPage(1);
  };

  const filteredUsers = useMemo(() => {
    if (!filterValue && roleFilter === null) return users;

    return users.filter((user) => {
      const matchesFilter =
        !filterValue ||
        user.name?.toLowerCase().includes(filterValue.toLowerCase()) ||
        user.email.toLowerCase().includes(filterValue.toLowerCase());

      const matchesRole =
        !roleFilter ||
        user.role === roleFilter;

      return matchesFilter && matchesRole;
    });
  }, [users, filterValue, roleFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // Función para manejar la eliminación de un usuario
  const handleDeleteUser = async (userId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.")) {
      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'DELETE',
        });
        
        if (response.ok) {
          alert("Usuario eliminado correctamente");
          // Recargar la página para actualizar la lista
          router.refresh();
        } else {
          const data = await response.json();
          alert(`Error al eliminar usuario: ${data.error || 'Error desconocido'}`);
        }
      } catch (error) {
        console.error("Error al eliminar usuario:", error);
        alert("Error al eliminar usuario. Consulta la consola para más detalles.");
      }
    }
  };

  const columns: Column<User>[] = [
    {
      accessorKey: "user",
      header: "Usuario",
      cell: (user: User) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted flex items-center justify-center mr-3">
            {user.image ? (
              <img
                className="h-10 w-10 rounded-full"
                src={user.image}
                alt={user.name || ""}
              />
            ) : (
              <span className="text-muted-foreground text-sm font-medium">
                {(user.name || user.email.charAt(0)).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-foreground">{user.name}</div>
            <div className="text-sm text-muted-foreground">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: "role",
      header: "Rol",
      cell: (user: User) => {
        let roleLabel, className;

        switch (user.role) {
          case "ADMIN":
            roleLabel = "Administrador";
            className = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
            break;
          case "EDITOR":
            roleLabel = "Editor";
            className = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            break;
          case "USER":
          default:
            roleLabel = "Usuario";
            className = "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
        }

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
            {roleLabel}
          </span>
        );
      },
      filterElement: (
        <select
          className="block w-full rounded-md border border-input bg-background text-foreground py-1.5 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          value={roleFilter || "all"}
          onChange={handleRoleFilterChange}
        >
          <option value="all">Todos</option>
          <option value="USER">Usuarios</option>
          <option value="EDITOR">Editores</option>
          <option value="ADMIN">Administradores</option>
        </select>
      )
    },
    {
      accessorKey: "emailVerified",
      header: "Estado",
      cell: (user: User) => (
        <div className="flex items-center">
          <div
            className={`w-2.5 h-2.5 rounded-full mr-2 ${user.emailVerified
                ? "bg-green-500"
                : "bg-amber-500"
              }`}
          ></div>
          <span className="text-sm">
            {user.emailVerified ? "Verificado" : "Pendiente"}
          </span>
        </div>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Registro",
      cell: (user: User) => {
        const date = new Date(user.createdAt);
        return (
          <div className="text-sm text-muted-foreground">
            {format(date, "dd MMM yyyy")}
          </div>
        );
      }
    },
    {
      accessorKey: "actions",
      header: "Acciones",
      cell: (user: User) => (
        <div className="flex space-x-2">
          <Link
            href={`/admin/users/view/${user.id}`}
            className="inline-flex items-center text-primary hover:text-primary/80 font-medium transition-colors text-sm bg-primary/10 hover:bg-primary/20 px-2 py-1 rounded-md"
          >
            <User className="w-4 h-4 mr-1" />
            Perfil
          </Link>
          <Link
            href={`/admin/users/edit/${user.id}`}
            className="inline-flex items-center text-amber-600 hover:text-amber-700 font-medium transition-colors text-sm bg-amber-100 hover:bg-amber-200 px-2 py-1 rounded-md dark:bg-amber-900/30 dark:text-amber-300 dark:hover:bg-amber-800/50"
          >
            <Edit className="w-4 h-4 mr-1" />
            Editar
          </Link>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteUser(user.id);
            }}
            className="inline-flex items-center text-red-600 hover:text-red-700 font-medium transition-colors text-sm bg-red-100 hover:bg-red-200 px-2 py-1 rounded-md dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-800/50 text-sm"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
        </div>
      )
    }
  ];

  return (
    <DataTable
      data={paginatedUsers}
      columns={columns}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      onFilterChange={setFilterValue}
      filterValue={filterValue}
      filterPlaceholder="Buscar por nombre o email..."
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={setRowsPerPage}
      emptyMessage="No se encontraron usuarios"
    />
  );
}
