"use client";

import { useInView } from "react-intersection-observer";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/src/app/components/ui/card";
import { Avatar } from "@/src/app/components/ui/avatar";
import { Newspaper, Users, UserCircle2, Star } from "lucide-react";
import Image from "next/image";
import { User } from "@/src/interface/user";

interface UserStatsProps {
  user: User;
}

export function UserStats({ user }: UserStatsProps) {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const stats = [
    { icon: <Newspaper className="h-5 w-5 text-blue-600 dark:text-blue-400" />, label: "Fuentes", value: 24 },
    { icon: <Users className="h-5 w-5 text-green-600 dark:text-green-400" />, label: "Seguidores", value: 156 },
    { icon: <UserCircle2 className="h-5 w-5 text-purple-600 dark:text-purple-400" />, label: "Siguiendo", value: 89 },
    { icon: <Star className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />, label: "Valoraciones", value: 432 },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5 }}
      className="w-full"
    >
      <Card className="border-border hover:border-primary/20 transition-all duration-300 overflow-hidden">
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Avatar className="h-16 w-16 border-4 border-background">
              <Image 
                src={user?.image || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop"} 
                alt={user?.name || "Usuario"} 
              />
            </Avatar>
            
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">
                {user?.name || "Usuario"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {user?.email || "usuario@ejemplo.com"}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                className="flex flex-col items-center p-2 rounded-md bg-card/50 hover:bg-card/80 border border-border hover:border-primary/20 transition-all duration-300"
              >
                <div className="p-2 rounded-full bg-background/80">
                  {stat.icon}
                </div>
                <span className="mt-1 text-lg font-semibold text-foreground">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}