"use client";

import { Card } from "@/src/app/components/ui/card";
import { Button } from "@/src/app/components/ui/button";
import { Star, MessageSquare, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

interface Source {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  url: string;
  _count: {
    ratings: number;
    comments: number;
  };
}

interface FavoriteSource {
  source: Source;
  createdAt: Date;
}

export function FavoriteSources({ 
  sources,
}: { 
  sources: FavoriteSource[];
  userId: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Fuentes Favoritas</h2>
        <Button variant="outline" size="sm">
          Ver todas
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sources.map(({ source }) => (
          <Card key={source.id} className="flex flex-col p-4 hover:shadow-lg transition-shadow">
            <div className="flex gap-4">
              {source.imageUrl && (
                <div className="flex-shrink-0">
                  <Image
                    src={source.imageUrl}
                    alt={source.name}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg truncate">{source.name}</h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                  {source.description}
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    {source._count.ratings}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-4 w-4" />
                    {source._count.comments}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Link href={source.url} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm">
                  Visitar <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}