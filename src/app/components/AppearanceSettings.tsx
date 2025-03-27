"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";

// Tipos para el tema
type _Theme = "light" | "dark" | "system";

// Tipos para opciones avanzadas
type FontSize = "small" | "medium" | "large";
type FontFamily = "sans" | "serif" | "mono";
type ContentDensity = "compact" | "comfortable";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Estados para las configuraciones avanzadas
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [contentDensity, setContentDensity] = useState<ContentDensity>("comfortable");
  const [enableAnimations, setEnableAnimations] = useState(true);

  // Función para aplicar los cambios - usando useCallback para evitar recreaciones
  const applyChanges = useCallback(() => {
    if (typeof document === "undefined") return;
    
    // Aplicar tamaño de fuente
    document.documentElement.dataset.fontSize = fontSize;
    
    // Aplicar familia de fuente
    document.documentElement.dataset.fontFamily = fontFamily;
    
    // Aplicar densidad de contenido
    document.documentElement.dataset.contentDensity = contentDensity;
    
    // Aplicar animaciones
    document.documentElement.dataset.animations = enableAnimations ? "true" : "false";
  }, [fontSize, fontFamily, contentDensity, enableAnimations]);

  // Aseguramos que el componente está montado para evitar problemas de hidratación
  useEffect(() => {
    setMounted(true);
    
    // Cargar preferencias guardadas
    if (typeof window !== "undefined") {
      const savedFontSize = localStorage.getItem("hemopress-font-size") as FontSize | null;
      const savedFontFamily = localStorage.getItem("hemopress-font-family") as FontFamily | null;
      const savedContentDensity = localStorage.getItem("hemopress-content-density") as ContentDensity | null;
      const savedEnableAnimations = localStorage.getItem("hemopress-animations");
      
      if (savedFontSize) setFontSize(savedFontSize);
      if (savedFontFamily) setFontFamily(savedFontFamily);
      if (savedContentDensity) setContentDensity(savedContentDensity);
      if (savedEnableAnimations !== null) setEnableAnimations(savedEnableAnimations === "true");
      
      // Aplicar cambios
      applyChanges();
    }
  }, [applyChanges]);

  // Guardamos las preferencias cuando cambian
  useEffect(() => {
    if (mounted && typeof window !== "undefined") {
      localStorage.setItem("hemopress-font-size", fontSize);
      localStorage.setItem("hemopress-font-family", fontFamily);
      localStorage.setItem("hemopress-content-density", contentDensity);
      localStorage.setItem("hemopress-animations", String(enableAnimations));
      
      // Aplicar cambios
      applyChanges();
    }
  }, [fontSize, fontFamily, contentDensity, enableAnimations, applyChanges, mounted]);

  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 mb-6 transition-all duration-200">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-6">Configuración de apariencia</h1>
        
        {/* Selector de tema */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Tema</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setTheme("light")}
              className={`p-4 rounded-lg flex items-center justify-center ${
                theme === "light" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="M4.93 4.93l1.41 1.41"></path>
                  <path d="M17.66 17.66l1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="M6.34 17.66l-1.41 1.41"></path>
                  <path d="M19.07 4.93l-1.41 1.41"></path>
                </svg>
                <span>Claro</span>
              </div>
            </button>
            
            <button
              onClick={() => setTheme("dark")}
              className={`p-4 rounded-lg flex items-center justify-center ${
                theme === "dark" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
                <span>Oscuro</span>
              </div>
            </button>
            
            <button
              onClick={() => setTheme("system")}
              className={`p-4 rounded-lg flex items-center justify-center ${
                theme === "system" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2">
                  <rect width="16" height="12" x="4" y="6" rx="2"></rect>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="M12 22v-4"></path>
                  <path d="M12 2v4"></path>
                </svg>
                <span>Sistema</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Tamaño de fuente */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Tamaño de fuente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setFontSize("small")}
              className={`p-3 rounded-lg ${
                fontSize === "small" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <span className="text-sm">Pequeño</span>
            </button>
            
            <button
              onClick={() => setFontSize("medium")}
              className={`p-3 rounded-lg ${
                fontSize === "medium" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <span className="text-base">Mediano</span>
            </button>
            
            <button
              onClick={() => setFontSize("large")}
              className={`p-3 rounded-lg ${
                fontSize === "large" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <span className="text-lg">Grande</span>
            </button>
          </div>
        </div>
        
        {/* Familia de fuente */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Fuente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setFontFamily("sans")}
              className={`p-3 rounded-lg font-sans ${
                fontFamily === "sans" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Sans-serif
            </button>
            
            <button
              onClick={() => setFontFamily("serif")}
              className={`p-3 rounded-lg font-serif ${
                fontFamily === "serif" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Serif
            </button>
            
            <button
              onClick={() => setFontFamily("mono")}
              className={`p-3 rounded-lg font-mono ${
                fontFamily === "mono" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Monospace
            </button>
          </div>
        </div>
        
        {/* Densidad de contenido */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Densidad de contenido</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setContentDensity("compact")}
              className={`p-3 rounded-lg ${
                contentDensity === "compact" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Compacto
            </button>
            
            <button
              onClick={() => setContentDensity("comfortable")}
              className={`p-3 rounded-lg ${
                contentDensity === "comfortable" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Confortable
            </button>
          </div>
        </div>
        
        {/* Animaciones */}
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-3">Animaciones</h2>
          <label className="inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={enableAnimations}
              onChange={() => setEnableAnimations(!enableAnimations)}
            />
            <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
            <span className="ms-3 text-sm font-medium text-gray-900 dark:text-white">
              {enableAnimations ? "Animaciones activadas" : "Animaciones desactivadas"}
            </span>
          </label>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Al desactivar las animaciones mejora el rendimiento en dispositivos más antiguos.
          </p>
        </div>
        
        <div className="flex justify-between items-center mt-10">
          <Link href="/settings" className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
              <path d="m12 19-7-7 7-7"></path>
              <path d="M19 12H5"></path>
            </svg>
            Volver a Configuración
          </Link>
          
          <button
            onClick={() => {
              // Resetear a valores por defecto
              setFontSize("medium");
              setFontFamily("sans");
              setContentDensity("comfortable");
              setEnableAnimations(true);
              setTheme("system");
            }}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Restablecer valores predeterminados
          </button>
        </div>
      </div>
    </div>
  );
}
