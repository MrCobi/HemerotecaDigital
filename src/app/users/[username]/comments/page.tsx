"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Skeleton } from "@/src/app/components/ui/skeleton";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Button } from "@/components/ui/button";

export default function CommentsPage() {
  const { username } = useParams();
  const { data: session } = useSession();
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener ID del usuario
        const userRes = await fetch(`/api/users/username/${username}`);
        const userData = await userRes.json();
        
        // Obtener comentarios
        const commentsRes = await fetch(`/api/comments/user/${userData.id}`);
        const commentsData = await commentsRes.json();
        
        setComments(commentsData.comments);
      } catch (error) {
        toast({ title: "Error", description: "Error cargando comentarios", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, toast]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Comentarios</h1>
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
            <div key={comment.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
              <p className="font-medium">{comment.content}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                En {comment.sourceName} - {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}