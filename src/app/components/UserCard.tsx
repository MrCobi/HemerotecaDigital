"use client";

import { UserPrisma as User } from "@/src/interface/user"
import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "@/src/app/components/ui/card";
import { Badge } from "@/src/app/components/ui/badge";
import Link from "next/link";
import { memo, useEffect, useState } from "react";
import { CldImage } from 'next-cloudinary';
import { User as UserIcon, MessageCircle, ChevronRight, Users } from "lucide-react";

interface UserCardProps {
  user: Pick<User, "id" | "name" | "username" | "image"> & {
    bio?: string | null;
    stats?: {
      followers?: number;
      following?: number;
      posts?: number;
    };
  };
  action?: React.ReactNode;
  variant?: string;
}

export const UserCard = memo(function UserCard({ user, action }: UserCardProps) {
  const [mounted, setMounted] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    setMounted(true);
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(isDark);
    
    // Listener para cambios en el tema
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => setIsDarkMode(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const getGradient = (username: string) => {
    // Gradientes para modo claro
    const lightGradients = [
      "from-blue-500 to-indigo-700",
      "from-indigo-500 to-purple-700",
      "from-purple-500 to-pink-700",
      "from-blue-500 to-cyan-700",
      "from-cyan-500 to-blue-700",
      "from-teal-500 to-emerald-700",
      "from-emerald-500 to-green-700",
      "from-sky-500 to-blue-700",
      "from-violet-500 to-purple-700",
      "from-fuchsia-500 to-pink-700",
    ];

    // Gradientes para modo oscuro - un poco más vibrantes para destacar mejor
    const darkGradients = [
      "from-blue-600 to-indigo-900",
      "from-indigo-600 to-purple-900",
      "from-purple-600 to-pink-900",
      "from-blue-600 to-cyan-900",
      "from-cyan-600 to-blue-900",
      "from-teal-600 to-emerald-900",
      "from-emerald-600 to-green-900",
      "from-sky-600 to-blue-900",
      "from-violet-600 to-purple-900",
      "from-fuchsia-600 to-pink-900",
    ];

    // Generar un índice basado en el username
    const sum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = sum % lightGradients.length;
    
    // Usar el modo oscuro detectado en el efecto
    return mounted ? (isDarkMode ? darkGradients[index] : lightGradients[index]) : darkGradients[index];
  };
  
  // Generar un patrón decorativo basado en el nombre de usuario
  const getPattern = (username: string) => {
    const patterns = [
      "radial-gradient(circle at 15% 50%, rgba(255, 255, 255, 0.1) 15%, transparent 16%)", 
      "radial-gradient(circle at 85% 30%, rgba(255, 255, 255, 0.1) 12%, transparent 13%)",
      "linear-gradient(45deg, rgba(255, 255, 255, 0.05) 25%, transparent 25%, transparent 50%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.05) 75%, transparent 75%, transparent)",
      "repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.03) 0, rgba(255, 255, 255, 0.03) 1px, transparent 1px, transparent 4px)"
    ];
    
    const sum = username.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = sum % patterns.length;
    
    return patterns[index];
  };

  // Extraer primera letra para mostrar en caso de no tener imagen
  const getInitial = (name: string | null) => {
    if (!name) return "U";
    return name.charAt(0).toUpperCase();
  };

  // Generar una experiencia más rica
  return (
    <Card className="group overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 shadow-md hover:shadow-xl bg-white dark:bg-gray-800/95 h-full relative">
      {/* Efecto de borde decorativo superior */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 dark:from-purple-500 dark:via-blue-500 dark:to-cyan-500"></div>
      
      {/* Header con gradiente y patrones */}
      <div className="relative">
        <div 
          className={`h-24 bg-gradient-to-r ${getGradient(user.username || "")}`}
          style={{ 
            backgroundImage: `${getPattern(user.username || "")}, 
            radial-gradient(circle at 20% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 40%),
            radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.1) 0%, transparent 40%)`
          }}
        >
          {/* Efectos decorativos dinámicos */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full blur-lg transform -translate-x-1/3 translate-y-1/3"></div>
          <div className="absolute bottom-0 right-1/4 w-16 h-16 bg-white/5 rounded-full blur-md"></div>
          
          {/* Puntos decorativos con animación */}
          <div className="absolute inset-0 opacity-30">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i}
                className={`absolute w-${Math.random() > 0.5 ? '1.5' : '1'} h-${Math.random() > 0.5 ? '1.5' : '1'} bg-white rounded-full animate-pulse`}
                style={{
                  top: `${10 + Math.random() * 80}%`,
                  left: `${Math.random() * 100}%`,
                  animationDuration: `${3 + Math.random() * 5}s`,
                  opacity: 0.1 + Math.random() * 0.5
                }}
              ></div>
            ))}
          </div>
          
          {/* Líneas decorativas */}
          <div className="absolute inset-0 opacity-10 overflow-hidden">
            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-white to-transparent top-1/4"></div>
            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-white to-transparent top-2/4"></div>
            <div className="absolute h-px w-full bg-gradient-to-r from-transparent via-white to-transparent top-3/4"></div>
          </div>
        </div>
        
        {/* Badge flotante con información de seguidores */}
        {user.stats?.followers !== undefined && (
          <div className="absolute top-3 right-3 z-10">
            <Badge 
              className="bg-white/90 dark:bg-gray-800 text-gray-700 dark:text-gray-300 shadow-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-800/95 transition-colors"
            >
              <Users className="w-3.5 h-3.5 mr-1" />
              {user.stats.followers === 1 ? '1 seguidor' : `${user.stats.followers} seguidores`}
            </Badge>
          </div>
        )}

        {/* Arco decorativo */}
        <div className="absolute left-0 right-0 h-8 -bottom-4 bg-white dark:bg-gray-800/95 rounded-t-full z-10"></div>

        {/* Contenido principal */}
        <div className="relative pt-12 px-6 text-center z-20">
          {/* Avatar con efecto de elevación */}
          <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2">
            <motion.div 
              whileHover={{ scale: 1.05 }}
              className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-700 shadow-lg group-hover:ring-blue-200 dark:group-hover:ring-blue-800 transition-all duration-300"
            >
              {/* Decoración de halo detrás del avatar */}
              <div className="absolute inset-0 -z-10 w-28 h-28 -left-4 -top-4 bg-gradient-to-br from-blue-400/30 to-purple-400/30 dark:from-blue-500/40 dark:to-purple-500/40 rounded-full blur-xl"></div>
              
              {user.image && (user.image.includes('cloudinary') || 
              (!user.image.startsWith('/') && !user.image.startsWith('http'))) ? (
                <CldImage
                  src={(() => {
                    let publicId = user.image;
                    if (user.image.includes('cloudinary.com')) {
                      const match = user.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                      if (match && match[1]) {
                        publicId = `hemeroteca_digital/${match[1]}`;
                      } else {
                        publicId = user.image.replace(/.*\/v\d+\//, '').split('?')[0];
                      }
                    }
                    if (publicId.includes('https://')) {
                      publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                    }
                    return publicId;
                  })()}
                  alt={user.name || "User"}
                  width={80}
                  height={80}
                  crop="fill"
                  gravity="face"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : (
                <div className="w-full h-full relative">
                  {user.image ? (
                    <Image
                      src={user.image || "/images/AvatarPredeterminado.webp"}
                      alt={user.name || "User"}
                      width={80}
                      height={80}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-purple-500 dark:from-blue-500 dark:to-purple-600 text-white text-2xl font-bold">
                      {getInitial(user.name)}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          {/* Información del usuario */}
          <Link href={`/users/${user.username}`} className="block pb-4 pt-8">
            <div className="space-y-2">
              <motion.h3 
                whileHover={{ scale: 1.02 }}
                className="text-xl font-bold tracking-tight text-gray-900 dark:text-white truncate max-w-[200px] mx-auto group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
              >
                {user.name}
              </motion.h3>
              
              <div className="inline-flex items-center gap-1.5 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-full">
                <UserIcon className="h-3.5 w-3.5" />
                <p className="text-sm font-medium">@{user.username}</p>
              </div>
              
              {/* Separador estilizado */}
              <div className="w-20 h-0.5 bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 dark:from-blue-600 dark:via-purple-600 dark:to-pink-600 mx-auto my-2"></div>
              
              {/* Bio con estilo elegante */}
              {user.bio && (
                <div className="relative px-2 py-3 mt-2 bg-gray-50 dark:bg-gray-800 rounded-lg border-l-2 border-blue-300 dark:border-blue-700">
                  <MessageCircle className="absolute left-2 top-2 h-3.5 w-3.5 text-blue-400 dark:text-blue-500" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 italic pl-7 pr-2 text-left">
                    &quot;{user.bio}&quot;
                  </p>
                </div>
              )}
            </div>
            
            {/* Indicador de interacción */}
            <div className="mt-4 flex items-center justify-center text-xs text-white font-medium bg-gradient-to-r from-blue-400 to-purple-400 dark:from-blue-500 dark:to-purple-500 py-1.5 px-4 rounded-full shadow-sm hover:shadow transform hover:scale-105 transition-all duration-300 w-max mx-auto">
              <span>Ver perfil</span>
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </div>
          </Link>
        </div>
      </div>

      {/* Acción (botón de seguir) */}
      {action && (
        <div className="px-6 py-3 flex justify-center border-t border-gray-100 dark:border-gray-700/50 bg-gradient-to-b from-gray-50 to-white dark:from-gray-800/70 dark:to-gray-800/90">
          {action}
        </div>
      )}
    </Card>
  );
});