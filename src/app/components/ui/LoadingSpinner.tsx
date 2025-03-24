'use client';

import { cn } from "@/src/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export default function LoadingSpinner({ className, size = 'medium' }: LoadingSpinnerProps) {
  // Define size classes based on the size prop
  const sizeClasses = {
    small: "h-8 w-8",
    medium: "h-16 w-16",
    large: "h-24 w-24"
  };

  const containerClasses = {
    small: "h-20",
    medium: "h-64",
    large: "h-80"
  };

  const textClasses = {
    small: "text-sm",
    medium: "text-lg",
    large: "text-xl"
  };

  return (
    <div className={cn(`flex items-center justify-center ${containerClasses[size]}`, className)}>
      <div className="relative">
        <div className={`${sizeClasses[size]} rounded-full border-t-4 border-b-4 border-blue-500 animate-spin`}></div>
        <div className={`absolute top-0 left-0 ${sizeClasses[size]} rounded-full border-t-4 border-b-4 border-blue-300 animate-spin`} style={{ animationDirection: 'reverse', opacity: 0.6 }}></div>
      </div>
      {size !== 'small' && <p className={`ml-4 ${textClasses[size]} font-medium text-blue-300`}>Cargando...</p>}
    </div>
  );
}
