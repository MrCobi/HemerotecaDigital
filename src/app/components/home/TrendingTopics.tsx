"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Badge } from "@/src/app/components/ui/badge";
import { TrendingUp } from "lucide-react";

const trendingTopics = [
  {
    name: "Inteligencia Artificial",
    category: "Tecnología",
    trend: "+125%",
    count: 1243
  },
  {
    name: "Cambio Climático",
    category: "Medio Ambiente",
    trend: "+87%",
    count: 956
  },
  {
    name: "Finanzas Personales",
    category: "Economía",
    trend: "+62%",
    count: 782
  },
  {
    name: "Salud Mental",
    category: "Bienestar",
    trend: "+45%",
    count: 651
  }
];

export function TrendingTopics() {
  return (
    <Card className="border-border hover:border-primary/20 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          Trending Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {trendingTopics.map((topic, index) => (
          <motion.div
            key={topic.name}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1, duration: 0.3 }}
            className="space-y-2 group cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{topic.name}</h3>
              <Badge 
                variant="secondary" 
                className="bg-secondary/50 text-secondary-foreground group-hover:bg-primary/20 group-hover:text-primary transition-colors duration-200"
              >
                {topic.trend}
              </Badge>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{topic.category}</span>
              <span>{topic.count.toLocaleString()} artículos</span>
            </div>
            <div className="h-1 w-full bg-muted/50 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-primary/70 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, parseInt(topic.trend))}%` }}
                transition={{ delay: 0.5 + index * 0.1, duration: 0.8 }}
              />
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}