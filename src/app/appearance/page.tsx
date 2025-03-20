"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import Link from "next/link";
import { useTheme } from "../components/ThemeProvider";

// Tipos para el tema
type Theme = "light" | "dark" | "system";

// Tipos para opciones avanzadas
type FontSize = "small" | "medium" | "large";
type FontFamily = "sans" | "serif" | "mono";
type ContentDensity = "compact" | "comfortable";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  
  // Estados para las configuraciones avanzadas
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [fontFamily, setFontFamily] = useState<FontFamily>("sans");
  const [contentDensity, setContentDensity] = useState<ContentDensity>("comfortable");
  const [enableAnimations, setEnableAnimations] = useState(true);

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
    }
  }, []);

  // Handlers para cambiar configuraciones
  const handleFontSizeChange = (size: FontSize) => {
    setFontSize(size);
    localStorage.setItem("hemopress-font-size", size);
    document.documentElement.setAttribute("data-font-size", size);
  };

  const handleFontFamilyChange = (family: FontFamily) => {
    setFontFamily(family);
    localStorage.setItem("hemopress-font-family", family);
    document.documentElement.setAttribute("data-font-family", family);
  };

  const handleContentDensityChange = (density: ContentDensity) => {
    setContentDensity(density);
    localStorage.setItem("hemopress-content-density", density);
    document.documentElement.setAttribute("data-content-density", density);
  };

  const handleAnimationsChange = (enabled: boolean) => {
    setEnableAnimations(enabled);
    localStorage.setItem("hemopress-animations", String(enabled));
    document.documentElement.setAttribute("data-animations", String(enabled));
  };

  // No renderizar nada hasta que el componente esté montado para evitar problemas de hidratación
  if (!mounted) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800/80 p-6 rounded-lg shadow-lg dark:shadow-blue-900/20 transition-colors duration-300">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 dark:text-blue-100">Configuración Avanzada de Apariencia</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-blue-200">Modo del tema</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ThemeCard 
              title="Sincronizar con sistema"
              description="La apariencia cambiará automáticamente según el tema de tu sistema operativo"
              isActive={theme === "system"}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 8L8 16M12 3V7M21 12H17M12 17V21M7 12H3M15.5 12C15.5 13.933 13.933 15.5 12 15.5C10.067 15.5 8.5 13.933 8.5 12C8.5 10.067 10.067 8.5 12 8.5C13.933 8.5 15.5 10.067 15.5 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              onClick={() => setTheme("system")}
            />
            
            <ThemeCard 
              title="Tema claro"
              description="Modo claro para usar la aplicación con buena iluminación"
              isActive={theme === "light"}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 2V4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M12 20V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M4.93 4.93L6.34 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M17.66 17.66L19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M2 12H4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M20 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M6.34 17.66L4.93 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19.07 4.93L17.66 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              onClick={() => setTheme("light")}
            />
            
            <ThemeCard 
              title="Tema oscuro"
              description="Modo oscuro para reducir la fatiga visual en entornos con poca luz"
              isActive={theme === "dark"}
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 12.79C20.8427 14.4922 20.2039 16.1144 19.1582 17.4668C18.1126 18.8192 16.7035 19.8458 15.0957 20.4265C13.4879 21.0073 11.7479 21.1181 10.0794 20.7461C8.41092 20.3741 6.8829 19.5345 5.67415 18.3258C4.4654 17.117 3.62588 15.589 3.25391 13.9205C2.88193 12.252 2.99274 10.5121 3.57346 8.9043C4.15418 7.29651 5.18079 5.88737 6.53321 4.84175C7.88563 3.79614 9.50782 3.15731 11.21 3C10.2134 4.34827 9.73385 6.00945 9.85853 7.68141C9.98322 9.35338 10.7038 10.9251 11.8894 12.1106C13.0749 13.2962 14.6466 14.0168 16.3186 14.1415C17.9906 14.2662 19.6517 13.7866 21 12.79Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              }
              onClick={() => setTheme("dark")}
            />
          </div>
        </div>

        {/* Personalización de texto */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-blue-200">Personalización de texto</h2>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="mb-4">
              <label className="block text-gray-600 dark:text-blue-200/80 text-sm font-medium mb-2">Tamaño de fuente</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleFontSizeChange("small")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center ${
                    fontSize === "small" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                >
                  <span className="text-sm mb-1">A</span>
                  <span className="text-xs">Pequeño</span>
                </button>
                <button
                  onClick={() => handleFontSizeChange("medium")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center ${
                    fontSize === "medium" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                >
                  <span className="text-base mb-1">A</span>
                  <span className="text-xs">Mediano</span>
                </button>
                <button
                  onClick={() => handleFontSizeChange("large")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center ${
                    fontSize === "large" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                >
                  <span className="text-lg mb-1">A</span>
                  <span className="text-xs">Grande</span>
                </button>
              </div>
            </div>
            <div>
              <label className="block text-gray-600 dark:text-blue-200/80 text-sm font-medium mb-2">Familia de fuente</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleFontFamilyChange("sans")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center ${
                    fontFamily === "sans" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                >
                  <span className="font-sans text-base mb-1">Aa</span>
                  <span className="text-xs">Sans-serif</span>
                </button>
                <button
                  onClick={() => handleFontFamilyChange("serif")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center ${
                    fontFamily === "serif" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                >
                  <span className="font-serif text-base mb-1">Aa</span>
                  <span className="text-xs">Serif</span>
                </button>
                <button
                  onClick={() => handleFontFamilyChange("mono")}
                  className={`p-3 rounded-md flex flex-col items-center justify-center ${
                    fontFamily === "mono" 
                      ? "bg-blue-500 text-white" 
                      : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-blue-100 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                >
                  <span className="font-mono text-base mb-1">Aa</span>
                  <span className="text-xs">Mono</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Densidad de contenido */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-blue-200">Densidad de contenido</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => handleContentDensityChange("compact")}
              className={`p-4 rounded-lg border transition-all ${
                contentDensity === "compact"
                  ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60"
              }`}
            >
              <h3 className="font-medium mb-2 text-gray-800 dark:text-blue-100">Compacto</h3>
              <div className="h-16 bg-white dark:bg-gray-800 rounded-md flex flex-col justify-center items-center">
                <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded mb-1"></div>
                <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <p className="text-sm mt-2 text-gray-600 dark:text-blue-200/80">Muestra más contenido en la pantalla con menos espacio entre elementos.</p>
            </button>
            <button
              onClick={() => handleContentDensityChange("comfortable")}
              className={`p-4 rounded-lg border transition-all ${
                contentDensity === "comfortable"
                  ? "border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40 hover:bg-gray-100 dark:hover:bg-gray-700/60"
              }`}
            >
              <h3 className="font-medium mb-2 text-gray-800 dark:text-blue-100">Cómodo</h3>
              <div className="h-24 bg-white dark:bg-gray-800 rounded-md flex flex-col justify-center items-center">
                <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
                <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
                <div className="w-3/4 h-2 bg-gray-300 dark:bg-gray-600 rounded"></div>
              </div>
              <p className="text-sm mt-2 text-gray-600 dark:text-blue-200/80">Experiencia de lectura más relajada con más espacio entre elementos.</p>
            </button>
          </div>
        </div>

        {/* Animaciones */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-blue-200">Animaciones</h2>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <label className="text-gray-600 dark:text-blue-200/80">Activar animaciones</label>
              <div className="relative inline-flex">
                <button 
                  onClick={() => handleAnimationsChange(!enableAnimations)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 ${
                    enableAnimations ? 'bg-blue-500 dark:bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                  role="switch"
                  aria-checked={enableAnimations}
                >
                  <span 
                    className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                      enableAnimations ? 'translate-x-5' : 'translate-x-0'
                    }`} 
                  />
                </button>
              </div>
            </div>
            <p className="text-sm mt-2 text-gray-600 dark:text-blue-200/70">
              {enableAnimations 
                ? "Las animaciones ayudan a proporcionar contexto visual y hacen que la interfaz sea más intuitiva." 
                : "Las animaciones están desactivadas para mejorar el rendimiento y reducir distracciones."}
            </p>
          </div>
        </div>

        <div className="flex justify-between mt-10 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Link href="/settings" className="text-gray-600 dark:text-blue-300 hover:text-gray-800 dark:hover:text-blue-100 transition-colors flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
              <path d="m12 19-7-7 7-7"></path>
              <path d="M19 12H5"></path>
            </svg>
            Volver a Configuración
          </Link>
        </div>
      </div>
    </div>
  );
}

// Componente de tarjeta para selección de tema
interface ThemeCardProps {
  title: string;
  description: string;
  isActive: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}

function ThemeCard({ title, description, isActive, onClick, icon }: ThemeCardProps) {
  return (
    <StyledThemeCard 
      className={`p-4 rounded-lg cursor-pointer transition-all ${
        isActive 
          ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
          : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/80'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start mb-3">
        <div className={`mr-3 ${isActive ? 'text-blue-500 dark:text-blue-600' : 'text-gray-600 dark:text-blue-200/80'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-medium ${isActive ? 'text-blue-500 dark:text-blue-600' : 'text-gray-800 dark:text-blue-100'}`}>
            {title}
          </h3>
        </div>
        {isActive && (
          <div className="text-blue-500 dark:text-blue-600">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-blue-200/80 ml-9">{description}</p>
      
      {title === "Tema claro" && (
        <div className="mt-4 ml-9 p-3 bg-white dark:bg-gray-800 rounded">
          <div className="h-2 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
          <div className="h-2 w-10 bg-gray-300 dark:bg-gray-600 rounded"></div>
        </div>
      )}
      
      {title === "Tema oscuro" && (
        <div className="mt-4 ml-9 p-3 bg-gray-800 dark:bg-gray-900 rounded">
          <div className="h-2 w-16 bg-gray-600 dark:bg-gray-700 rounded mb-2"></div>
          <div className="h-2 w-10 bg-gray-600 dark:bg-gray-700 rounded"></div>
        </div>
      )}
    </StyledThemeCard>
  );
}

// Estilos para la tarjeta
const StyledThemeCard = styled.div`
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
`;
