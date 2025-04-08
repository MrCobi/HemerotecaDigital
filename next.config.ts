// next-config.ts
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
        protocol: "http",
        hostname: "*",
        pathname: "/**",
      },
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = { 
      ...config.resolve.fallback,
      net: false,
      tls: false,
      dns: false,
      fs: false
    };
    return config;
  },
  env: {
    WS_SERVER_URL: process.env.NODE_ENV === 'production' 
      ? 'wss://88.17.253.233:3000' 
      : 'ws://192.168.1.97:3000'
  },
  // Update experimental configurations to be compatible with Next.js 15.2.4
  experimental: {
    optimizeCss: true,
  },
};

export default nextConfig;