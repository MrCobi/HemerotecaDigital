import { UserCard } from "@/src/app/components/UserCard";
import { FollowButton } from "@/src/app/components/FollowButton";
import type { Metadata } from "next";

type FollowingUser = {
  id: string;
  name: string;
  username: string;
  image: string;
  bio?: string;
  followersCount?: number;
};

export const metadata: Metadata = {
  title: "Siguiendo",
};

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
  
  // Obtener usuario principal
  const userRes = await fetch(`${baseUrl}/api/users/by-username/${username}`);
  if (!userRes.ok) return <div>Usuario no encontrado</div>;
  const user = await userRes.json();

  // Obtener lista de seguidos
  const followingRes = await fetch(`${baseUrl}/api/users/${user.id}/following`, {
    next: { revalidate: 60 },
  });
  if (!followingRes.ok) return <div>Error cargando seguidos</div>;
  const { data: following } = await followingRes.json();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Siguiendo a</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {following.map((user: FollowingUser) => (
          <UserCard
            key={user.id}
            user={user}
            action={<FollowButton targetUserId={user.id} />}
            variant="following"
          />
        ))}
      </div>
    </div>
  );
}
