import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";

interface NoResultsFoundProps {
  message: string;
}

const NoResultsFound: React.FC<NoResultsFoundProps> = ({ message }) => {
  const { theme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [iconType, setIconType] = useState(0);

  // Para asegurar que el componente esté montado antes de acceder a resolvedTheme
  useEffect(() => {
    setMounted(true);
    // Seleccionar aleatoriamente uno de los 3 iconos
    setIconType(Math.floor(Math.random() * 3));
  }, []);

  if (!mounted) return null;

  // Verificamos tanto theme como resolvedTheme para mayor confiabilidad
  // También comprobamos si existe preferencia de color oscuro en el medio
  const isDarkMode = theme === 'dark' || resolvedTheme === 'dark' || 
    (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  
  // Paleta de colores adaptativa
  const colors = {
    primary: isDarkMode ? "#60a5fa" : "#3b82f6", // Azul principal
    secondary: isDarkMode ? "#93c5fd" : "#2563eb", // Azul secundario
    accent: isDarkMode ? "#f87171" : "#ef4444", // Rojo/acento
    background: isDarkMode ? "#1e293b" : "#f3f4f6", // Fondo
    text: isDarkMode ? "#f3f4f6" : "#1e293b", // Texto
    paper: isDarkMode ? "#334155" : "#ffffff", // Papel/tarjetas
  };

  // Tres diseños diferentes de iconos SVG
  const icons = [
    // Icono 1: Periódico con lupa
    <svg 
      key="newspaper-search" 
      xmlns="http://www.w3.org/2000/svg" 
      width="200" 
      height="200" 
      viewBox="0 0 200 200"
      className="drop-shadow-xl"
    >
      {/* Fondo circular */}
      <circle cx="100" cy="100" r="80" fill={colors.background} />
      
      {/* Periódico */}
      <rect x="45" y="60" width="90" height="100" rx="3" fill={colors.paper} stroke={colors.secondary} strokeWidth="2" />
      
      {/* Líneas de texto */}
      <line x1="55" y1="75" x2="125" y2="75" stroke={colors.text} strokeWidth="2" strokeOpacity="0.5" />
      <line x1="55" y1="85" x2="125" y2="85" stroke={colors.text} strokeWidth="2" strokeOpacity="0.5" />
      <line x1="55" y1="95" x2="125" y2="95" stroke={colors.text} strokeWidth="2" strokeOpacity="0.5" />
      <line x1="55" y1="105" x2="105" y2="105" stroke={colors.text} strokeWidth="2" strokeOpacity="0.5" />
      <line x1="55" y1="125" x2="125" y2="125" stroke={colors.text} strokeWidth="2" strokeOpacity="0.5" />
      <line x1="55" y1="135" x2="125" y2="135" stroke={colors.text} strokeWidth="2" strokeOpacity="0.5" />
      <line x1="55" y1="145" x2="125" y2="145" stroke={colors.text} strokeWidth="2" strokeOpacity="0.5" />
      
      {/* Lupa */}
      <circle cx="130" cy="90" r="30" fill="none" stroke={colors.accent} strokeWidth="3" />
      <line x1="150" y1="110" x2="165" y2="125" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
      
      {/* X en la lupa */}
      <line x1="120" y1="80" x2="140" y2="100" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
      <line x1="140" y1="80" x2="120" y2="100" stroke={colors.accent} strokeWidth="3" strokeLinecap="round" />
    </svg>,
    
    // Icono 2: Carpeta vacía con documentos cayendo
    <svg 
      key="empty-folder" 
      xmlns="http://www.w3.org/2000/svg" 
      width="200" 
      height="200" 
      viewBox="0 0 200 200"
      className="drop-shadow-xl"
    >
      {/* Fondo circular */}
      <circle cx="100" cy="100" r="80" fill={colors.background} />
      
      {/* Carpeta */}
      <path d="M40,70 L80,70 L90,60 L150,60 L150,140 L40,140 Z" fill={colors.paper} stroke={colors.secondary} strokeWidth="2" />
      <path d="M40,70 L150,70" stroke={colors.secondary} strokeWidth="2" />
      
      {/* Documentos cayendo */}
      <g transform="rotate(15, 85, 100)">
        <rect x="70" y="85" width="30" height="40" fill="white" stroke={colors.primary} strokeWidth="1" />
        <line x1="75" y1="95" x2="95" y2="95" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
        <line x1="75" y1="100" x2="95" y2="100" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
        <line x1="75" y1="105" x2="95" y2="105" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
        <line x1="75" y1="110" x2="88" y2="110" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
      </g>
      
      <g transform="rotate(-20, 110, 105)">
        <rect x="95" y="90" width="30" height="40" fill="white" stroke={colors.primary} strokeWidth="1" />
        <line x1="100" y1="100" x2="120" y2="100" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
        <line x1="100" y1="105" x2="120" y2="105" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
        <line x1="100" y1="110" x2="120" y2="110" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
        <line x1="100" y1="115" x2="113" y2="115" stroke={colors.text} strokeOpacity="0.5" strokeWidth="1" />
      </g>
      
      {/* Símbolo de búsqueda vacía */}
      <text x="100" y="125" textAnchor="middle" fill={colors.accent} fontWeight="bold" fontSize="30">?</text>
    </svg>,
    
    // Icono 3: Pantalla de computadora con error
    <svg 
      key="computer-error" 
      xmlns="http://www.w3.org/2000/svg" 
      width="200" 
      height="200" 
      viewBox="0 0 200 200"
      className="drop-shadow-xl"
    >
      {/* Fondo circular */}
      <circle cx="100" cy="100" r="80" fill={colors.background} />
      
      {/* Monitor */}
      <rect x="50" y="50" width="100" height="70" rx="3" fill={colors.paper} stroke={colors.secondary} strokeWidth="2" />
      <rect x="60" y="60" width="80" height="50" rx="2" fill={isDarkMode ? "#0f172a" : "#e5e7eb"} />
      
      {/* Base del monitor */}
      <path d="M85,120 L115,120 L110,140 L90,140 Z" fill={colors.paper} stroke={colors.secondary} strokeWidth="2" />
      <line x1="75" y1="140" x2="125" y2="140" stroke={colors.secondary} strokeWidth="2" />
      
      {/* Símbolo de error en la pantalla */}
      <circle cx="100" cy="85" r="16" fill={colors.accent} />
      <text x="100" y="91" textAnchor="middle" fill="white" fontWeight="bold" fontSize="20">!</text>
      
      {/* Líneas de error */}
      <line x1="70" y1="70" x2="85" y2="70" stroke={colors.text} strokeWidth="1" />
      <line x1="70" y1="75" x2="90" y2="75" stroke={colors.text} strokeWidth="1" />
      <line x1="70" y1="80" x2="82" y2="80" stroke={colors.text} strokeWidth="1" />
      
      <line x1="115" y1="70" x2="130" y2="70" stroke={colors.text} strokeWidth="1" />
      <line x1="110" y1="75" x2="130" y2="75" stroke={colors.text} strokeWidth="1" />
      <line x1="118" y1="80" x2="130" y2="80" stroke={colors.text} strokeWidth="1" />
      
      <line x1="70" y1="100" x2="90" y2="100" stroke={colors.text} strokeWidth="1" />
      <line x1="70" y1="105" x2="130" y2="105" stroke={colors.text} strokeWidth="1" />
      <line x1="70" y1="110" x2="130" y2="110" stroke={colors.text} strokeWidth="1" />
    </svg>
  ];

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 min-h-[400px] rounded-xl bg-white/40 dark:bg-gray-800/40 backdrop-blur-sm">
      <div className="mb-8 transform hover:scale-105 transition-transform duration-300">
        {icons[iconType]}
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-200 text-center mb-4">
        No se encontraron resultados
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
        {message}
      </p>
      <div className="mt-6">
        <button
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 shadow-md hover:shadow-lg"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          Intentar otra búsqueda
        </button>
      </div>
    </div>
  );
};

export default NoResultsFound;
