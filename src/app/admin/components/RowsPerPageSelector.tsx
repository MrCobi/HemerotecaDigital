"use client";

import React from "react";

type RowsPerPageSelectorProps = {
  rowsPerPage: number;
  onRowsPerPageChange: (rows: number) => void;
  options?: number[];
};

export default function RowsPerPageSelector({
  rowsPerPage,
  onRowsPerPageChange,
  options = [10, 20, 50, 100]
}: RowsPerPageSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="rows-per-page" className="text-sm text-muted-foreground whitespace-nowrap">
        Filas por página:
      </label>
      <select
        id="rows-per-page"
        value={rowsPerPage}
        onChange={(e) => onRowsPerPageChange(Number(e.target.value))}
        className="block w-20 rounded-md border-gray-300 bg-card text-foreground py-1 px-2 text-sm focus:border-primary focus:ring-primary"
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
