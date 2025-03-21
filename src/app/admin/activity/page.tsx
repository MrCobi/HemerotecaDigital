import { Metadata } from "next";
import prisma from "@/lib/db";
import ActivityTable from "./ActivityTable";
import { ActivityItem, User } from "./types";

export const metadata: Metadata = {
  title: "Actividad de Usuarios | Panel de Administración",
  description: "Monitorea la actividad de usuarios en la Hemeroteca Digital",
};

export default async function ActivityPage() {
  // Consultar directamente las actividades desde la base de datos 
  const activitiesRecords = await prisma.$queryRaw`
    SELECT id, type, user_id as userId, source_name as sourceName, user_name as targetName, created_at as createdAt
    FROM activity_history 
    ORDER BY created_at DESC 
    LIMIT 100
  `;

  // Obtener información adicional de usuarios
  const userIds = [...new Set((activitiesRecords as any[]).map(a => a.userId))];
  const users = await prisma.user.findMany({
    where: {
      id: {
        in: userIds
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true
    }
  });

  // Crear un mapa de usuarios para un acceso más fácil
  const usersMap = new Map<string, User>();
  users.forEach((user: User) => {
    usersMap.set(user.id, user);
  });

  // Transformar los registros en el formato ActivityItem
  const activities: ActivityItem[] = (activitiesRecords as any[]).map(activity => {
    const user = usersMap.get(activity.userId);
    let details: string | null = null;
    let targetType: 'source' | 'user' | 'comment' = 'source';
    
    // Determinar detalles basados en el tipo de actividad
    switch (activity.type) {
      case 'comment':
        details = 'Realizó un comentario';
        break;
      case 'comment_reply':
        details = 'Respondió a un comentario';
        break;
      case 'comment_deleted':
        details = 'Eliminó un comentario';
        break;
      case 'rating_added':
        details = 'Valoró con estrellas';
        break;
      case 'rating_removed':
        details = 'Eliminó su valoración';
        break;
      case 'favorite':
        details = 'Añadió a favoritos';
        break;
      case 'follow':
        details = 'Comenzó a seguir';
        targetType = 'user';
        break;
      case 'unfollow':
        details = 'Dejó de seguir';
        targetType = 'user';
        break;
      default:
        details = 'Actividad realizada';
        break;
    }

    return {
      id: activity.id || `activity-${Math.random().toString(36).substring(2, 9)}`,
      type: activity.type || 'unknown',
      userId: activity.userId || '',
      userName: user?.name || null,
      userEmail: user?.email || null,
      userImage: user?.image || null,
      targetName: activity.targetName || 'Desconocido',
      targetId: activity.sourceId || activity.userId || '',
      targetType: targetType,
      createdAt: new Date(activity.createdAt),
      details: details
    };
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Actividad de Usuarios</h1>
        <p className="text-muted-foreground">
          Monitorea la actividad reciente de los usuarios en la plataforma.
        </p>
      </div>

      <div className="bg-card rounded-lg shadow">
        <ActivityTable activities={activities} />
      </div>
    </div>
  );
}
