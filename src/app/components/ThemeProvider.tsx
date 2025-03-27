"use client";

import { createContext, useState, useEffect, useContext, useCallback } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  forcedTheme?: Theme;
  systemTheme?: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isHomePage = pathname === "/";

  // Función para aplicar el tema según preferencia del sistema
  const applySystemTheme = useCallback(() => {
    if (typeof window !== "undefined") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setSystemTheme(prefersDark ? "dark" : "light");
      document.documentElement.classList.toggle("dark", prefersDark);
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
      document.documentElement.style.colorScheme = prefersDark ? "dark" : "light";
    }
  }, []);

  // Función para aplicar un tema específico
  const applyTheme = useCallback((newTheme: Theme) => {
    if (typeof window === "undefined") return;

    if (newTheme === "system") {
      applySystemTheme();
      
      // Agregar listener para cambios en la preferencia del sistema
      const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => applySystemTheme();
      
      // Eliminar listener anterior si existe
      matchMedia.removeEventListener("change", handleChange);
      // Agregar nuevo listener
      matchMedia.addEventListener("change", handleChange);
      
      // Guardar el listener para limpieza
      return () => matchMedia.removeEventListener("change", handleChange);
    } else {
      // Eliminar listener si existe
      const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");
      matchMedia.removeEventListener("change", () => applySystemTheme());
      
      // Aplicar tema claro u oscuro
      const isDark = newTheme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.setAttribute("data-theme", newTheme);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }
  }, [applySystemTheme]);

  // Cambiar el tema y guardarlo
  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    
    // No guardar el tema en localStorage si estamos en la página principal
    if (typeof window !== "undefined" && !isHomePage) {
      localStorage.setItem("hemopress-theme", newTheme);
    }
    
    applyTheme(newTheme);
  };

  // Cargar el tema cuando el componente se monta
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== "undefined") {
      // En la página principal, usar siempre el tema del sistema
      if (isHomePage) {
        console.log("HomePage: Forzando tema del sistema");
        setTheme("system");
        applySystemTheme();
        
        // Configurar listener para cambios en tiempo real
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => {
          console.log("Cambio detectado en preferencia del sistema en HomePage");
          applySystemTheme();
        };
        
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
      } 
      // En otras páginas, cargar el tema guardado
      else {
        const savedTheme = localStorage.getItem("hemopress-theme") as Theme | null;
        if (savedTheme) {
          console.log("Cargando tema guardado:", savedTheme);
          setTheme(savedTheme);
          applyTheme(savedTheme);
        } else {
          console.log("No hay tema guardado, usando sistema");
          setTheme("system");
          applySystemTheme();
        }
      }
    }
  }, [applyTheme, applySystemTheme, isHomePage]);

  // Evitar problema de hidratación
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme: changeTheme,
        systemTheme,
        forcedTheme: isHomePage ? "system" : undefined 
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// Hook personalizado para usar el tema
export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
