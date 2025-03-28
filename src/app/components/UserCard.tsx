"use client";

import { UserPrisma as User } from "@/src/interface/user"
import Image from "next/image";
import { motion } from "framer-motion";
import { Card } from "@/src/app/components/ui/card";
import { Badge } from "@/src/app/components/ui/badge";
import Link from "next/link";
import { memo } from "react";
import { CldImage } from 'next-cloudinary';

interface UserCardProps {
  user: Pick<User, "id" | "name" | "username" | "image"> & {
    bio?: string | null;
  };
  action?: React.ReactNode;
  variant?: string;
}

export const UserCard = memo(function UserCard({ user, action }: UserCardProps) {
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
    
    // Detectar el modo oscuro
    const isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    return isDarkMode ? darkGradients[index] : lightGradients[index];
  };

  return (
    <Card className="group overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 shadow-sm hover:shadow-lg bg-white dark:bg-gray-800/90 h-full">
      <Link href={`/users/${user.username}`} className="block">
        <div className="relative">
          <div className={`h-16 bg-gradient-to-r ${getGradient(user.username || "")}`}>
            {/* Efectos decorativos dinámicos */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full blur-lg transform -translate-x-1/3 translate-y-1/3"></div>
            <div className="absolute bottom-0 right-1/4 w-12 h-12 bg-white/5 rounded-full blur-md"></div>
          </div>

          <div className="relative pt-10 px-6 text-center">
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-16 h-16 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-700 shadow-lg group-hover:ring-blue-200 dark:group-hover:ring-blue-900 transition-all duration-300">
                {user.image && (user.image.includes('cloudinary') || 
                (!user.image.startsWith('/') && !user.image.startsWith('http'))) ? (
                  <CldImage
                    src={(() => {
                      // Extraer el public_id limpio, manejando diferentes formatos
                      let publicId = user.image;

                      // Si es una URL completa de Cloudinary
                      if (user.image.includes('cloudinary.com')) {
                        // Extraer el public_id eliminando la parte de la URL
                        const match = user.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                        if (match && match[1]) {
                          publicId = `hemeroteca_digital/${match[1]}`;
                        } else {
                          publicId = user.image.replace(/.*\/v\d+\//, '').split('?')[0];
                        }
                      }

                      // Verificar que el ID no esté duplicado o anidado
                      if (publicId.includes('https://')) {
                        console.warn('ID público contiene URL completa:', publicId);
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
                      console.error('Error cargando imagen en UserCard:', user.image);
                      const target = e.target as HTMLImageElement;
                      target.src = "/images/AvatarPredeterminado.webp";
                    }}
                  />
                ) : (
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
                )}
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold tracking-tight text-black dark:text-white truncate max-w-[200px] mx-auto">
                {user.name}
              </h3>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                @{user.username}
              </p>
              {user.bio && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
                  {user.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </Link>

      {action && (
        <div className="px-6 py-4 flex justify-center">
          {action}
        </div>
      )}
    </Card>
  );
});