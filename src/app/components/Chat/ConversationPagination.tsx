import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/src/app/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ConversationPaginationProps {
  totalItems?: number;
  itemsPerPage?: number;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  loading?: boolean;
  loadingPage?: boolean;
}

/**
 * Componente para manejar la paginación en la lista de conversaciones
 * Muestra controles de paginación con números de página
 */
const ConversationPagination: React.FC<ConversationPaginationProps> = ({
  totalItems = 0,
  itemsPerPage = 5,
  currentPage = 1,
  totalPages: propsTotalPages,
  onPageChange = () => {},
  loading = false,
  loadingPage = false
}) => {
  // Calcular el número total de páginas si no se proporciona
  const totalPages = propsTotalPages || Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Mantener la página real que el usuario seleccionó, independientemente de las props
  // Esta es la clave de la solución: NO sincronizar con las props una vez inicializado
  const [actualPage, setActualPage] = useState(currentPage);
  
  // Solo inicializar la página actual una vez al montar el componente
  const isInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!isInitializedRef.current) {
      setActualPage(currentPage);
      isInitializedRef.current = true;
    }
  }, [currentPage]);
  
  // Para depuración
  useEffect(() => {
    console.log(`ConversationPagination [DESACOPLADO]: página=${actualPage}, prop=${currentPage}, totalPages=${totalPages}`);
  }, [actualPage, currentPage, totalPages]);
  
  // Función para cambiar de página sin sincronización con props
  const handlePageChange = (page: number) => {
    if (!(loading || loadingPage) && page !== actualPage && page >= 1 && page <= totalPages) {
      console.log(`ConversationPagination [DESACOPLADO]: Usuario cambia a página ${page} desde ${actualPage}`);
      
      // Actualizar estado local inmediatamente para UI responsiva
      setActualPage(page);
      
      // Llamar al callback para que los datos se actualicen (sin esperar sincronización)
      onPageChange(page);
    }
  };
  
  // Calcular qué páginas mostrar (mostrar siempre 5 páginas si es posible)
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;
    
    // Si hay menos de 5 páginas en total, mostrarlas todas
    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Si hay más de 5 páginas, mostrar un rango centrado alrededor de la página actual
      let startPage = Math.max(actualPage - Math.floor(maxPagesToShow / 2), 1);
      const endPage = Math.min(startPage + maxPagesToShow - 1, totalPages);
      
      // Ajustar la página inicial si estamos cerca del final
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(endPage - maxPagesToShow + 1, 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  };
  
  // No mostrar paginación si solo hay una página
  if (totalPages <= 1) {
    return null;
  }
  
  // Obtener los números de página a mostrar
  const pageNumbers = getPageNumbers();
  
  return (
    <div className="w-full py-2 border-t border-gray-100 dark:border-gray-800">
      {/* Indicador de paginación */}
      <div className="p-2 text-xs text-center text-gray-500 dark:text-gray-400">
        Página {actualPage} de {totalPages} (Total: {totalItems} conversaciones)
      </div>
      
      {/* Controles de paginación */}
      <div className="flex justify-center items-center space-x-2 py-2">
        {/* Botón "Anterior" */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handlePageChange(actualPage - 1)}
          disabled={loading || loadingPage || actualPage === 1}
          className="px-3 py-1 h-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        {/* Números de página */}
        {pageNumbers.map(page => {
          // El botón de la página actual debe tener un estilo diferente
          const isCurrentPage = page === actualPage;
          
          return (
            <Button
              key={page}
              variant={isCurrentPage ? "default" : "outline"}
              size="sm"
              onClick={() => handlePageChange(page)}
              disabled={loading || loadingPage}
              className={`px-3 py-1 h-8 ${isCurrentPage ? 'bg-blue-600 text-white' : ''}`}
            >
              {page}
            </Button>
          );
        })}
        
        {/* Botón "Siguiente" */}
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => handlePageChange(actualPage + 1)}
          disabled={loading || loadingPage || actualPage === totalPages}
          className="px-3 py-1 h-8"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default ConversationPagination;
