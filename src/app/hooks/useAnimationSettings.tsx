"use client";

import { useEffect, useState } from 'react';

/**
 * Hook personalizado para determinar si las animaciones están habilitadas
 * basado en la configuración del usuario almacenada en localStorage
 */
export function useAnimationSettings() {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Primer useEffect solo para inicializar - se ejecuta una sola vez
  useEffect(() => {
    // Asegurarse de que estamos en el cliente
    if (typeof window === 'undefined') return;
    
    // Marcar como montado
    setMounted(true);
    
    // Leer la configuración inicial
    const savedSetting = localStorage.getItem('hemopress-animations');
    const initialValue = savedSetting === null || savedSetting === 'true';
    
    // Solo actualizar si es diferente al valor predeterminado (true)
    if (initialValue !== true) {
      setAnimationsEnabled(initialValue);
    }
  }, []);
  
  // Segundo useEffect para el observer - solo se ejecuta una vez después de montar
  useEffect(() => {
    // Verificar que estamos en el cliente y el componente está montado
    if (typeof window === 'undefined' || !mounted) return;
    
    // Función para manejar los cambios de atributos
    const handleAttributeChange = (mutations: MutationRecord[]) => {
      for (const mutation of mutations) {
        if (
          mutation.type === 'attributes' && 
          mutation.attributeName === 'data-animations' &&
          mutation.target === document.documentElement
        ) {
          const newValue = document.documentElement.getAttribute('data-animations') !== 'false';
          // Solo actualizar si el valor ha cambiado
          if (newValue !== animationsEnabled) {
            setAnimationsEnabled(newValue);
          }
        }
      }
    };
    
    // Crear un observador de atributos para detectar cambios en tiempo real
    const observer = new MutationObserver(handleAttributeChange);
    
    // Observar cambios en el atributo data-animations del elemento html
    observer.observe(document.documentElement, { attributes: true });
    
    // Limpiar el observador al desmontar
    return () => observer.disconnect();
  }, [mounted, animationsEnabled]);
  
  return animationsEnabled;
}

/**
 * Devuelve variantes condicionadas para framer-motion basadas en si las animaciones están habilitadas
 * @param enabledVariants Las variantes a usar cuando las animaciones están habilitadas
 * @param disabledVariants Las variantes a usar cuando las animaciones están deshabilitadas (normalmente sin animación)
 */
export function useConditionalAnimation<T extends Record<string, unknown>>(
  enabledVariants: T, 
  disabledVariants: Partial<T> = {}
) {
  const animationsEnabled = useAnimationSettings();
  return animationsEnabled ? enabledVariants : disabledVariants;
}

/**
 * Devuelve transiciones condicionadas para framer-motion basadas en si las animaciones están habilitadas
 * @param duration Duración de la transición cuando las animaciones están habilitadas
 */
export function useConditionalTransition(duration: number = 0.3) {
  const animationsEnabled = useAnimationSettings();
  return animationsEnabled ? {
    duration: duration,
    ease: "easeInOut"
  } : {
    duration: 0.001, // Valor mínimo positivo en lugar de 0
    ease: "easeInOut"
  };
}
