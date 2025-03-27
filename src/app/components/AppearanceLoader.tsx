"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Componente que se encarga de cargar y aplicar las preferencias de apariencia
// guardadas en localStorage cuando la aplicación se inicia
export default function AppearanceLoader() {
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  useEffect(() => {
    // Sólo ejecutar en el cliente
    if (typeof window === "undefined") return;

    // Si estamos en la página de inicio, solo aplicamos el tema (claro/oscuro)
    // y no aplicamos las demás configuraciones personalizadas
    if (isHomePage) {
      // Eliminamos cualquier configuración personalizada que pudiera haber sido aplicada
      document.documentElement.removeAttribute("data-font-size");
      document.documentElement.removeAttribute("data-font-family");
      document.documentElement.removeAttribute("data-content-density");
      document.documentElement.removeAttribute("data-animations");
      return;
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
  }, [isHomePage]);

  // Este componente no tiene que renderizar nada
  return null;
}
