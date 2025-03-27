"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";

// Componente que se encarga de cargar y aplicar las preferencias de apariencia
// guardadas en localStorage cuando la aplicación se inicia
export default function AppearanceLoader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const { setTheme, forcedTheme, theme, systemTheme } = useTheme();

  useEffect(() => {
    // Sólo ejecutar en el cliente
    if (typeof window === "undefined") return;

    // Si estamos en la página de inicio, solo aplicamos el tema del sistema (claro/oscuro)
    // y no aplicamos ninguna configuración personalizada
    if (isHomePage) {
      // Detectar la preferencia del sistema operativo para el tema
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Forzar el tema según la preferencia del sistema
      setTheme('system');
      
      // Eliminar cualquier configuración personalizada que pudiera haber
      document.documentElement.removeAttribute("data-theme");
      document.documentElement.removeAttribute("data-font-size");
      document.documentElement.removeAttribute("data-font-family");
      document.documentElement.removeAttribute("data-content-density");
      document.documentElement.removeAttribute("data-animations");
      
      // Eliminar todas las posibles claves relacionadas con el tema
      localStorage.removeItem("theme");
      localStorage.removeItem("hemopress-theme");
      
      console.log('En página principal: Forzando tema del sistema. SystemPrefersDark:', systemPrefersDark);
      console.log('Estado actual de temas - theme:', theme, 'systemTheme:', systemTheme, 'forcedTheme:', forcedTheme);
      
      // Configurar un listener para cambios en el tema del sistema
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        console.log('Cambio detectado en preferencia del sistema:', e.matches ? 'dark' : 'light');
        // No es necesario llamar a setTheme aquí ya que estamos usando 'system'
      };
      
      // Agregar listener y limpiarlo cuando el componente se desmonte
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }

    // En el resto de páginas, aplicamos todas las configuraciones personalizadas
    
    // Cargar y aplicar el tamaño de fuente
    const savedFontSize = localStorage.getItem("hemopress-font-size");
    if (savedFontSize) {
      document.documentElement.setAttribute("data-font-size", savedFontSize);
    }

    // Cargar y aplicar la familia de fuente
    const savedFontFamily = localStorage.getItem("hemopress-font-family");
    if (savedFontFamily) {
      document.documentElement.setAttribute("data-font-family", savedFontFamily);
    }

    // Cargar y aplicar la densidad de contenido
    const savedContentDensity = localStorage.getItem("hemopress-content-density");
    if (savedContentDensity) {
      document.documentElement.setAttribute("data-content-density", savedContentDensity);
    }

    // Cargar y aplicar la configuración de animaciones
    const savedEnableAnimations = localStorage.getItem("hemopress-animations");
    if (savedEnableAnimations !== null) {
      document.documentElement.setAttribute("data-animations", savedEnableAnimations);
    }
  }, [isHomePage, setTheme, theme, systemTheme, forcedTheme]);

  // Este componente no tiene que renderizar nada
  return null;
}
