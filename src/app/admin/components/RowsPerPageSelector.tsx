"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type RowsPerPageSelectorProps = {
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  options?: number[];
  className?: string;
};

export default function RowsPerPageSelector({
  rowsPerPage,
  onRowsPerPageChange,
  options = [10, 20, 50, 100],
  className
}: RowsPerPageSelectorProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <label htmlFor="rows-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
        Filas por página:
      </label>
      <select
        id="rows-per-page"
        value={rowsPerPage}
        onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
        className="block rounded-md border border-input bg-background text-foreground py-1.5 px-3 text-sm shadow-sm focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
