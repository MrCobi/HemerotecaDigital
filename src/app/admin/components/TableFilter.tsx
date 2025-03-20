"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

type TableFilterProps = {
  onFilterChange: (filter: string) => void;
  placeholder?: string;
  className?: string;
  value?: string;
};

export default function TableFilter({ 
  onFilterChange, 
  placeholder = "Buscar...", 
  className,
  value: externalValue,
}: TableFilterProps) {
  const [filterValue, setFilterValue] = useState(externalValue || "");

  // Sincronizar el estado interno cuando cambia el valor externo
  useEffect(() => {
    if (externalValue !== undefined) {
      setFilterValue(externalValue);
    }
  }, [externalValue]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilterValue(value);
    onFilterChange(value);
  };

  const handleClear = () => {
    setFilterValue("");
    onFilterChange("");
  };

  return (
    <div className={cn("relative", className)}>
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className="h-5 w-5 text-muted-foreground" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
      <input
        type="text"
        value={filterValue}
        onChange={handleChange}
        className="block w-full rounded-md border border-input bg-background py-2 pl-10 pr-10 text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm transition-colors"
        placeholder={placeholder}
      />
      {filterValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Limpiar filtro"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>
      )}
    </div>
  );
}
