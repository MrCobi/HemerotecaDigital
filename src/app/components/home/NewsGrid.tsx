"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Badge } from "@/src/app/components/ui/badge";
import { Avatar } from "@/src/app/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Bookmark, MessageSquare, Share2 } from "lucide-react";
import Image from "next/image";

const newsItems = [
  {
    title: "The Future of AI: Breaking New Boundaries",
    excerpt: "Artificial Intelligence continues to evolve at an unprecedented pace, transforming industries and creating new possibilities...",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&h=400&fit=crop",
    category: "Technology",
    author: {
      name: "Sarah Johnson",
      avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=64&h=64&fit=crop"
    },
    stats: {
      comments: 128,
      bookmarks: 345
    }
  },
  {
    title: "Sustainable Cities: Building for Tomorrow",
    excerpt: "Urban planners are revolutionizing city design with sustainable practices and green technologies...",
    image: "https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=400&fit=crop",
    category: "Environment",
    author: {
      name: "Michael Chen",
      avatar: "https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=64&h=64&fit=crop"
    },
    stats: {
      comments: 95,
      bookmarks: 230
    }
  }
];

export function NewsGrid() {
  return (
    <div className="space-y-6">
      {newsItems.map((item, index) => (
        <motion.div
          key={item.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.2 }}
          className="group"
        >
          <Card className="overflow-hidden border-border hover:border-primary/20 transition-all duration-300">
            <div className="relative">
              <Image
                src={item.image}
                alt={item.title}
                className="w-full h-40 sm:h-48 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <Badge className="absolute top-4 left-4 bg-primary/80 hover:bg-primary backdrop-blur-sm text-primary-foreground">
                {item.category}
              </Badge>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xl sm:text-2xl line-clamp-2 text-foreground">{item.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm sm:text-base line-clamp-3">{item.excerpt}</p>
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8 border-2 border-background">
                    <Image src={item.author.avatar} alt={item.author.name} />
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{item.author.name}</span>
                </div>
                
                <div className="flex items-center gap-1 sm:gap-2">
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    {item.stats.comments}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Bookmark className="h-4 w-4 mr-1" />
                    {item.stats.bookmarks}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Share2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}