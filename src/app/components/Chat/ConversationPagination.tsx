import React from 'react';
import { Button } from '@/src/app/components/ui/button';
import { ChevronDown } from 'lucide-react';
import LoadingSpinner from '@/src/app/components/ui/LoadingSpinner';

interface ConversationPaginationProps {
  hasMore: boolean;
  loading: boolean;
  totalItems: number;
  currentCount: number;
  onLoadMore: () => void;
}

/**
 * Componente para manejar la paginación en la lista de conversaciones
 * Muestra un botón "Cargar más" y la información de paginación
 */
const ConversationPagination: React.FC<ConversationPaginationProps> = ({
  hasMore,
  loading,
  totalItems,
  currentCount,
  onLoadMore
}) => {
  return (
    <div className="w-full">
      {/* Botón de cargar más */}
      {hasMore && (
        <div className="p-3 flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLoadMore}
            disabled={loading}
            className="w-full flex items-center justify-center text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
          >
            {loading ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <span>Cargar más</span>
                <ChevronDown className="ml-1 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      )}
      
      {/* Indicador de paginación */}
      {currentCount > 0 && totalItems > 0 && (
        <div className="p-2 text-xs text-center text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
          Mostrando {currentCount} de {totalItems} conversaciones
        </div>
      )}
    </div>
  );
};

export default ConversationPagination;
