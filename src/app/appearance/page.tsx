"use client";

import { useState, useEffect } from "react";
import styled from "styled-components";
import Link from "next/link";
import { useTheme } from "../components/ThemeProvider";

// Tipos para el tema
type Theme = "light" | "dark" | "system";

export default function AppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Aseguramos que el componente está montado para evitar problemas de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  // No renderizar nada hasta que el componente esté montado para evitar problemas de hidratación
  if (!mounted) return null;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg transition-colors duration-300">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">Configuración de Apariencia</h1>
        
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Modo del tema</h2>
          
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

        <div className="flex justify-center mt-10">
          <Link href="/settings" className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white font-medium py-2 px-4 rounded transition-colors">
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
          ? 'border-2 border-blue-500 bg-blue-50 dark:bg-blue-900/40' 
          : 'border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start mb-3">
        <div className={`mr-3 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {icon}
        </div>
        <div className="flex-1">
          <h3 className={`font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-800 dark:text-gray-200'}`}>
            {title}
          </h3>
        </div>
        {isActive && (
          <div className="text-blue-500 dark:text-blue-400">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12L10 17L20 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300 ml-9">{description}</p>
      
      {title === "Tema claro" && (
        <div className="mt-4 ml-9 p-3 bg-gray-100 dark:bg-gray-700 rounded">
          <div className="h-2 w-16 bg-gray-300 dark:bg-gray-500 rounded mb-2"></div>
          <div className="h-2 w-10 bg-gray-300 dark:bg-gray-500 rounded"></div>
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
