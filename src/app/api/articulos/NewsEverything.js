// src/app/api/articulos/NewsHeadlines.js

export async function GETHeadLines(params) {
  const { sources, q, language, from, to, sortBy, pageSize = 9, page = 1 } = params;

  // Construir la URL de la API externa
  let apiUrl = `${process.env.NEXT_PUBLIC_NEWS_API_URL}/everything?`;

  if (sources && sources.trim()) apiUrl += `sources=${sources}&`;
  if (q && q.trim()) apiUrl += `q=${q}&searchIn=title,description&`;
  if (language && language.trim()) apiUrl += `language=${language}&`;
  if (from && from.trim()) apiUrl += `from=${from}&`;
  if (to && to.trim()) apiUrl += `to=${to}&`;
  if (sortBy && sortBy.trim()) apiUrl += `sortBy=${sortBy}&`;
  apiUrl += `pageSize=${pageSize}&page=${page}&`;

  // Agregar la clave de API desde las variables de entorno
  apiUrl += `apiKey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}`;

  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error("Error fetching news");
    }

    const data = await response.json();
    // Devolver ambos artículos y total de resultados para la paginación
    return {
      articles: data.articles || [],
      totalResults: data.totalResults || 0,
    };
  } catch (error) {
    console.error("Error fetching news:", error);
    throw new Error("Error fetching news");
  }
}
