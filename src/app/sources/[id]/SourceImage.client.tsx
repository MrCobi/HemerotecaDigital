"use client";

import SafeImage from "@/src/components/ui/SafeImage";
import Image from "next/image";

export const SourceImage = ({
  imageUrl,
  name,
  size = "default", // eslint-disable-line @typescript-eslint/no-unused-vars
}: {
  imageUrl?: string;
  name: string;
  size?: "default" | "large" | "xlarge";
}) => {
  const trimmedImageUrl = imageUrl?.trimEnd();
  
  // Eliminamos las dimensiones fijas para permitir que el componente
  // se adapte al tamaño de su contenedor padre

  return (
    <div className="relative group w-full h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 rounded-full animate-pulse-slow"></div>
      <div className="absolute inset-0 rounded-full overflow-hidden border-4 border-white/90 shadow-xl transition-transform duration-300 group-hover:scale-105">
        {trimmedImageUrl ? (
          <SafeImage
            src={trimmedImageUrl}
            alt={`Logo de ${name}`}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
            sizes="(max-width: 640px) 12rem, (max-width: 768px) 16rem, 20rem"
            priority
            fallbackSrc="/images/default-source-image.svg"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors duration-300">
            <div className="flex items-center justify-center w-full h-full">
              <Image 
                src="/images/default-source-image.svg" 
                alt={`Logo de ${name}`} 
                fill
                sizes="(max-width: 640px) 12rem, (max-width: 768px) 16rem, 20rem"
                priority
                className="w-4/5 h-4/5 object-contain transition-transform duration-300 group-hover:scale-110"
              />
            </div>
          </div>
        )}
      </div>
      <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
    </div>
  );
};