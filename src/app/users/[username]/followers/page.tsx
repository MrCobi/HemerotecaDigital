import { UserCard } from "@/src/app/components/UserCard";
import { FollowButton } from "@/src/app/components/FollowButton";

type Follower = {
  id: string;
  name: string;
  username: string;
  image: string;
  bio?: string;
  followingSince?: Date;
};

export default async function FollowersPage({
  params,
}: {
  params: Promise<{ username: string }>; // Update params to be a Promise
}) {
  const { username } = await params; // Await the params

  // Fetch user by username
  const userRes = await fetch(`/api/users/by-username/${username}`);
  if (!userRes.ok) return <div>Usuario no encontrado</div>;
  const user = await userRes.json();

  // Fetch followers
  const followersRes = await fetch(`/api/users/${user.id}/followers`);
  if (!followersRes.ok) return <div>Error cargando seguidores</div>;
  const { data: followers } = await followersRes.json();

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Seguidores de {user.name}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {followers.map((follower: Follower) => (
          <UserCard
            key={follower.id}
            user={follower}
            action={<FollowButton targetUserId={follower.id} />}
            variant="follower"
          />
        ))}
      </div>
    </div>
  );
}
