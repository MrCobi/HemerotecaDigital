"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import TableFilter from "../TableFilter";
import RowsPerPageSelector from "../RowsPerPageSelector";
import Pagination from "../Pagination";
import EmptyTable from "./EmptyTable";

export type Column<T> = {
  accessorKey?: string;
  header: string | React.ReactNode;
  cell: (item: T) => React.ReactNode;
  className?: string;
  filterElement?: React.ReactNode;
};

export type DataTableProps<T> = {
  data: T[];
  columns: Column<T>[];
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onFilterChange: (filter: string) => void;
  filterValue?: string;
  filterPlaceholder?: string;
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  emptyMessage?: string;
  className?: string;
  onRowClick?: (item: T) => void;
};

export default function DataTable<T>({
  data,
  columns,
  currentPage,
  totalPages,
  onPageChange,
  onFilterChange,
  filterValue = "",
  filterPlaceholder = "Buscar...",
  rowsPerPage,
  onRowsPerPageChange,
  emptyMessage = "No hay datos para mostrar",
  className,
  onRowClick
}: DataTableProps<T>) {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({});

  const toggleRowExpand = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const renderMobileRow = (item: T, index: number) => {
    const isExpanded = expandedRows[index] || false;

    return (
      <div key={index} className="block md:hidden">
        <div 
          className={cn(
            "p-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors bg-transparent",
            onRowClick && "cursor-pointer"
          )}
          onClick={() => onRowClick?.(item)}
        >
          <div className="flex justify-between items-center mb-2">
            {/* Primera columna como principal */}
            <div className="font-medium">{columns[0].cell(item)}</div>
            
            <button
              type="button"
              className="ml-2 p-1 rounded-full hover:bg-muted transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                toggleRowExpand(index);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {/* Segunda columna siempre visible */}
          {columns.length > 1 && (
            <div className="text-sm text-muted-foreground mb-2">
              {columns[1].cell(item)}
            </div>
          )}
          
          {/* Columnas expandidas */}
          {isExpanded && columns.slice(2).map((column, colIndex) => (
            <div key={colIndex} className="mt-3 pt-3 border-t border-border">
              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                {typeof column.header === "string" ? column.header : `Columna ${colIndex + 3}`}
              </div>
              <div>{column.cell(item)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn("bg-card dark:bg-background rounded-md shadow-sm", className)}>
      <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card dark:bg-transparent">
        <div className="w-full sm:w-64">
          <TableFilter 
            onFilterChange={onFilterChange} 
            placeholder={filterPlaceholder}
            value={filterValue}
          />
        </div>
        
        {/* Elementos de filtro adicionales de las columnas */}
        <div className="flex flex-wrap gap-4">
          {columns
            .filter(column => column.filterElement)
            .map((column, index) => (
              <div key={index}>
                {column.filterElement}
              </div>
            ))
          }
        </div>
        
        <RowsPerPageSelector 
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={onRowsPerPageChange}
        />
      </div>
      
      {data.length > 0 ? (
        <>
          {/* Tabla para pantallas medianas y grandes */}
          <div className="w-full hidden md:block">
            <table className="w-full table-fixed bg-transparent">
              <thead className="bg-muted/30">
                <tr>
                  {columns.map((column, index) => (
                    <th
                      key={index}
                      className={cn(
                        "px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider",
                        column.className
                      )}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-transparent divide-y divide-border">
                {data.map((item, rowIndex) => (
                  <tr 
                    key={rowIndex} 
                    className={cn(
                      "hover:bg-muted/50 transition-colors",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {columns.map((column, colIndex) => (
                      <td
                        key={colIndex}
                        className={cn(
                          "px-6 py-4 break-words",
                          column.className
                        )}
                      >
                        {column.cell(item)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Vista para móviles */}
          <div className="md:hidden">
            {data.map((item, index) => renderMobileRow(item, index))}
          </div>
          
          <div className="border-t border-border bg-transparent">
            <Pagination 
              currentPage={currentPage} 
              totalPages={totalPages} 
              onPageChange={onPageChange} 
            />
          </div>
        </>
      ) : (
        <div className="p-4">
          <EmptyTable message={emptyMessage} />
        </div>
      )}
    </div>
  );
}
