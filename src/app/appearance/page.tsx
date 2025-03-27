"use client";

import React, { useEffect } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import Image from 'next/image';

// Utilizamos dynamic import para evitar el error durante el prerender
const AppearanceSettings = dynamic(
  () => import('@/src/app/components/AppearanceSettings').then(mod => mod.AppearanceSettings),
  { 
    ssr: false,
    loading: () => <LoadingSkeleton />
  }
);

// Animaciones para elementos decorativos
const floatingAnimation = {
  initial: { y: 0, opacity: 0.7 },
  animate: { 
    y: [0, -15, 0], 
    opacity: [0.7, 1, 0.7],
    transition: { 
      repeat: Infinity, 
      duration: 3,
      ease: "easeInOut",
    }
  }
};

// Variantes para animaciones escalonadas
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2
    }
  }
};

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: { 
    y: 0, 
    opacity: 1,
    transition: { duration: 0.7, ease: [0.25, 0.1, 0.25, 1.0] }
  }
};

const pageVariants = {
  initial: { opacity: 0, y: -20 },
  animate: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" }
  },
  exit: { opacity: 0, y: 20 }
};

export default function AppearancePage() {
  // Efecto para añadir transiciones suaves entre cambios de tema
  useEffect(() => {
    // Aplicar transición a elementos base del documento
    document.documentElement.style.transition = "background-color 0.5s ease, color 0.5s ease";
    document.body.style.transition = "background-color 0.5s ease, color 0.5s ease";
    
    // Seleccionar elementos que cambian con el tema para aplicar transición
    const elementsToTransition = document.querySelectorAll('.bg-white, .bg-gray-100, .bg-gray-200, .dark\\:bg-gray-800, .dark\\:bg-gray-700, .dark\\:bg-gray-900');
    
    elementsToTransition.forEach(element => {
      if (element instanceof HTMLElement) {
        element.style.transition = "background-color 0.5s ease, color 0.5s ease, border-color 0.5s ease, box-shadow 0.5s ease";
      }
    });
    
    return () => {
      // Limpieza de estilos al desmontar el componente
      document.documentElement.style.transition = "";
      document.body.style.transition = "";
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-blue-950 dark:to-purple-950 py-12 px-4 sm:px-6 transition-all duration-500 relative overflow-hidden">
      {/* Elementos decorativos */}
      <motion.div 
        className="absolute top-24 left-[15%] w-64 h-64 rounded-full bg-blue-400/10 dark:bg-blue-600/10 blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.5, 0.7, 0.5]
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      <motion.div 
        className="absolute bottom-24 right-[10%] w-96 h-96 rounded-full bg-purple-400/10 dark:bg-purple-600/10 blur-3xl"
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      <motion.div 
        className="absolute top-1/2 right-[20%] w-32 h-32 rounded-full bg-blue-500/5 dark:bg-blue-400/10 blur-xl"
        {...floatingAnimation}
      />
      
      <motion.div 
        className="absolute top-1/4 left-1/3 w-24 h-24 rounded-full bg-purple-500/5 dark:bg-purple-400/10 blur-xl"
        animate={{
          y: [0, -20, 0],
          opacity: [0.5, 0.8, 0.5]
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1.5
        }}
      />
      
      <motion.div
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="max-w-5xl mx-auto relative z-10"
      >
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <motion.div 
            className="inline-block relative mb-6"
            animate={{ rotate: [0, 2, 0, -2, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 blur-lg opacity-30 rounded-full"></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-full p-4 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
          </motion.div>
          
          <motion.h1 
            className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 tracking-tight"
          >
            Personaliza tu experiencia
          </motion.h1>
          
          <motion.p 
            className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed"
          >
            Adapta la apariencia de Hemeroteca Digital y crea un entorno visual que se ajuste perfectamente a tus preferencias
          </motion.p>
          
          <motion.div 
            className="flex flex-wrap justify-center gap-3 mt-6"
            variants={itemVariants}
          >
            <motion.span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <span className="mr-1.5 text-xs">✓</span> Modo oscuro/claro
            </motion.span>
            <motion.span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <span className="mr-1.5 text-xs">✓</span> Tamaño de fuente
            </motion.span>
            <motion.span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <span className="mr-1.5 text-xs">✓</span> Tipo de letra
            </motion.span>
            <motion.span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
              <span className="mr-1.5 text-xs">✓</span> Densidad de contenido
            </motion.span>
          </motion.div>
        </motion.div>
      
        <motion.div 
          variants={itemVariants}
          className="relative"
        >
          {/* Efectos de profundidad para la tarjeta */}
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl dark:from-blue-600/30 dark:to-purple-600/30 transform -rotate-1 scale-105 opacity-70"></div>
          <div className="absolute -inset-2 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-2xl blur-xl transform rotate-1 scale-105 opacity-50"></div>
          
          <div className="relative backdrop-blur-sm shadow-xl rounded-xl overflow-hidden">
            <div className="absolute inset-0 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md z-0"></div>
            
            <div className="relative z-10 bg-white/80 dark:bg-gray-800/80 border border-gray-100 dark:border-gray-700/50 rounded-xl overflow-hidden shadow-xl dark:shadow-blue-900/30">
              {/* Header decorativo */}
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-3"></div>
              
              {/* Contenido real */}
              <div suppressHydrationWarning className="p-2">
                {typeof window !== 'undefined' && <AppearanceSettings />}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// Componente de carga
function LoadingSkeleton() {
  return (
    <div className="p-8 space-y-8 animate-pulse">
      <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-2/3"></div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
        <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded-md"></div>
      </div>
    </div>
  );
}
