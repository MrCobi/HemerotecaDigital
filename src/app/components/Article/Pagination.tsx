import { useState, useEffect } from "react";
import { Button } from "@/src/app/components/ui/button";
import { motion } from "framer-motion";


interface Props {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: Props) {
  // Estado para controlar el ancho de la ventana para la responsividad
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [animationsEnabled, setAnimationsEnabled] = useState<boolean>(true);

  // Efecto para detectar y actualizar el ancho de la ventana
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    // Detectar preferencias de reducción de movimiento
    const prefersReducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setAnimationsEnabled(!prefersReducedMotion);

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }
  }, []);

  // Variantes de animación
  const animationVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };
  
  const animationTransition = {
    duration: 0.3,
    ease: [0.4, 0, 0.2, 1]
  };

  return (
    <motion.div 
      className="flex flex-col items-center space-y-4 mt-8 px-2"
      initial={animationVariants.hidden}
      animate={animationVariants.visible}
      transition={{ ...animationTransition, delay: 0.2 }}
    >
      <div className="inline-flex flex-nowrap items-center justify-center">
        {/* Primera página - Oculto en móviles */}
        <motion.div
          whileHover={animationsEnabled ? { scale: 1.05 } : {}}
          whileTap={animationsEnabled ? { scale: 0.95 } : {}}
          className="relative z-10 hidden sm:block mr-1"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="w-8 h-8 sm:w-10 sm:h-10 p-0 relative dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
          >
            <span className="text-xs sm:text-sm font-bold">&lt;&lt;</span>
          </Button>
        </motion.div>
        
        {/* Página anterior */}
        <motion.div
          whileHover={animationsEnabled ? { scale: 1.05 } : {}}
          whileTap={animationsEnabled ? { scale: 0.95 } : {}}
          className="relative z-10 mr-1"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 relative flex items-center justify-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
          >
            <span className="text-lg font-bold">&lt;</span>
          </Button>
        </motion.div>

        <div className="inline-flex items-center relative z-10 mx-1 space-x-1">
          {Array.from({ length: Math.min(totalPages, windowWidth < 640 ? 3 : 5) }).map((_, i) => {
            // Calcular el número de página basado en la posición actual
            let pageNum;
            const maxVisiblePages = windowWidth < 640 ? 3 : 5;
            
            if (totalPages <= maxVisiblePages) {
              // Si hay menos páginas que el máximo visible, mostrar todas secuencialmente
              pageNum = i + 1;
            } else if (currentPage <= Math.ceil(maxVisiblePages / 2)) {
              // Si estamos en las primeras páginas
              pageNum = i + 1;
            } else if (currentPage >= totalPages - Math.floor(maxVisiblePages / 2)) {
              // Si estamos en las últimas páginas
              pageNum = totalPages - maxVisiblePages + 1 + i;
            } else {
              // Si estamos en páginas intermedias
              pageNum = currentPage - Math.floor(maxVisiblePages / 2) + i;
            }

            return (
              <motion.div
                key={pageNum}
                whileHover={animationsEnabled ? { scale: 1.05 } : {}}
                whileTap={animationsEnabled ? { scale: 0.95 } : {}}
                className="relative z-10"
              >
                <Button
                  variant={currentPage === pageNum ? "default" : "outline"}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-8 h-8 sm:w-9 sm:h-9 p-0 text-xs sm:text-sm relative ${
                    currentPage === pageNum
                      ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600"
                      : "dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                  } transition-all duration-200`}
                >
                  {pageNum}
                </Button>
              </motion.div>
            );
          })}
        </div>
        
        {/* Página siguiente */}
        <motion.div
          whileHover={animationsEnabled ? { scale: 1.05 } : {}}
          whileTap={animationsEnabled ? { scale: 0.95 } : {}}
          className="relative z-10 ml-1"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() =>
              onPageChange(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="w-8 h-8 sm:w-9 sm:h-9 p-0 relative flex items-center justify-center dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
          >
            <span className="text-lg font-bold">&gt;</span>
          </Button>
        </motion.div>
        
        {/* Última página - Oculto en móviles */}
        <motion.div
          whileHover={animationsEnabled ? { scale: 1.05 } : {}}
          whileTap={animationsEnabled ? { scale: 0.95 } : {}}
          className="relative z-10 hidden sm:block ml-1"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 sm:w-10 sm:h-10 p-0 relative dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 transition-transform ease-in-out"
          >
            <span className="text-xs sm:text-sm font-bold">&gt;&gt;</span>
          </Button>
        </motion.div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400">
        Página {currentPage} de {totalPages}
      </p>
    </motion.div>
  );
}
