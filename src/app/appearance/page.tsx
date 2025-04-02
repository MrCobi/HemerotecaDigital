"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Utilizamos dynamic import para evitar el error durante el prerender
const AppearanceSettings = dynamic(
  () => import('@/src/app/components/AppearanceSettings').then(mod => mod.AppearanceSettings),
  { 
    ssr: false,
    loading: () => <LoadingSkeleton />
  }
);

// Variantes simplificadas para mejorar rendimiento
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      duration: 0.5
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

const pageVariants = {
  initial: { opacity: 0 },
  animate: { 
    opacity: 1,
    transition: { duration: 0.4 }
  }
};

export default function AppearancePage() {
  // Efecto para añadir transiciones suaves entre cambios de tema
  // Optimizado para afectar menos elementos
  useEffect(() => {
    document.documentElement.classList.add('theme-transition');
    
    return () => {
      document.documentElement.classList.remove('theme-transition');
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 py-12 px-4 sm:px-6 transition-colors duration-300 relative">
      {/* Reducido a solo dos elementos decorativos estáticos para mejorar rendimiento */}
      <div className="absolute top-24 left-[15%] w-64 h-64 rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-3xl" />
      <div className="absolute bottom-24 right-[10%] w-80 h-80 rounded-full bg-purple-400/10 dark:bg-purple-600/10 blur-3xl" />
      
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        className="max-w-5xl mx-auto relative z-10"
      >
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-10"
        >
          <div className="inline-block relative mb-6">
            <div className="relative bg-white dark:bg-gray-800 rounded-full p-4 shadow-md">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 tracking-tight"
          >
            Personaliza tu experiencia
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
          >
            Adapta la apariencia de Hemeroteca Digital y crea un entorno visual que se ajuste perfectamente a tus preferencias
          </motion.p>
          
          <motion.div 
            className="flex flex-wrap justify-center gap-3 mt-6"
            variants={itemVariants}
          >
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <span className="mr-1.5 text-xs">✓</span> Modo oscuro/claro
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <span className="mr-1.5 text-xs">✓</span> Tamaño de fuente
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <span className="mr-1.5 text-xs">✓</span> Tipo de letra
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <span className="mr-1.5 text-xs">✓</span> Densidad de contenido
            </span>
          </motion.div>
        </motion.div>
      
        <motion.div 
          variants={itemVariants}
          className="relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl overflow-hidden shadow-lg"
        >
          {/* Header decorativo simplificado */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-3"></div>
          
          {/* Contenido real */}
          <div className="p-2" suppressHydrationWarning>
            {typeof window !== 'undefined' && <AppearanceSettings />}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Componente de carga optimizado
function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4 animate-pulse"></div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4 animate-pulse"></div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse"></div>
        <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-md hidden sm:block animate-pulse"></div>
      </div>
    </div>
  );
}
