"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Filter, X } from "lucide-react";
import { Card } from "@/src/app/components/ui/card";

export function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <div className="relative w-full">
      <motion.div
        initial={false}
        animate={{ width: isExpanded ? "100%" : "auto" }}
        className="relative"
      >
        <div className="relative flex items-center">
          <Input
            type="text"
            placeholder="Buscar fuentes, artículos..."
            className="pr-24 bg-background/80 dark:bg-black/50 backdrop-blur-lg border-border focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all duration-300"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsExpanded(true)}
          />
          <div className="absolute right-0 flex items-center gap-1 pr-2">
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => setSearchQuery("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <Filter className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary hover:text-primary/80"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && searchQuery && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-full left-0 right-0 mt-2 z-50"
            >
              <Card className="p-4 shadow-lg backdrop-blur-lg bg-card/90 border-border">
                <p className="text-sm text-muted-foreground">
                  Resultados para &quot;
                  <span className="font-medium text-foreground">
                    {searchQuery}
                  </span>
                  &quot;...
                </p>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {isExpanded && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}
