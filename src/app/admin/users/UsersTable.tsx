"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { DataTable, Column } from "../components/DataTable";
import { Button, buttonVariants } from "@/src/app/components/ui/button";
import { Trash2, Edit, User, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
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
import { CldImage } from "next-cloudinary";
import Image from "next/image";

// Componente para el diálogo de confirmación de eliminación
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
        <Button
          variant="destructive"
          size="icon"
          className="h-8 w-8"
          title="Eliminar usuario"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
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
            onClick={(e: any) => {
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
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error desconocido');
      }
      
      // Recargar la página para actualizar la lista
      router.refresh();
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      throw error;
    }
  };

  const columns: Column<User>[] = [
    {
      accessorKey: "user",
      header: "Usuario",
      cell: (user: User) => (
        <div className="flex items-center">
          <div className="h-10 w-10 flex-shrink-0 rounded-full bg-muted flex items-center justify-center mr-3">
            {user.image && user.image.includes('cloudinary') ? (
              // Si la imagen tiene un formato de Cloudinary público (URL completa)
              <CldImage
                src={user.image}
                alt={user.name || "Avatar"}
                width={40}
                height={40}
                crop="fill"
                gravity="face"
                className="h-10 w-10 rounded-full object-cover"
                priority
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            ) : user.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
              // Si la imagen es un public_id de Cloudinary (sin https:// o /)
              <CldImage
                src={user.image}
                alt={user.name || "Avatar"}
                width={40}
                height={40}
                crop="fill"
                gravity="face"
                className="h-10 w-10 rounded-full object-cover"
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
            ) : (
              // Para imágenes locales o fallback
              <Image
                src={user.image || "/images/AvatarPredeterminado.webp"}
                alt={user.name || "Avatar"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover"
                priority
                onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = "/images/AvatarPredeterminado.webp";
                }}
              />
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
