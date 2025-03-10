import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
        
      }, 
      {
        protocol: "http", // Permite imágenes desde dominios HTTP
        hostname: "*", // Permite cualquier dominio
        pathname: "/**", // Permite cualquier ruta en esos dominios
      },
    ],
  },
};

export default nextConfig;
