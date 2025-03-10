// src/app/categories/[category]/page.tsx
"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/app/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';

interface Source {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl: string | null;
  category: string;
  language: string;
  country: string;
}

export default function CategoryPage() {
  const { category } = useParams();
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      try {
        if (!category) {
          throw new Error('Categoría no especificada');
        }

        const categoryName = Array.isArray(category) ? category[0] : category;
        const encodedCategory = encodeURIComponent(categoryName);
        
        const response = await fetch(`/api/sources/categories/${encodedCategory}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar las fuentes');
        }

        const data = await response.json();
        setSources(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSources();
  }, [category]);

  const getCategoryName = () => {
    try {
      return decodeURIComponent(category as string);
    } catch {
      return 'Categoría desconocida';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen text-red-500">
        {error}
      </div>
    );
  }

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">
        Fuentes en la categoría: {getCategoryName()}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sources.map((source) => (
          <Card key={source.id} className="hover:shadow-lg transition-shadow duration-300">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-800 dark:text-white">
                {source.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {source.imageUrl && (
                <div className="relative h-48 mb-4 rounded-lg overflow-hidden">
                  <Image
                    src={source.imageUrl}
                    alt={source.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                </div>
              )}
              
              <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                {source.description}
              </p>

              <div className="flex flex-wrap gap-2 mb-4">
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full text-sm">
                  {source.category}
                </span>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-full text-sm">
                  {source.language}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <Link href={source.url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline">
                    Visitar Sitio
                  </Button>
                </Link>
                <Link href={`/sources/${source.id}`}>
                  <Button>
                    Ver Detalles
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {sources.length === 0 && (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No se encontraron fuentes en esta categoría
        </div>
      )}
    </main>
  );
}