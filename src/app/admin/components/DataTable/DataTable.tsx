"use client";

import React, { useState, useEffect } from "react";
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
  hideOnMobile?: boolean;
  hideOnDesktop?: boolean;
  id?: string;
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
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleRowExpand = (index: number) => {
    setExpandedRows((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const _isMobileView = windowWidth < 768;
  const _isTabletView = windowWidth >= 768 && windowWidth < 1080;
  const _isSmallDesktopView = windowWidth >= 1080 && windowWidth < 1280;

  const getTabletVisibleColumns = () => {
    if (windowWidth < 850) return 3; 
    if (windowWidth < 950) return 4; 
    return 5; 
  };

  const _tabletVisibleColumns = getTabletVisibleColumns();

  const renderMobileRow = (item: T, index: number) => {
    const isExpanded = expandedRows[index] || false;

    const visibleColumns = columns.filter(col => !col.hideOnMobile);
    const hiddenColumns = columns.filter(col => col.hideOnMobile);

    return (
      <div key={index} className="block md:hidden">
        <div 
          className={cn(
            "p-4 border-b border-border hover:bg-muted/50 transition-colors bg-transparent",
            onRowClick && "cursor-pointer"
          )}
          onClick={onRowClick ? (e) => {
            if (e.defaultPrevented) return;
            onRowClick(item);
          } : undefined}
        >
          <div className="flex justify-between items-center mb-3">
            <div className="font-medium">{visibleColumns[0]?.cell(item) || columns[0].cell(item)}</div>
            
            <button
              type="button"
              className="ml-2 p-1 rounded-full hover:bg-muted transition-colors"
              onClick={(e) => {
                e.preventDefault();
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
          
          <div className="flex flex-col gap-2 mb-3">
            {visibleColumns.length > 1 && (
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  {typeof visibleColumns[1].header === "string" ? visibleColumns[1].header : "Rol"}:
                </div>
                <div>{visibleColumns[1].cell(item)}</div>
              </div>
            )}
          
            {visibleColumns.length > 2 && (
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  {typeof visibleColumns[2].header === "string" ? visibleColumns[2].header : "Estado"}:
                </div>
                <div>{visibleColumns[2].cell(item)}</div>
              </div>
            )}
            
            {visibleColumns.length > 3 && (
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-muted-foreground">
                  {typeof visibleColumns[3].header === "string" ? visibleColumns[3].header : "Registro"}:
                </div>
                <div>{visibleColumns[3].cell(item)}</div>
              </div>
            )}
          </div>
          
          {isExpanded && visibleColumns.length > 4 && (
            <div className="flex flex-row justify-center space-x-2 mt-3 pt-3 border-t border-border">
              {columns.find(col => col.header === "Acciones" || col.accessorKey === "actions")?.cell(item) || visibleColumns[4].cell(item)}
            </div>
          )}
          
          {isExpanded && hiddenColumns.length > 0 && (
            <div className="mt-3 pt-3 border-t border-border">
              {hiddenColumns
                .filter(col => col.header !== "Acciones" && col.accessorKey !== "actions")
                .map((column, colIndex) => (
                <div key={colIndex} className="mt-3 pt-3 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    {typeof column.header === "string" ? column.header : `Columna ${colIndex + 3}`}
                  </div>
                  <div>{column.cell(item)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderTabletRow = (item: T, index: number) => {
    const isExpanded = expandedRows[index] || false;
    
    return (
      <div 
        className={cn(
          "p-4 border-b border-border hover:bg-muted/50 transition-colors bg-transparent",
          onRowClick && "cursor-pointer"
        )}
        onClick={() => onRowClick?.(item)}
      >
        <div className="flex justify-between items-center mb-2">
          <div className="flex-1">
            {columns[0].cell(item)}
          </div>
          
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
        
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-2">
          {columns.slice(1, 4).map((column, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                {typeof column.header === "string" ? column.header : `Columna ${idx + 1}`}
              </div>
              <div>{column.cell(item)}</div>
            </div>
          ))}
        </div>
        
        {isExpanded && (
          <div className="flex flex-row justify-end space-x-2 mt-2 pt-3 border-t border-border">
            {columns.find(col => col.header === "Acciones" || col.accessorKey === "actions")?.cell(item) || columns[columns.length - 1].cell(item)}
          </div>
        )}
        
        {isExpanded && columns.length > 5 && (
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3">
            {columns.slice(5)
              .filter(col => col.header !== "Acciones" && col.accessorKey !== "actions")
              .map((column, colIndex) => (
                <div key={colIndex} className="flex flex-col">
                  <div className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    {typeof column.header === "string" ? column.header : `Columna ${colIndex + 5}`}
                  </div>
                  <div>{column.cell(item)}</div>
                </div>
              ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("bg-card dark:bg-background rounded-md shadow-sm", className)}>
      <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card dark:bg-transparent">
        <div className="w-full">
          <TableFilter 
            onFilterChange={onFilterChange} 
            placeholder={filterPlaceholder}
            value={filterValue}
          />
        </div>
        
        <div className="flex flex-wrap gap-4 w-full">
          {columns
            .filter(column => column.filterElement)
            .map((column, index) => (
              <div key={index} className="w-full sm:w-auto">
                {column.filterElement}
              </div>
            ))
          }
        </div>
        
        <div className="w-full sm:w-auto">
          <RowsPerPageSelector 
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={onRowsPerPageChange}
          />
        </div>
      </div>
      
      {data.length > 0 ? (
        <>
          <div className="rounded-md border hidden lg:block overflow-hidden">
            <div className="relative w-full overflow-x-auto">
              <table className="w-full table-fixed border-collapse">
                <thead>
                  <tr className="border-b border-border">
                    {columns.map((column, index) => (
                      <th
                        key={index}
                        className={cn(
                          "px-3 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide",
                          "whitespace-nowrap overflow-hidden text-ellipsis",
                          column.className
                        )}
                        style={{
                          minWidth: column.header === "Tipo" ? "80px" : 
                                   column.header === "Acciones" ? "120px" : 
                                   "100px"
                        }}
                      >
                        {column.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, rowIndex) => (
                    <tr 
                      key={rowIndex} 
                      className="border-b border-border hover:bg-muted/10"
                      onClick={() => onRowClick?.(item)}
                    >
                      {columns.map((column, colIndex) => (
                        <td
                          key={colIndex}
                          className={cn(
                            "px-3 py-3",
                            "overflow-hidden",
                            column.className,
                            column.hideOnDesktop ? "hidden xl:table-cell" : "",
                            column.header === "Tipo" && "w-[8%] min-w-[80px]",
                            column.header === "Nombre/Participantes" && "w-[25%] min-w-[200px]",
                            column.header === "Fuente" && "w-[20%] min-w-[150px]",
                            column.header === "Creador" && "w-[20%] min-w-[150px]",
                            column.header === "Mensajes" && "w-[12%] min-w-[100px]",
                            column.header === "Creado" && "w-[15%] min-w-[120px]",
                            column.header === "Acciones" && "w-[12%] min-w-[120px]"
                          )}
                        >
                          <div className="overflow-hidden text-ellipsis">
                            {column.cell(item)}
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="hidden md:block lg:hidden">
            {data.map((item, index) => (
              <div key={index}>
                {renderTabletRow(item, index)}
              </div>
            ))}
          </div>
          
          <div className="block md:hidden">
            {data.map((item, index) => renderMobileRow(item, index))}
          </div>
          
          <div className="border-t border-border bg-transparent p-2 sm:p-4">
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
