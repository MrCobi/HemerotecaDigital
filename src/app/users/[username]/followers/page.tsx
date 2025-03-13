"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserCard } from "@/src/app/components/UserCard";
import { FollowButton } from "@/src/app/components/FollowButton";
import { Skeleton } from "@/src/app/components/ui/skeleton";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Button } from "@/src/app/components/ui/button";
import { API_ROUTES } from "@/src/config/api-routes";

interface Follower {
  id: string;
  username: string;
  name: string | null;
  image: string | null;
}

export default function FollowersPage() {
  const { username } = useParams();
  const [followers, setFollowers] = useState<Follower[]>([]);
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

  // Luego cargamos los seguidores cuando tenemos el ID
  useEffect(() => {
    if (!userId) return;

    const fetchFollowers = async () => {
      try {
        // Usar la ruta correcta de API para obtener seguidores
        const followersRes = await fetch(API_ROUTES.relationships.followers(userId));
        const followersData = await followersRes.json();
        
        // Acceder a la estructura correcta: followersData.followers en lugar de followersData.data
        setFollowers(followersData.followers || []);
        
        // Obtener estado de seguimiento si hay seguidores
        if (followersData.followers && followersData.followers.length > 0) {
          const ids = followersData.followers.map((f: Follower) => f.id);
          const statusRes = await fetch(API_ROUTES.users.followStatus(ids));
          const status = await statusRes.json();
          setFollowingStatus(status);
        }
      } catch (error) {
        console.error("Error loading followers:", error);
        toast({ title: "Error", description: "Error cargando seguidores", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
  
    fetchFollowers();
  }, [userId, toast]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Seguidores</h1>
        <Button onClick={() => router.back()}>Volver</Button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-[220px] w-full rounded-xl" />
          ))}
        </div>
      ) : followers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {followers.map((follower) => (
            <UserCard
              key={follower.id}
              user={follower}
              action={
                <FollowButton
                  targetUserId={follower.id}
                  isFollowing={followingStatus[follower.id]}
                  onSuccess={(isFollowing) => {
                    setFollowingStatus(prev => ({
                      ...prev,
                      [follower.id]: isFollowing
                    }));
                  }}
                />
              }
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Este usuario no tiene seguidores aún</p>
        </div>
      )}
    </div>
  );
}