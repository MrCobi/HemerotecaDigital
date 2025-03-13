"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserCard } from "@/src/app/components/UserCard";
import { FollowButton } from "@/src/app/components/FollowButton";
import { Skeleton } from "@/src/app/components/ui/skeleton";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Button } from "@/src/app/components/ui/button";
import { API_ROUTES } from "@/src/config/api-routes";

interface FollowingUser {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
  bio?: string;
  followersCount?: number;
}

export default function FollowingPage() {
  const { username } = useParams();
  const [following, setFollowing] = useState<FollowingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const [userId, setUserId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Primero obtenemos el ID del usuario una sola vez
  useEffect(() => {
    const fetchUserId = async () => {
      try {
        const userRes = await fetch(API_ROUTES.users.byUsername(username as string));
        const userData = await userRes.json();
        setUserId(userData.id);
      } catch {
        toast({ title: "Error", description: "No se pudo encontrar el usuario", variant: "destructive" });
      }
    };

    fetchUserId();
  }, [username, toast]);

  // Luego cargamos los usuarios seguidos cuando tenemos el ID
  useEffect(() => {
    if (!userId) return;

    const fetchFollowing = async () => {
      try {
        // Usar la ruta correcta de API para obtener usuarios seguidos
        const followingRes = await fetch(API_ROUTES.relationships.following(userId));
        const followingData = await followingRes.json();
        
        // Usar followingData.following en lugar de followingData.data
        setFollowing(followingData.following || []);
        
        // Obtener estado de seguimiento si hay usuarios seguidos
        if (followingData.following && followingData.following.length > 0) {
          const ids = followingData.following.map((u: FollowingUser) => u.id);
          const statusRes = await fetch(API_ROUTES.users.followStatus(ids));
          const status = await statusRes.json();
          setFollowingStatus(status);
        }
      } catch (error) {
        console.error("Error loading following users:", error);
        toast({ 
          title: "Error", 
          description: "Error cargando seguidos", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    };
  
    fetchFollowing();
  }, [userId, toast]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Siguiendo a</h1>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
          ))}
        </div>
      ) : following.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {following.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              action={
                <FollowButton
                  targetUserId={user.id}
                  isFollowing={followingStatus[user.id]}
                  onSuccess={(isFollowing) => {
                    setFollowingStatus(prev => ({
                      ...prev,
                      [user.id]: isFollowing
                    }));
                  }}
                />
              }
              variant="following"
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Este usuario no sigue a nadie aún</p>
        </div>
      )}
    </div>
  );
}