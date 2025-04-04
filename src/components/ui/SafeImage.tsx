"use client";

import { useState } from "react";
import Image, { ImageProps } from "next/image";

/**
 * SafeImage es un componente que maneja de forma segura diferentes formatos de URLs de imágenes,
 * especialmente para trabajar con Cloudinary y evitar errores comunes con next/image.
 */
export const SafeImage = ({
  src,
  alt,
  fallbackSrc = "/images/placeholder.webp",
  ...props
}: Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  fallbackSrc?: string;
}) => {
  const [error, setError] = useState(false);

  // Función para normalizar las URLs de imágenes
  const getSafeImageUrl = (url?: string | null): string => {
    if (!url) return fallbackSrc;
    
    // Manejar URLs duplicadas de Cloudinary (problema común)
    if (url.includes('https://res.cloudinary.com') && 
        url.indexOf('https://res.cloudinary.com') !== url.lastIndexOf('https://res.cloudinary.com')) {
      // Extraer la segunda URL (la real)
      const secondUrlStart = url.lastIndexOf('https://res.cloudinary.com');
      url = url.substring(secondUrlStart);
    }
    
    // Si ya es una URL completa de Cloudinary, mejorar la calidad
    if (url.startsWith('https://res.cloudinary.com/')) {
      // Verificar si ya tiene transformaciones
      if (url.includes('/image/upload/')) {
        // Insertar parámetros de alta calidad después de /upload/
        const parts = url.split('/image/upload/');
        // Añadir parámetros de transformación para alta resolución y calidad
        return `${parts[0]}/image/upload/q_auto:best,f_auto,dpr_2.0/${parts[1]}`;
      } else {
        // Formato alternativo que podrían tener las URLs
        return url.replace('https://res.cloudinary.com/', 
                          'https://res.cloudinary.com/image/upload/q_auto:best,f_auto,dpr_2.0/');
      }
    }
    
    // Si es una URL absoluta no de Cloudinary, usarla directamente
    if (url.startsWith('http')) return url;
    
    // Si es un public_id de Cloudinary sin la URL completa
    if (url.includes('cloudinary') || url.includes('user_uploads')) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dlg8j3g5k';
      // Añadir parámetros de transformación para alta resolución
      return `https://res.cloudinary.com/${cloudName}/image/upload/q_auto:best,f_auto,dpr_2.0/${url}`;
    }
    
    // Si es una ruta relativa, asegurarse de que empiece con /
    if (!url.startsWith('/')) return `/${url}`;
    
    return url;
  };

  const safeUrl = error ? fallbackSrc : getSafeImageUrl(src);

  return (
    <Image
      src={safeUrl}
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
};

export default SafeImage;
