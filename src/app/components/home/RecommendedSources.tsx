"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Avatar } from "@/src/app/components/ui/avatar";
import { Button } from "@/src/app/components/ui/button";
import { Plus } from "lucide-react";
import Image from "next/image";

const recommendedSources = [
  {
    name: "Tech Insider",
    category: "Technology",
    followers: "125K",
    image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=64&h=64&fit=crop"
  },
  {
    name: "Green Planet",
    category: "Environment",
    followers: "98K",
    image: "https://images.unsplash.com/photo-1569569970363-df7b6160d111?w=64&h=64&fit=crop"
  },
  {
    name: "Health Today",
    category: "Health",
    followers: "210K",
    image: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=64&h=64&fit=crop"
  }
];

export function RecommendedSources() {
  return (
    <Card className="border-border hover:border-primary/20 transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl font-semibold text-foreground">Recommended Sources</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recommendedSources.map((source, index) => (
          <motion.div
            key={source.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center justify-between group"
          >
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border-2 border-background">
                <Image src={source.image} alt={source.name} />
              </Avatar>
              <div>
                <h3 className="font-medium text-foreground group-hover:text-primary transition-colors duration-200">{source.name}</h3>
                <p className="text-sm text-muted-foreground">{source.category} • {source.followers} followers</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="text-muted-foreground hover:text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}