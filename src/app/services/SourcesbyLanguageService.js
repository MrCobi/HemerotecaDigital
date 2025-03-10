import { fetchSources as fetchSourcesFromAPI } from '../api/articulos/SourcesbyLanguage';

export const fetchSources = async (language, setLoadingSources, setAvailableSources) => {
  setLoadingSources(true);
  try {
    const cacheKey = `sources_${language}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
      const { sources, timestamp } = JSON.parse(cachedData);

      // Verificar si el caché es válido (24 horas = 86400000 ms)
      if (Date.now() - timestamp < 86400000) {
        setAvailableSources(sources);
        setLoadingSources(false);
        return;
      }
    }

    // Si no hay datos en caché o el caché está expirado, llama a la API
    const sources = await fetchSourcesFromAPI(language);

    // Guardar las fuentes y un timestamp en el caché
    localStorage.setItem(
      cacheKey,
      JSON.stringify({ sources, timestamp: Date.now() })
    );

    setAvailableSources(sources);
  } catch (error) {
    console.error("Error fetching sources:", error);
    setAvailableSources([]);
  } finally {
    setLoadingSources(false);
  }
};
