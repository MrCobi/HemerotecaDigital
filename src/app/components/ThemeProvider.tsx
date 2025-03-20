"use client";

import React, { createContext, useState, useEffect, useContext } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  // Función para aplicar el tema según preferencia del sistema
  const applySystemTheme = () => {
    if (typeof window !== "undefined") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", prefersDark);
      document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
      document.documentElement.style.colorScheme = prefersDark ? "dark" : "light";
    }
  };

  // Función para aplicar un tema específico
  const applyTheme = (newTheme: Theme) => {
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
  };

  // Cambiar el tema y guardarlo
  const changeTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    if (typeof window !== "undefined") {
      localStorage.setItem("hemopress-theme", newTheme);
    }
    applyTheme(newTheme);
  };

  // Cargar el tema guardado cuando el componente se monta
  useEffect(() => {
    setMounted(true);
    
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("hemopress-theme") as Theme | null;
      if (savedTheme) {
        setTheme(savedTheme);
        applyTheme(savedTheme);
      } else {
        // Si no hay tema guardado, usar preferencia del sistema
        setTheme("system");
        applySystemTheme();
      }
    }
    
    // Asegurarse de aplicar el tema cuando la aplicación se rehidrata
    return () => {
      if (typeof window !== "undefined") {
        const matchMedia = window.matchMedia("(prefers-color-scheme: dark)");
        matchMedia.removeEventListener("change", () => applySystemTheme());
      }
    };
  }, []);

  // Evitar problema de hidratación
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: changeTheme }}>
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
