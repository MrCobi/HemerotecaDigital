// src/app/services/HeadLinesService.js

import { GETHeadLines } from "../api/articulos/NewsEverything";

export const fetchTopHeadlines = async (params) => {
  try {
    // Llamamos directamente a la función GETHeadLines
    const articles = await GETHeadLines(params);

    // Devolver los artículos obtenidos
    return articles;
  } catch (error) {
    console.error('Error al obtener los titulares:', error);
    throw new Error('Error al obtener los titulares');
  }
};
