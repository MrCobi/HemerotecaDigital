import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyTableProps {
  message?: string;
  icon?: React.ReactNode;
  className?: string;
}

export default function EmptyTable({
  message = "No se encontraron datos",
  icon,
  className,
}: EmptyTableProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 border border-dashed rounded-md text-center",
        "bg-background/50 border-border",
        className
      )}
    >
      {icon || (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-12 w-12 text-muted-foreground mb-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      )}
      <p className="text-foreground font-medium text-lg">{message}</p>
      <p className="text-muted-foreground text-sm mt-1">
        Intenta ajustar los filtros o añade nuevos datos
      </p>
    </div>
  );
}

