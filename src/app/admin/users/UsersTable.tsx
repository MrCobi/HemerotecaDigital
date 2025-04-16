"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { DataTable, Column } from "../components/DataTable";
import { buttonVariants } from "@/src/app/components/ui/button";
import { Trash2, Edit, User, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";
import Image from "next/image";
import { CldImage } from "next-cloudinary";

interface DeleteUserDialogProps {
  userId: string;
  userName: string | null;
  onDelete: () => Promise<void>;
}

function DeleteUserDialog({ userId, userName, onDelete }: DeleteUserDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  async function handleDelete() {
    try {
      setIsDeleting(true);
      await onDelete();
      setIsOpen(false);
      toast.success("Usuario eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      toast.error("Error al eliminar usuario");
    } finally {
      setIsDeleting(false);
    }
  }
  
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <button
          className="inline-flex items-center justify-center h-7 py-0.5 px-1.5 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors"
          title="Eliminar usuario"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="ml-1 text-xs truncate">Borrar</span>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Eliminar usuario
          </AlertDialogTitle>
          <AlertDialogDescription>
            ¿Estás seguro de que deseas eliminar al usuario <span className="font-semibold">{userName || userId}</span>?
          </AlertDialogDescription>
          <p className="text-destructive font-medium text-sm mt-2">
            Esta acción no se puede deshacer y eliminará toda la información asociada a este usuario.
          </p>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={isDeleting}
            className={buttonVariants({ variant: "destructive" })}
          >
            {isDeleting ? (
              <>
                <span className="animate-pulse">Eliminando...</span>
              </>
            ) : (
              "Eliminar usuario"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export type Role = "ADMIN"  | "USER";

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: Role;
  createdAt: Date;
  emailVerified: Date | null;
  username?: string;
}

type UsersTableProps = {
  users: User[];
};

export default function UsersTable({ users }: UsersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | null>(null);
  const [localUsers, setLocalUsers] = useState<User[]>(users);

  useMemo(() => {
    setLocalUsers(users);
  }, [users]);

  const handleRoleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as Role | "all";
    setRoleFilter(value === "all" ? null : value);
    setCurrentPage(1);
  };

  const filteredUsers = useMemo(() => {
    if (!filterValue && roleFilter === null) return localUsers;

    return localUsers.filter((user) => {
      const matchesFilter =
        !filterValue ||
        user.name?.toLowerCase().includes(filterValue.toLowerCase()) ||
        user.email.toLowerCase().includes(filterValue.toLowerCase());

      const matchesRole =
        !roleFilter ||
        user.role === roleFilter;

      return matchesFilter && matchesRole;
    });
  }, [localUsers, filterValue, roleFilter]);

  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const handleDeleteUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error desconocido');
      }
      
      setLocalUsers(prev => prev.filter(user => user.id !== userId));
      
      toast.success("Usuario eliminado correctamente");
      
      if (paginatedUsers.length === 1 && currentPage > 1) {
        setCurrentPage(prev => prev - 1);
      }
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      toast.error("Error al eliminar el usuario");
    }
  };

  const columns: Column<User>[] = [
    {
      accessorKey: "user",
      header: "Usuario",
      className: "w-[25%]",
      cell: (user: User) => (
        <div className="flex items-center space-x-2 max-w-full overflow-hidden">
          <div className="flex-shrink-0">
            {user.image ? (
              user.image.includes('cloudinary') ? (
                <CldImage
                  src={(() => {
                    let publicId = user.image;
                    if (user.image.includes('cloudinary.com')) {
                      const match = user.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                      if (match && match[1]) {
                        publicId = `hemeroteca_digital/${match[1]}`;
                      } else {
                        publicId = user.image.replace(/.*\/v\d+\//, '').split('?')[0];
                      }
                    }
                    if (publicId.includes('https://')) {
                      publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                    }
                    return publicId;
                  })()}
                  alt={user.name || "Avatar"}
                  width={32}
                  height={32}
                  crop="fill"
                  gravity="face"
                  quality="auto"
                  format="auto"
                  effects={[{ improve: true }, { sharpen: "100" }]}
                  className="rounded-full object-cover"
                  priority
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : (
                <Image
                  src={user.image}
                  alt={user.name || "Avatar"}
                  width={32}
                  height={32}
                  className="rounded-full object-cover"
                  priority
                  onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              )
            ) : (
              <Image
                src="/images/AvatarPredeterminado.webp"
                alt={user.name || "Avatar"}
                width={32}
                height={32}
                className="rounded-full object-cover"
                priority
              />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-medium text-foreground text-sm truncate">{user.name}</div>
            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
          </div>
        </div>
      )
    },
    {
      accessorKey: "role",
      header: "Rol",
      className: "w-[15%]",
      cell: (user: User) => {
        let roleLabel, className;

        switch (user.role) {
          case "ADMIN":
            roleLabel = "Administrador";
            className = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
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
          <option value="ADMIN">Administradores</option>
        </select>
      )
    },
    {
      accessorKey: "emailVerified",
      header: "Estado",
      className: "w-[15%]",
      cell: (user: User) => (
        <div className="flex items-center">
          <div
            className={`w-2 h-2 rounded-full mr-2 ${user.emailVerified
                ? "bg-green-500"
                : "bg-amber-500"
              }`}
          ></div>
          <span className="text-xs">
            {user.emailVerified ? "Verificado" : "Pendiente"}
          </span>
        </div>
      )
    },
    {
      accessorKey: "createdAt",
      header: "Registro",
      className: "w-[20%]",
      cell: (user: User) => {
        const date = new Date(user.createdAt);
        return (
          <div className="text-xs text-muted-foreground whitespace-nowrap">
            {format(date, "dd MMM yyyy")}
          </div>
        );
      }
    },
    {
      accessorKey: "actions",
      header: "Acciones",
      className: "w-[25%]",
      cell: (user: User) => (
        <div className="flex items-center justify-start gap-2">
          <Link 
            href={`/admin/users/view/${user.id}`}
            className="inline-flex items-center justify-center h-7 py-0.5 px-2 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors"
            title="Ver perfil"
          >
            <User className="h-3.5 w-3.5" />
            <span className="ml-1 text-xs truncate">Perfil</span>
          </Link>
          <Link 
            href={`/admin/users/edit/${user.id}`}
            className="inline-flex items-center justify-center h-7 py-0.5 px-2 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800/40 transition-colors"
            title="Editar usuario"
          >
            <Edit className="h-3.5 w-3.5" />
            <span className="ml-1 text-xs truncate">Editar</span>
          </Link>
          <DeleteUserDialog
            userId={user.id}
            userName={user.name}
            onDelete={() => handleDeleteUser(user.id)}
          />
        </div>
      )
    }
  ];

  return (
    <div className="overflow-hidden">
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
        className="w-full"
      />
    </div>
  );
}
