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
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener ID del usuario
        const userRes = await fetch(API_ROUTES.users.byUsername(username as string));
        const userData = await userRes.json();
        
        // Obtener lista de seguidos
        const followingRes = await fetch(API_ROUTES.users.following(userData.id));
        const followingData = await followingRes.json();
        
        setFollowing(followingData.data);
        
        // Obtener estado de seguimiento
        const ids = followingData.data.map((u: FollowingUser) => u.id);
        const statusRes = await fetch(API_ROUTES.users.followStatus(ids));
        const status = await statusRes.json();
        setFollowingStatus(status);
      } catch {
        toast({ 
          title: "Error", 
          description: "Error cargando seguidos", 
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
        <h1 className="text-2xl font-bold">Siguiendo a</h1>
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
      )}
    </div>
  );
}