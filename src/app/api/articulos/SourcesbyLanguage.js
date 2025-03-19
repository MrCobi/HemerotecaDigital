// src/app/api/articulos/SourcesbyLanguage.js
import { API_ROUTES } from "@/src/config/api-routes";

export const fetchSources = async (language) => {
    try {
      // Usar la función de listar fuentes filtradas por idioma
      const response = await fetch(API_ROUTES.sources.list(
        1, // página
        100, // límite alto para obtener todas las fuentes disponibles
        undefined, // sin filtrar por categoría
        undefined, // sin texto de búsqueda
        language // filtro por idioma
      ));
      
      const data = await response.json();
      return data.sources || [];
    } catch (error) {
      console.error("Error fetching sources:", error);
      return [];
    }
  };