import { Metadata } from "next";
import prisma from "@/lib/db";
import ActivityTable from "./ActivityTable";

export const metadata: Metadata = {
  title: "Actividad de Usuarios | Panel de Administración",
  description: "Monitorea la actividad de usuarios en la Hemeroteca Digital",
};

// Creamos un tipo para representar una actividad genérica
type Activity = {
  id: string;
  type: 'comment' | 'rating' | 'favorite' | 'login';
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  targetName: string;
  targetId: string;
  targetType: string;
  createdAt: Date;
  details: string | null;
};

export default async function ActivityPage() {
  // Obtener comentarios recientes
  const comments = await prisma.comment.findMany({
    take: 50,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      source: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    where: {
      isDeleted: false,
    },
  });

  // Obtener valoraciones recientes
  const ratings = await prisma.rating.findMany({
    take: 50,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      source: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Obtener favoritos recientes
  const favorites = await prisma.favoriteSource.findMany({
    take: 50,
    orderBy: {
      createdAt: 'desc',
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
        },
      },
      source: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  // Transformar comentarios a actividades
  const commentActivities: Activity[] = comments.map(comment => ({
    id: comment.id,
    type: 'comment',
    userId: comment.userId,
    userName: comment.user?.name,
    userEmail: comment.user?.email,
    userImage: comment.user?.image,
    targetName: comment.source.name,
    targetId: comment.sourceId,
    targetType: 'source',
    createdAt: comment.createdAt,
    details: comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
  }));

  // Transformar valoraciones a actividades
  const ratingActivities: Activity[] = ratings.map(rating => ({
    id: rating.id,
    type: 'rating',
    userId: rating.userId,
    userName: rating.user.name,
    userEmail: rating.user.email,
    userImage: rating.user.image,
    targetName: rating.source.name,
    targetId: rating.sourceId,
    targetType: 'source',
    createdAt: rating.createdAt,
    details: `${rating.value} estrellas`,
  }));

  // Transformar favoritos a actividades
  const favoriteActivities: Activity[] = favorites.map(favorite => {
    // Creamos un ID único para el favorito usando las claves compuestas
    const favoriteId = `fav_${favorite.userId}_${favorite.sourceId}`;
    
    return {
      id: favoriteId,
      type: 'favorite',
      userId: favorite.userId,
      userName: favorite.user.name,
      userEmail: favorite.user.email,
      userImage: favorite.user.image,
      targetName: favorite.source.name,
      targetId: favorite.sourceId,
      targetType: 'source',
      createdAt: favorite.createdAt,
      details: null,
    };
  });

  // Combinar todas las actividades y ordenarlas por fecha (más recientes primero)
  const allActivities = [...commentActivities, ...ratingActivities, ...favoriteActivities]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 100); // Mostrar las 100 actividades más recientes

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Actividad de Usuarios</h1>
        <p className="text-muted-foreground">
          Monitorea la actividad reciente de los usuarios en la plataforma.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow">
        <ActivityTable activities={allActivities} />
      </div>
    </div>
  );
}
