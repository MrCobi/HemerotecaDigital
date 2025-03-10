import { UserCard } from "@/src/app/components/UserCard";
import { FollowButton } from "@/src/app/components/FollowButton";

type FollowingUser = {
  id: string;
  name: string;
  username: string;
  image: string;
  bio?: string;
  createdAt?: Date;
  followersCount?: number;
};

export default async function FollowingPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  // Obtener usuario por username
  const userRes = await fetch(`/api/users/by-username/${username}`);
  if (!userRes.ok) return <div>Usuario no encontrado</div>;
  const user = await userRes.json();

  // Obtener seguidos desde la API
  const followingRes = await fetch(`/api/users/${user.id}/following`);
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
