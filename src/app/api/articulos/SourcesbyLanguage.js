// src/app/api/articulos/SourcesbyLanguage.js
export const fetchSources = async (language) => {
    try {
      let apiUrl = `${process.env.NEXT_PUBLIC_NEWS_API_URL}/top-headlines/sources?language=${language}&apiKey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}`;
      const response = await fetch(apiUrl); // Reemplaza con la URL de tu API
      const data = await response.json();
      return data.sources || [];
    } catch (error) {
      console.error("Error fetching sources:", error);
      return [];
    }
  };