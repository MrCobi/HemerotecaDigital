import { Metadata } from "next";
import prisma from "@/lib/db";
import FollowsTable from "./FollowsTable";

export const metadata: Metadata = {
  title: "Seguidores | Panel de Administración",
  description: "Gestiona las relaciones de seguidores entre usuarios en la Hemeroteca Digital",
};

export default async function FollowsPage() {
  // Aquí asumimos que hay una entidad "Follow" en la base de datos que registra las relaciones 
  // entre usuarios (seguidor y seguido). Adapta esto según el modelo exacto de tu base de datos.
  const follows = await prisma.follow.findMany({
    include: {
      follower: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      following: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Transformamos los resultados para añadir un id único a cada relación
  const followsWithId = follows.map(follow => ({
    ...follow,
    id: `follow_${follow.followerId}_${follow.followingId}`
  }));

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Seguidores</h1>
        <p className="text-muted-foreground">
          Gestiona las relaciones de seguimiento entre usuarios.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow">
        <FollowsTable follows={followsWithId} />
      </div>
    </div>
  );
}
