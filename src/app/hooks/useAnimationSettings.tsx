"use client";

import { useEffect, useState } from 'react';

/**
 * Hook personalizado para determinar si las animaciones están habilitadas
 * basado en la configuración del usuario almacenada en localStorage
 */
export function useAnimationSettings() {
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  
  useEffect(() => {
    // Verificar configuración al montar el componente
    const checkAnimationSettings = () => {
      if (typeof window === 'undefined') return true;
      
      const savedSetting = localStorage.getItem('hemopress-animations');
      return savedSetting === null || savedSetting === 'true';
    };
    
    setAnimationsEnabled(checkAnimationSettings());
    
    // Crear un observador de atributos para detectar cambios en tiempo real
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' && 
          mutation.attributeName === 'data-animations' &&
          mutation.target === document.documentElement
        ) {
          const isEnabled = document.documentElement.getAttribute('data-animations') !== 'false';
          setAnimationsEnabled(isEnabled);
        }
      });
    });
    
    // Observar cambios en el atributo data-animations del elemento html
    observer.observe(document.documentElement, { attributes: true });
    
    // Limpiar el observador al desmontar
    return () => observer.disconnect();
  }, []);
  
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
