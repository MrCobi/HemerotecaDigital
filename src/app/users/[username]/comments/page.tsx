"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/src/app/components/ui/skeleton";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Button } from "@/src/app/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { API_ROUTES } from "@/src/config/api-routes";

interface CommentType {
  id: string;
  userImage?: string;
  username: string;
  createdAt: string;
  content: string;
  sourceId: string;
  sourceName: string;
}


export default function CommentsPage() {
  const { username } = useParams();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener ID del usuario
        const userRes = await fetch(API_ROUTES.users.byUsername(username as string));
        const userData = await userRes.json();
        
        // Obtener comentarios con información extendida
        const commentsRes = await fetch(API_ROUTES.comments.byUser(userData.id));
        const { comments: commentsData } = await commentsRes.json();
        
        setComments(commentsData);
      } catch {
        toast({ 
          title: "Error", 
          description: "Error cargando comentarios", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [username, toast]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Comentarios de {username}</h1>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <div 
              key={comment.id} 
              className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow"
            >
              <div className="flex items-start gap-3">
                <Image 
                  src={comment.userImage || '/default-avatar.png'} 
                  className="w-10 h-10 rounded-full"
                  alt="Avatar"
                  width={100}
                  height={100}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{comment.username}</span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-sm text-gray-500">
                      {new Date(comment.createdAt).toLocaleDateString("es-ES", {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </span>
                  </div>
                  <p className="mt-2">{comment.content}</p>
                  <Link 
                     href={`/sources/${comment.sourceId}`}
                    className="text-blue-600 hover:underline mt-2 inline-block"
                  >
                    En {comment.sourceName}
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}