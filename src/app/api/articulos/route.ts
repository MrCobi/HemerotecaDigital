// src/app/api/articulos/route.ts
import { NextResponse } from 'next/server';
import { GETHeadLines } from './NewsEverything';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  try {
    const params = {
      sources: searchParams.get('sources') || '',
      q: searchParams.get('q') || '',
      language: searchParams.get('language') || 'es',
      from: searchParams.get('from') || '',
      to: searchParams.get('to') || '',
      sortBy: searchParams.get('sortBy') || 'publishedAt',
      pageSize: Number(searchParams.get('pageSize')) || 21,
      page: Number(searchParams.get('page')) || 1,
    };

    const data = await GETHeadLines(params);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error en el endpoint /api/articulos:', error);
    return NextResponse.json(
      { error: 'Error al obtener artículos' },
      { status: 500 }
    );
  }
}