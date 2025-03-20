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
    const gradients = [
      "from-blue-600 to-indigo-900",
      "from-indigo-600 to-purple-900",
      "from-purple-600 to-pink-900",
      "from-blue-600 to-cyan-800",
      "from-cyan-600 to-blue-900",
    ];

    const index = username.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <Card className="group overflow-hidden border-border hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300 hover:shadow-lg bg-white dark:bg-gray-800/90">
      <Link href={`/users/${user.username}`} className="block">
        <div className="relative">
          <div
            className={`absolute top-0 left-0 right-0 h-16 bg-gradient-to-r ${getGradient(
              user.username || ""
            )}`}
          >
            <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full blur-lg transform -translate-x-1/3 translate-y-1/3"></div>
          </div>

          <motion.div
            whileHover={{ scale: 1.01 }}
            className="relative pt-14 pb-6 px-6 bg-transparent text-card-foreground transition-colors duration-300"
          >
            <div className="absolute left-1/2 top-0 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative w-20 h-20 rounded-full overflow-hidden ring-4 ring-white dark:ring-gray-700 shadow-lg group-hover:ring-blue-200 dark:group-hover:ring-blue-900 transition-all duration-300">
                {user.image && (user.image.includes('cloudinary') || 
                (!user.image.startsWith('/') && !user.image.startsWith('http'))) ? (
                  <CldImage
                    src={user.image}
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

            <div className="mt-6 text-center">
              <h3 className="text-lg font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">
                {user.name}
              </h3>
              <Badge
                variant="secondary"
                className="mt-1 bg-blue-100/50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-none"
              >
                @{user.username}
              </Badge>

              {user.bio && (
                <p className="text-sm text-muted-foreground mt-3 line-clamp-2 px-2">
                  {user.bio}
                </p>
              )}

              <div className="my-4 h-px bg-gradient-to-r from-transparent via-blue-200 dark:via-blue-800 to-transparent"></div>
            </div>
          </motion.div>
        </div>
      </Link>

      <div className="flex justify-center mt-2 pb-4">{action}</div>
    </Card>
  );
})