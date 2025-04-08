import Image from 'next/image';
import { useState } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  fill?: boolean;
  sizes?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  priority = false,
  fill = false,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onError,
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Optimize Unsplash URLs
  const optimizedSrc = src.includes('unsplash.com') 
    ? src.replace(/\?q=80&w=[0-9]+&auto=format&fit=crop/, '?q=75&w=800&auto=format') 
    : src;
  
  return (
    <div className={`${className} ${isLoading ? 'bg-gray-200 animate-pulse' : ''}`}>
      <Image
        src={optimizedSrc}
        alt={alt}
        width={fill ? undefined : (width || 800)}
        height={fill ? undefined : (height || 600)}
        className={`${className} transition-opacity duration-500 ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoadingComplete={() => setIsLoading(false)}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        fill={fill}
        sizes={sizes}
        quality={75}
        onError={onError}
      />
    </div>
  );
}
