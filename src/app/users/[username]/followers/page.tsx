"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UserCard } from "@/src/app/components/UserCard";
import { FollowButton } from "@/src/app/components/FollowButton";
import { Skeleton } from "@/src/app/components/ui/skeleton";
import { useToast } from "@/src/app/components/ui/use-toast";
import { Button } from "@/src/app/components/ui/button";

interface Follower {
  id: string;
  username: string;
  name: string | null; // Añadido para coincidir con el modelo User
  image: string | null; // Corregido de 'userImage' a 'image'
}

export default function FollowersPage() {
  const { username } = useParams();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingStatus, setFollowingStatus] = useState<Record<string, boolean>>({});
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener ID del usuario
        const userRes = await fetch(`/api/users/by-username/${username}`);
        const userData = await userRes.json();
        
        // Obtener seguidores
        const followersRes = await fetch(`/api/users/${userData.id}/followers`);
        const followersData = await followersRes.json();
        
        setFollowers(followersData.data);
        
        // Obtener estado de seguimiento
        const ids = followersData.data.map((f: Follower) => f.id);
        const statusRes = await fetch(`/api/users/follow-status?ids=${ids.join(",")}`);
        const status = await statusRes.json();
        setFollowingStatus(status);
      } catch {
        toast({ title: "Error", description: "Error cargando seguidores", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [username, toast]);

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
      ) : (
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
      )}
    </div>
  );
}