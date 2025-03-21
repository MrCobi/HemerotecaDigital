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
    
    // Si ya es una URL absoluta, usarla directamente
    if (url.startsWith('http')) return url;
    
    // Si es un public_id de Cloudinary, construir la URL completa
    if (url.includes('cloudinary') || url.includes('user_uploads')) {
      const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
      return `https://res.cloudinary.com/${cloudName}/image/upload/${url}`;
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
