// src/app/admin/users/PaginationControls.tsx
'use client'

import { useRouter } from 'next/navigation'

export default function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalItems,
}: {
  currentPage: number
  totalPages: number
  pageSize: number
  totalItems: number
}) {
  const router = useRouter()

  const handlePageSizeChange = (newSize: string) => {
    router.push(`/admin/users?page=1&pageSize=${newSize}`)
  }

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/users?page=${newPage}&pageSize=${pageSize}`)
  }

  return (
    <div className="mt-5 flex flex-col items-center gap-4">
      <div className="flex items-center gap-2">
        <span>Mostrar:</span>
        <select
          value={pageSize}
          onChange={(e) => handlePageSizeChange(e.target.value)}
          className="border border-gray-300 rounded-sm px-2 py-1"
        >
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
          <option value="100">100</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="bg-blue-500 text-white px-4 py-2 rounded-sm hover:bg-blue-600 disabled:bg-gray-300"
        >
          Anterior
        </button>
        
        <span>
          Página {currentPage} de {totalPages}
        </span>
        
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="bg-blue-500 text-white px-4 py-2 rounded-sm hover:bg-blue-600 disabled:bg-gray-300"
        >
          Siguiente
        </button>
      </div>

      <div className="text-sm text-gray-600">
        Mostrando {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} de {totalItems} usuarios
      </div>
    </div>
  )
}