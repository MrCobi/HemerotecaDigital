"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import { DataTable, Column } from "../components/DataTable";
import { ActivityItem } from ".";
import Link from "next/link";

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
        activity.userEmail?.toLowerCase().includes(filterValue.toLowerCase());

      const matchesType =
        !typeFilter ||
        (typeFilter === "comment" && activity.type === "comment") ||
        (typeFilter === "rating" && activity.type === "rating") ||
        (typeFilter === "favorite" && activity.type === "favorite");

      return matchesFilter && matchesType;
    });
  }, [activities, filterValue, typeFilter]);

  // Paginación
  const totalPages = Math.ceil(filteredActivities.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentActivities = filteredActivities.slice(startIndex, endIndex);

  // Columnas de la tabla
  const columns: Column<ActivityItem>[] = [
    {
      accessorKey: "type",
      header: "Tipo",
      cell: (activity: ActivityItem) => {
        let type = "";
        let className = "";

        switch (activity.type) {
          case 'comment':
            type = "Comentario";
            className = "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
            break;
          case 'rating':
            type = "Valoración";
            className = "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
            break;
          case 'favorite':
            type = "Favorito";
            className = "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
            break;
          default:
            type = "Desconocido";
            className = "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
        }

        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>
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
          <option value="all">Todos</option>
          <option value="comment">Comentarios</option>
          <option value="rating">Valoraciones</option>
          <option value="favorite">Favoritos</option>
        </select>
      )
    },
    {
      accessorKey: "user",
      header: "Usuario",
      cell: (activity: ActivityItem) => (
        <div className="flex items-center">
          <div className="h-8 w-8 flex-shrink-0 rounded-full bg-muted flex items-center justify-center mr-3">
            {activity.userImage ? (
              <img
                className="h-8 w-8 rounded-full"
                src={activity.userImage}
                alt={activity.userName || ""}
              />
            ) : (
              <span className="text-muted-foreground text-sm font-medium">
                {(activity.userName || activity.userEmail?.charAt(0))?.toUpperCase() || "?"}
              </span>
            )}
          </div>
          <div>
            <div className="font-medium text-foreground">{activity.userName || "Usuario"}</div>
            <div className="text-sm text-muted-foreground">{activity.userEmail || "Sin correo"}</div>
          </div>
        </div>
      )
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
            href={`/admin/sources/${sourceId}`}
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
  ];

  return (
    <DataTable
      data={currentActivities}
      columns={columns}
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={setCurrentPage}
      onFilterChange={setFilterValue}
      filterValue={filterValue}
      filterPlaceholder="Buscar por usuario..."
      rowsPerPage={rowsPerPage}
      onRowsPerPageChange={setRowsPerPage}
      emptyMessage="No se encontraron actividades"
    />
  );
}
