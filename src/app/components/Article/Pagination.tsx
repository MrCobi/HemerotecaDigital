import React from "react";

interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  // Determinar el rango de páginas a mostrar
  const maxVisiblePages = 10;
  const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
  const visiblePages = Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage + i
  );

  return (
    <div className="flex justify-center items-center space-x-2 mt-4">
    {/* Botón de página anterior */}
    <button
      disabled={currentPage === 1}
      onClick={() => onPageChange(currentPage - 1)}
      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-sm sm:text-base text-gray-800 dark:text-gray-200"
    >
      Anterior
    </button>

    {/* Números de página */}
{/* Paginación completa visible en pantallas grandes */}
<div className="hidden sm:flex space-x-2">
        {visiblePages.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-3 py-2 rounded text-sm sm:text-base ${
              page === currentPage
                ? "bg-blue-500 dark:bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      {/* Paginación compacta visible en pantallas pequeñas */}
      <div className="sm:hidden flex items-center space-x-2">
        <span className="text-sm sm:text-base text-gray-800 dark:text-gray-200">
          Página {currentPage} de {totalPages}
        </span>
      </div>

    {/* Botón de página siguiente */}
    <button
      disabled={currentPage === totalPages}
      onClick={() => onPageChange(currentPage + 1)}
      className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-sm sm:text-base text-gray-800 dark:text-gray-200"
    >
      Siguiente
    </button>
  </div>
);
}
