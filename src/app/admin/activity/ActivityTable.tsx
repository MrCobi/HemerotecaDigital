"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import DataTable, { Column } from "../components/DataTable/DataTable";
import { ActivityItem } from "./types";
import {
  MessageSquare, 
  Star, 
  Heart, 
  LogIn, 
  UserPlus, 
  UserMinus, 
  StarOff, 
  MessageSquareX,
  ReplyIcon
} from "lucide-react";

type ActivityTableProps = {
  activities: ActivityItem[];
};

export default function ActivityTable({ activities }: ActivityTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

  const handleTypeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTypeFilter(value === "all" ? null : value);
    setCurrentPage(1);
  };

  const filteredActivities = useMemo(() => {
    if (!filterValue && typeFilter === null) return activities;

    return activities.filter((activity) => {
      const matchesFilter =
        !filterValue ||
        activity.userName?.toLowerCase().includes(filterValue.toLowerCase()) ||
        activity.userEmail?.toLowerCase().includes(filterValue.toLowerCase()) ||
        activity.targetName?.toLowerCase().includes(filterValue.toLowerCase());

      const matchesType =
        !typeFilter ||
        activity.type === typeFilter;

      return matchesFilter && matchesType;
    });
  }, [activities, filterValue, typeFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredActivities.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  // Columnas de la tabla
  const columns: Column<ActivityItem>[] = useMemo(() => [
    {
      accessorKey: "type",
      header: "Tipo",
      cell: (activity: ActivityItem) => {
        let type = "";
        let className = "";
        let Icon = null;

        switch (activity.type) {
          case 'comment':
            type = "Comentario";
            className = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            Icon = MessageSquare;
            break;
          case 'comment_reply':
            type = "Respuesta";
            className = "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300";
            Icon = ReplyIcon;
            break;
          case 'comment_deleted':
            type = "Comentario eliminado";
            className = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
            Icon = MessageSquareX;
            break;
          case 'rating':
          case 'rating_added':
            type = "Valoración";
            className = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
            Icon = Star;
            break;
          case 'rating_removed':
            type = "Valoración eliminada";
            className = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
            Icon = StarOff;
            break;
          case 'favorite':
            type = "Favorito";
            className = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
            Icon = Heart;
            break;
          case 'favorite_removed':
            type = "Favorito eliminado";
            className = "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300";
            Icon = Heart;
            break;
          case 'login':
            type = "Inicio de sesión";
            className = "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
            Icon = LogIn;
            break;
          case 'follow':
            type = "Seguimiento";
            className = "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300";
            Icon = UserPlus;
            break;
          case 'unfollow':
            type = "Dejar de seguir";
            className = "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300";
            Icon = UserMinus;
            break;
          default:
            type = "Desconocido";
            className = "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
        }

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className} flex items-center`}>
            {Icon && <Icon className="h-3 w-3 mr-1" />}
            {type}
          </span>
        );
      },
      filterElement: (
        <select
          className="block w-full rounded-md border border-input bg-background text-foreground py-1.5 px-3 text-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
          value={typeFilter || "all"}
          onChange={handleTypeFilterChange}
        >
          <option value="all">Todos los tipos</option>
          <option value="comment">Comentarios</option>
          <option value="comment_reply">Respuestas</option>
          <option value="comment_deleted">Comentarios eliminados</option>
          <option value="rating_added">Valoraciones</option>
          <option value="rating_removed">Valoraciones eliminadas</option>
          <option value="favorite">Favoritos</option>
          <option value="favorite_removed">Favoritos eliminados</option>
          <option value="login">Inicios de sesión</option>
          <option value="follow">Seguimientos</option>
          <option value="unfollow">Dejar de seguir</option>
        </select>
      ),
    },
    {
      accessorKey: "user",
      header: "Usuario",
      cell: (activity: ActivityItem) => {
        const user = {
          name: activity.userName,
          email: activity.userEmail,
          image: activity.userImage
        };

        return (
          <div className="flex items-center">
            <div className="flex-shrink-0 h-8 w-8">
              {user?.image && user?.image.includes('cloudinary') ? (
                <CldImage
                  src={user.image}
                  alt={user?.name || "Avatar"}
                  width={32}
                  height={32}
                  crop="fill"
                  gravity="face"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : user?.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
                <CldImage
                  src={user.image}
                  alt={user?.name || "Avatar"}
                  width={32}
                  height={32}
                  crop="fill"
                  gravity="face"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : (
                <Image
                  src={user?.image || "/images/AvatarPredeterminado.webp"}
                  alt={user?.name || "Avatar"}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover"
                  onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              )}
            </div>
            <div className="ml-3">
              <div className="text-sm font-medium text-foreground">
                {user.name || "Usuario sin nombre"}
              </div>
              <div className="text-xs text-muted-foreground">{user.email || "Sin correo"}</div>
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: "source",
      header: "Fuente",
      cell: (activity: ActivityItem) => {
        let sourceId = "";
        let sourceName = "";

        if (activity.targetId && activity.targetName) {
          sourceId = activity.targetId;
          sourceName = activity.targetName;
        }

        return sourceId ? (
          <Link
            href={`/admin/sources/view/${sourceId}`}
            className="text-primary hover:text-primary/80 transition-colors"
          >
            {sourceName}
          </Link>
        ) : (
          <span className="text-muted-foreground">N/A</span>
        );
      }
    },
    {
      accessorKey: "details",
      header: "Detalles",
      cell: (activity: ActivityItem) => {
        if (activity.details) {
          return (
            <div className="max-w-md">
              <p className="text-sm text-foreground truncate">{activity.details}</p>
            </div>
          );
        } else {
          return (
            <span className="text-foreground">
              Sin detalles
            </span>
          );
        }
      }
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: (activity: ActivityItem) => {
        const date = new Date(activity.createdAt);
        return (
          <div className="text-sm text-muted-foreground">
            {format(date, "dd MMM yyyy")}
          </div>
        );
      }
    }
  ], [typeFilter]);

  return (
    <DataTable<ActivityItem>
      data={currentActivities}
      columns={columns}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      onFilterChange={setFilterValue}
      filterValue={filterValue}
      filterPlaceholder="Buscar por usuario o fuente..."
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={setRowsPerPage}
      emptyMessage="No se encontraron actividades"
    />
  );
}
