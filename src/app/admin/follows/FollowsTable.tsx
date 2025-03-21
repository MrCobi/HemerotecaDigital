"use client";

import Link from "next/link";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState, useMemo } from "react";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { Button } from "@/src/app/components/ui/button";
import { Trash2, User } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/src/app/components/ui/alert-dialog";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
};

type Follow = {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  follower: User;
  following: User;
};

type FollowsTableProps = {
  follows: Follow[];
};

export default function FollowsTable({ follows }: FollowsTableProps) {
  // Estado para paginación y filtrado
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [followToDelete, setFollowToDelete] = useState<string | null>(null);

  // Filtra las relaciones de seguimiento según los criterios seleccionados
  const filteredFollows = useMemo(() => {
    if (!filterValue) return follows;
    
    return follows.filter((follow) => {
      const lowercasedFilter = filterValue.toLowerCase();
      
      const followerNameMatch = follow.follower.name?.toLowerCase().includes(lowercasedFilter) || false;
      const followerEmailMatch = follow.follower.email?.toLowerCase().includes(lowercasedFilter) || false;
      
      const followingNameMatch = follow.following.name?.toLowerCase().includes(lowercasedFilter) || false;
      const followingEmailMatch = follow.following.email?.toLowerCase().includes(lowercasedFilter) || false;
      
      return followerNameMatch || followerEmailMatch || followingNameMatch || followingEmailMatch;
    });
  }, [follows, filterValue]);

  // Paginación
  const totalPages = Math.ceil(filteredFollows.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentFollows = filteredFollows.slice(startIndex, endIndex);

  const handleDelete = (id: string) => {
    // Implementar lógica de eliminación
    console.log(`Eliminar relación de seguimiento ${id}`);
    setIsDeleteDialogOpen(false);
    setFollowToDelete(null);
  };

  // Función para renderizar la imagen del usuario
  const renderUserImage = (user: User, size: number = 32) => {
    if (!user) return null;
    
    if (user?.image && user?.image.includes('cloudinary')) {
      return (
        <CldImage
          src={user.image}
          alt={user?.name || "Avatar"}
          width={size}
          height={size}
          crop="fill"
          gravity="face"
          className={`h-${size/4} w-${size/4} rounded-full object-cover`}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.src = "/images/AvatarPredeterminado.webp";
          }}
        />
      );
    } else if (user?.image && !user.image.startsWith('/') && !user.image.startsWith('http')) {
      return (
        <CldImage
          src={user.image}
          alt={user?.name || "Avatar"}
          width={size}
          height={size}
          crop="fill"
          gravity="face"
          className={`h-${size/4} w-${size/4} rounded-full object-cover`}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.src = "/images/AvatarPredeterminado.webp";
          }}
        />
      );
    } else {
      return (
        <Image
          src={user?.image || "/images/AvatarPredeterminado.webp"}
          alt={user?.name || "Avatar"}
          width={size}
          height={size}
          className={`h-${size/4} w-${size/4} rounded-full object-cover`}
          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
            const target = e.target as HTMLImageElement;
            target.src = "/images/AvatarPredeterminado.webp";
          }}
        />
      );
    }
  };

  const columns: Column<Follow>[] = useMemo(() => [
    {
      header: "Seguidor",
      accessorKey: "follower",
      cell: (follow: Follow) => {
        const { follower } = follow;
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 flex-shrink-0 mr-3">
              {renderUserImage(follower)}
            </div>
            <div>
              <Link
                href={`/admin/users/view/${follower.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
              >
                {follower.name || "Usuario sin nombre"}
              </Link>
              <div className="text-xs text-muted-foreground">{follower.email || "Sin correo"}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Sigue a",
      accessorKey: "following",
      cell: (follow: Follow) => {
        const { following } = follow;
        return (
          <div className="flex items-center">
            <div className="h-8 w-8 flex-shrink-0 mr-3">
              {renderUserImage(following)}
            </div>
            <div>
              <Link
                href={`/admin/users/view/${following.id}`}
                className="text-primary hover:text-primary/80 transition-colors text-sm font-medium"
              >
                {following.name || "Usuario sin nombre"}
              </Link>
              <div className="text-xs text-muted-foreground">{following.email || "Sin correo"}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Fecha",
      accessorKey: "createdAt",
      cell: (follow: Follow) => {
        const date = new Date(follow.createdAt);
        return (
          <div className="text-sm text-muted-foreground">
            {format(date, "dd/MM/yyyy")}
          </div>
        );
      },
    },
    {
      header: "Acciones",
      id: "actions",
      cell: (follow: Follow) => {
        return (
          <div className="flex justify-end space-x-2">
            <Link
              href={`/admin/users/view/${follow.followerId}`}
              className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-offset-background transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Ver seguidor
            </Link>
            <Link
              href={`/admin/users/view/${follow.followingId}`}
              className="inline-flex items-center rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary ring-offset-background transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <User className="h-3.5 w-3.5 mr-1" />
              Ver seguido
            </Link>
            <AlertDialog open={isDeleteDialogOpen && followToDelete === follow.id} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => setFollowToDelete(follow.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción eliminará la relación de seguimiento y no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setFollowToDelete(null)}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDelete(follow.id)}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
    },
  ], [isDeleteDialogOpen, followToDelete]);

  return (
    <div className="space-y-4">
      <DataTable<Follow>
        data={currentFollows}
        columns={columns}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        onFilterChange={setFilterValue}
        filterValue={filterValue}
        filterPlaceholder="Buscar por nombre o email..."
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        emptyMessage="No hay relaciones de seguimiento para mostrar"
      />
    </div>
  );
}
