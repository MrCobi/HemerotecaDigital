"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Avatar } from "@/src/app/components/ui/avatar";
import { Badge } from "@/src/app/components/ui/badge";
import { Activity } from "lucide-react";
import Image from "next/image";
import { CldImage } from 'next-cloudinary';

const activities = [
  {
    user: {
      name: "Emma Wilson",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop"
    },
    action: "commented on",
    target: "The Future of AI",
    time: "5m ago",
    type: "comment"
  },
  {
    user: {
      name: "James Rodriguez",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=64&h=64&fit=crop"
    },
    action: "bookmarked",
    target: "Sustainable Cities",
    time: "15m ago",
    type: "bookmark"
  },
  {
    user: {
      name: "Sophie Chen",
      avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop"
    },
    action: "shared",
    target: "Space Exploration",
    time: "1h ago",
    type: "share"
  }
];

export function ActivityStream() {
  return (
    <Card className="border-border hover:border-primary/20 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-5 w-5 text-primary" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
        {activities.map((activity, index) => (
          <motion.div
            key={`${activity.user.name}-${activity.target}`}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-3 group"
          >
            <Avatar className="h-8 w-8 border-2 border-background">
              {activity.user.avatar && (activity.user.avatar.includes('cloudinary') || 
              (!activity.user.avatar.startsWith('http') && !activity.user.avatar.startsWith('/'))) ? (
                <CldImage
                  src={(() => {
                    // Extraer el public_id limpio, manejando diferentes formatos
                    let publicId = activity.user.avatar;

                    // Si es una URL completa de Cloudinary
                    if (activity.user.avatar.includes('cloudinary.com')) {
                      // Extraer el public_id eliminando la parte de la URL
                      // Buscamos 'hemeroteca_digital' como punto de referencia seguro
                      const match = activity.user.avatar.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                      if (match && match[1]) {
                        publicId = `hemeroteca_digital/${match[1]}`;
                      } else {
                        // Si no encontramos el patrón específico, intentamos una extracción más general
                        publicId = activity.user.avatar.replace(/.*\/v\d+\//, '').split('?')[0];
                      }
                    }

                    // Verificar que el ID no esté duplicado o anidado
                    if (publicId.includes('https://')) {
                      console.warn('ID público contiene URL completa en ActivityStream:', publicId);
                      publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                    }

                    console.log('Public ID extraído en ActivityStream:', publicId);
                    return publicId;
                  })()}
                  alt={activity.user.name}
                  width={32}
                  height={32}
                  crop="fill"
                  gravity="face"
                  className="h-8 w-8 rounded-full"
                  onError={(e) => {
                    console.error('Error cargando imagen en ActivityStream:', activity.user.avatar);
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : (
                <Image
                  src={activity.user.avatar || "/images/AvatarPredeterminado.webp"}
                  alt={activity.user.name}
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              )}
            </Avatar>
            <div className="flex-1">
              <p className="text-sm">
                <span className="font-medium text-foreground">{activity.user.name}</span>{" "}
                <span className="text-muted-foreground">{activity.action}</span>{" "}
                <span className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{activity.target}</span>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs bg-secondary/50 text-secondary-foreground">
                  {activity.type}
                </Badge>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}