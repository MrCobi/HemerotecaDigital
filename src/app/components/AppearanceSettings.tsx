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
  
  // Estado para la previsualización de temas
  const [previewTheme, setPreviewTheme] = useState<string | null>(null);
  const currentTheme = previewTheme || theme;
  
  // Función para aplicar los cambios al DOM
  const applyChangesToDOM = useCallback(() => {
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

  // Función para guardar en localStorage
  const saveToLocalStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    
    localStorage.setItem("hemopress-font-size", fontSize);
    localStorage.setItem("hemopress-font-family", fontFamily);
    localStorage.setItem("hemopress-content-density", contentDensity);
    localStorage.setItem("hemopress-animations", String(enableAnimations));
  }, [fontSize, fontFamily, contentDensity, enableAnimations]);

  // Efecto para cargar inicialmente - solo se ejecuta una vez
  useEffect(() => {
    setMounted(true);
    
    // Cargar preferencias guardadas
    if (typeof window !== "undefined") {
      // Recuperar valores almacenados
      const savedFontSize = localStorage.getItem("hemopress-font-size") as FontSize | null;
      const savedFontFamily = localStorage.getItem("hemopress-font-family") as FontFamily | null;
      const savedContentDensity = localStorage.getItem("hemopress-content-density") as ContentDensity | null;
      const savedEnableAnimations = localStorage.getItem("hemopress-animations");
      
      // Configurar estados con valores almacenados o predeterminados
      if (savedFontSize) setFontSize(savedFontSize);
      if (savedFontFamily) setFontFamily(savedFontFamily);
      if (savedContentDensity) setContentDensity(savedContentDensity);
      if (savedEnableAnimations !== null) setEnableAnimations(savedEnableAnimations === "true");
    }
  }, []); // Sin dependencias - solo se ejecuta en el montaje
  
  // Efecto para aplicar cambios al DOM cuando los valores cambian
  useEffect(() => {
    if (mounted) {
      applyChangesToDOM();
    }
  }, [applyChangesToDOM, mounted]);
  
  // Efecto para guardar en localStorage cuando los valores cambian
  useEffect(() => {
    if (mounted) {
      saveToLocalStorage();
    }
  }, [saveToLocalStorage, mounted]);

  // Efecto para añadir transiciones suaves entre cambios de tema
  useEffect(() => {
    if (typeof document === "undefined") return;
    
    // Aplicar transiciones a elementos clave cuando cambia el tema
    document.documentElement.style.transition = "background-color 0.5s ease, color 0.5s ease";
    document.body.style.transition = "background-color 0.5s ease, color 0.5s ease";
    
    const elementsToTransition = document.querySelectorAll(
      '.bg-white, .bg-gray-100, .bg-gray-200, .dark\\:bg-gray-800, .dark\\:bg-gray-700, .dark\\:bg-gray-900'
    );
    
    elementsToTransition.forEach(element => {
      if (element instanceof HTMLElement) {
        element.style.transition = "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease";
      }
    });
    
    return () => {
      // Limpieza al desmontar
      document.documentElement.style.transition = "";
      document.body.style.transition = "";
    };
  }, []);

  // Función para restablecer valores predeterminados
  const resetToDefaults = useCallback(() => {
    setFontSize("medium");
    setFontFamily("sans");
    setContentDensity("comfortable");
    setEnableAnimations(true);
    setTheme("system");
  }, [setTheme]);

  // Función para mostrar previsualización al hover
  const handleThemePreview = (previewTheme: string) => {
    // Si es tema de sistema, preservamos la preferencia del sistema
    if (previewTheme === "system") {
      // Detectamos la preferencia del sistema
      const systemPrefersDark = typeof window !== 'undefined' && 
        window.matchMedia && 
        window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Aplicamos la preferencia real del sistema para la previsualización
      setPreviewTheme(systemPrefersDark ? "dark" : "light");
    } else {
      setPreviewTheme(previewTheme);
    }
  };
  
  // Función para quitar previsualización
  const clearThemePreview = () => {
    setPreviewTheme(null);
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="px-6 py-8 transition-all duration-200">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white mb-8">Configuración de apariencia</h1>
        
        {/* Tema */}
        <div className="mb-12">
          <div className="flex items-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Tema</h2>
          </div>
          
          {/* Previsualizador de tema actual */}
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm transition-all duration-500">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Vista previa del tema: {currentTheme === 'dark' ? 'Oscuro' : currentTheme === 'light' ? 'Claro' : 'Sistema'}
            </div>
            <div className={`relative rounded-lg ${
              currentTheme === 'dark' ? 'bg-gray-800' : 'bg-white'
            } overflow-hidden shadow-lg transition-all duration-500 border ${
              currentTheme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <div className={`p-3 ${
                currentTheme === 'dark' ? 'bg-gray-900' : 'bg-blue-600'
              } flex items-center transition-all duration-500`}>
                <div className="w-8 h-8 flex-shrink-0 rounded-md flex items-center justify-center bg-white/10 backdrop-blur-sm">
                  <svg className={`w-5 h-5 ${currentTheme === 'dark' ? 'text-blue-400' : 'text-white'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.25 4.533A9.707 9.707 0 006 3a9.735 9.735 0 00-3.25.555.75.75 0 00-.5.707v14.25a.75.75 0 001 .707A8.237 8.237 0 016 18.75c1.995 0 3.823.707 5.25 1.886V4.533zM12.75 20.636A8.214 8.214 0 0118 18.75c.966 0 1.89.166 2.75.47a.75.75 0 001-.708V4.262a.75.75 0 00-.5-.707A9.735 9.735 0 0018 3a9.707 9.707 0 00-5.25 1.533v16.103z" />
                  </svg>
                </div>
                <div className={`ml-3 font-medium ${currentTheme === 'dark' ? 'text-gray-100' : 'text-white'} transition-all duration-500`}>
                  Hemeroteca Digital
                </div>
              </div>
              
              <div className="p-4">
                <div className={`text-sm mb-3 ${currentTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'} transition-all duration-500`}>
                  Un proyecto para la organización de archivos históricos
                </div>
                <div className="flex flex-wrap gap-2 mb-2">
                  <div className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-blue-600 text-white'
                  } transition-all duration-500`}>
                    Acción principal
                  </div>
                  <div className={`px-3 py-2 text-sm font-medium rounded-md ${
                    currentTheme === 'dark' 
                      ? 'bg-gray-700 text-gray-300'
                      : 'bg-gray-200 text-gray-700'
                  } transition-all duration-500`}>
                    Secundaria
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Este es un ejemplo del aspecto visual con el tema seleccionado
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setTheme("light")}
              onMouseEnter={() => handleThemePreview("light")}
              onMouseLeave={clearThemePreview}
              className={`group relative p-5 rounded-xl flex flex-col items-center justify-center transition-all ${
                theme === "light" 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all ${
                theme === "light" 
                  ? "bg-white/30" 
                  : "bg-white dark:bg-gray-600 group-hover:bg-gray-200 dark:group-hover:bg-gray-500"
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              </div>
              <span className="font-medium">Claro</span>
            </button>
            
            <button
              onClick={() => setTheme("dark")}
              onMouseEnter={() => handleThemePreview("dark")}
              onMouseLeave={clearThemePreview}
              className={`group relative p-5 rounded-xl flex flex-col items-center justify-center transition-all ${
                theme === "dark" 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all ${
                theme === "dark" 
                  ? "bg-white/30" 
                  : "bg-white dark:bg-gray-600 group-hover:bg-gray-200 dark:group-hover:bg-gray-500"
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              </div>
              <span className="font-medium">Oscuro</span>
            </button>
            
            <button
              onClick={() => setTheme("system")}
              onMouseEnter={() => handleThemePreview("system")}
              onMouseLeave={clearThemePreview}
              className={`group relative p-5 rounded-xl flex flex-col items-center justify-center transition-all ${
                theme === "system" 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-3 transition-all ${
                theme === "system" 
                  ? "bg-white/30" 
                  : "bg-white dark:bg-gray-600 group-hover:bg-gray-200 dark:group-hover:bg-gray-500"
              }`}>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <span className="font-medium">Sistema</span>
            </button>
          </div>
        </div>
        
        {/* Tamaño de fuente */}
        <div className="mb-12">
          <div className="flex items-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Tamaño de fuente</h2>
          </div>
          
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Vista previa del tamaño seleccionado</div>
            <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
              <p className={`mb-1 ${fontSize === 'small' ? 'text-sm' : fontSize === 'medium' ? 'text-base' : 'text-lg'} text-gray-800 dark:text-gray-200`}>
                Este texto muestra cómo se verá el tamaño de fuente {fontSize === 'small' ? 'pequeño' : fontSize === 'medium' ? 'mediano' : 'grande'}.
              </p>
              <p className={`${fontSize === 'small' ? 'text-xs' : fontSize === 'medium' ? 'text-sm' : 'text-base'} text-gray-500 dark:text-gray-400`}>
                También afecta a textos secundarios y descripciones en la interfaz.
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setFontSize("small")}
              className={`p-4 rounded-xl transition-all ${
                fontSize === "small" 
                  ? "bg-blue-500 dark:bg-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium">Pequeño</span>
                <span className="ml-2 text-xs">Aa</span>
              </div>
            </button>
            
            <button
              onClick={() => setFontSize("medium")}
              className={`p-4 rounded-xl transition-all ${
                fontSize === "medium" 
                  ? "bg-blue-500 dark:bg-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center justify-center">
                <span className="text-base font-medium">Mediano</span>
                <span className="ml-2 text-sm">Aa</span>
              </div>
            </button>
            
            <button
              onClick={() => setFontSize("large")}
              className={`p-4 rounded-xl transition-all ${
                fontSize === "large" 
                  ? "bg-blue-500 dark:bg-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex items-center justify-center">
                <span className="text-lg font-medium">Grande</span>
                <span className="ml-2 text-base">Aa</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Familia tipográfica */}
        <div className="mb-12">
          <div className="flex items-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Familia tipográfica</h2>
          </div>
          
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Vista previa de la familia de fuente
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className={`p-4 ${fontFamily === 'sans' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'} rounded-lg border transition-all duration-300`}>
                <p className="font-sans text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Sans-serif:</span> Diseño limpio y moderno. Ideal para lectura en pantallas digitales.
                </p>
              </div>
              
              <div className={`p-4 ${fontFamily === 'serif' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'} rounded-lg border transition-all duration-300`}>
                <p className="font-serif text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Serif:</span> Estilo clásico y elegante. Facilita la lectura de textos largos.
                </p>
              </div>
              
              <div className={`p-4 ${fontFamily === 'mono' ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600'} rounded-lg border transition-all duration-300`}>
                <p className="font-mono text-gray-800 dark:text-gray-200">
                  <span className="font-medium">Monospace:</span> Caracteres de ancho fijo. Ideal para código o datos estructurados.
                </p>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={() => setFontFamily("sans")}
              className={`p-3 rounded-lg text-left font-sans transition-all ${
                fontFamily === "sans" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Sans-serif
            </button>
            
            <button
              onClick={() => setFontFamily("serif")}
              className={`p-3 rounded-lg text-left font-serif transition-all ${
                fontFamily === "serif" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Serif
            </button>
            
            <button
              onClick={() => setFontFamily("mono")}
              className={`p-3 rounded-lg text-left font-mono transition-all ${
                fontFamily === "mono" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Monospace
            </button>
          </div>
        </div>
        
        {/* Densidad de contenido */}
        <div className="mb-12">
          <div className="flex items-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Densidad de contenido</h2>
          </div>
          
          {/* Previsualización de densidad */}
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm transition-all duration-300">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Vista previa de la densidad de contenido
            </div>
            <div className="space-y-4">
              <div className={`overflow-hidden transition-all duration-300 rounded-lg border ${
                contentDensity === "compact" ? "border-2 border-blue-500" : "border border-gray-200 dark:border-gray-600"
              }`}>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-2 text-xs font-medium text-blue-800 dark:text-blue-200">
                  Densidad: {contentDensity === "compact" ? "Compacta" : "Confortable"}
                </div>
                <div className={`bg-white dark:bg-gray-700 divide-y divide-gray-200 dark:divide-gray-600 transition-all duration-300`}>
                  {[1, 2, 3].map((item) => (
                    <div key={item} className={`flex items-center transition-all duration-300 ${
                      contentDensity === "compact" ? "py-1.5 px-3" : "py-3 px-4"
                    }`}>
                      <div className={`w-8 h-8 flex-shrink-0 rounded-md bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-300 transition-all duration-300 ${
                        contentDensity === "compact" ? "w-7 h-7" : "w-8 h-8"
                      }`}>
                        {item}
                      </div>
                      <div className="ml-3">
                        <p className={`text-gray-800 dark:text-gray-200 font-medium transition-all duration-300 ${
                          contentDensity === "compact" ? "text-sm" : "text-base"
                        }`}>
                          Elemento de ejemplo {item}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => setContentDensity("compact")}
              className={`group relative p-5 rounded-xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-md ${
                contentDensity === "compact" 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span className="font-medium">Compacto</span>
              </div>
            </button>
            
            <button
              onClick={() => setContentDensity("comfortable")}
              className={`group relative p-5 rounded-xl flex items-center justify-center transition-all duration-300 transform hover:scale-105 hover:shadow-md ${
                contentDensity === "comfortable" 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white" 
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <div className="flex flex-col items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                </svg>
                <span className="font-medium">Confortable</span>
              </div>
            </button>
          </div>
        </div>
        
        {/* Animaciones */}
        <div className="mb-12">
          <div className="flex items-center mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500 dark:text-blue-400 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
            <h2 className="text-lg font-medium text-gray-700 dark:text-gray-300">Animaciones</h2>
          </div>
          
          {/* Previsualización animaciones */}
          <div className="mb-6 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm transition-all duration-500">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Vista previa de animaciones
            </div>
            
            <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-4 transition-all duration-500">
              <div className={`p-4 rounded-lg bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-500 ${
                !enableAnimations ? "opacity-50" : ""
              }`}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Con animaciones</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white ${
                      enableAnimations ? "animate-pulse" : ""
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pulso</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white ${
                      enableAnimations ? "animate-bounce" : ""
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rebote</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-lg flex items-center justify-center text-white transition-transform duration-700 ${
                      enableAnimations ? "hover:rotate-180" : ""
                    }`}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rotación</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 rounded-lg bg-white dark:bg-gray-700 shadow-sm border border-gray-200 dark:border-gray-600 transition-all duration-500">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Sin animaciones</h3>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Pulso</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rebote</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-2">Rotación</span>
                  </div>
                </div>
              </div>
              
              {enableAnimations && (
                <div className="absolute -bottom-4 -right-4 w-12 h-12 sm:w-16 sm:h-16 bg-blue-500/10 rounded-full animate-ping"></div>
              )}
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-5 transition-all duration-500 hover:shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full">
                <div className="flex items-center order-2 sm:order-1">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={enableAnimations}
                    onChange={() => setEnableAnimations(!enableAnimations)}
                    id="animations-switch"
                  />
                  <label 
                    htmlFor="animations-switch"
                    className="relative w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:start-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600 cursor-pointer">
                  </label>
                </div>
                <span className="order-1 sm:order-2 mb-2 sm:mb-0 sm:ms-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Animaciones activadas
                </span>
              </div>
              
              <div className="mt-4 sm:mt-0 w-full sm:w-auto">
                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 p-2 sm:p-3 rounded-lg border border-blue-100 dark:border-blue-800 max-w-full sm:max-w-xs">
                  <span className="font-medium text-blue-700 dark:text-blue-300">Consejo:</span> Al desactivar las animaciones mejora el rendimiento en dispositivos más antiguos.
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-4 mt-10 border-t pt-6 border-gray-200 dark:border-gray-700 transition-all duration-300">
          <Link
            href="/settings"
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 text-center font-medium flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Volver a configuración
          </Link>
          
          <button
            onClick={resetToDefaults}
            className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 font-medium flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Restablecer valores predeterminados
          </button>
        </div>
      </div>
    </div>
  );
}
