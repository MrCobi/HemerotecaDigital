// src/app/api/articulos/SourcesbyLanguage.js
import { API_ROUTES } from "@/src/config/api-routes";

export const fetchSources = async (language) => {
    try {
      // Verificar que el idioma no sea vacío o nulo
      const languageFilter = language && language !== 'all' ? language : undefined;
      
      // Llamar a la API con el parámetro de idioma explícito
      const response = await fetch(API_ROUTES.sources.list(
        1, // página
        100, // límite alto para obtener todas las fuentes disponibles
        languageFilter, // filtro por idioma
        undefined // sin texto de búsqueda
      ));
      
      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`Fuentes obtenidas para idioma ${language}:`, data.sources?.length || 0);
      return data.sources || [];
    } catch (error) {
      console.error("Error fetching sources:", error);
      return [];
    }
  };