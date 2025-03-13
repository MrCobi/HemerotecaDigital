"use client";

import { ScrollArea } from "@/src/app/components/ui/scroll-area";
import { Card } from "@/src/app/components/ui/card";
import { ActivityHistory } from "@prisma/client";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { 
  Star, 
  MessageSquare, 
  UserPlus, 
  Bookmark,
  Activity,
  X,
  Reply,
  Trash
} from "lucide-react";

const activityIcons = {
  favorite: <Bookmark className="h-4 w-4 text-blue-500" />,
  favorite_removed: <X className="h-4 w-4 text-red-500" />,
  rating: <Star className="h-4 w-4 text-yellow-500" />,
  rating_added: <Star className="h-4 w-4 text-yellow-500" />,
  comment: <MessageSquare className="h-4 w-4 text-green-500" />,
  comment_deleted: <Trash className="h-4 w-4 text-red-500" />,
  comment_reply: <Reply className="h-4 w-4 text-green-500" />,
  follow: <UserPlus className="h-4 w-4 text-purple-500" />,
  default: <Activity className="h-4 w-4 text-gray-500" />
};

export function ActivityFeed({ activities }: { activities: ActivityHistory[] }) {
  return (
    <Card className="p-4">
      <h2 className="text-xl font-semibold mb-4">Actividad Reciente</h2>
      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="mt-1">
                {activityIcons[activity.type as keyof typeof activityIcons] || activityIcons.default}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900">
                  {getActivityMessage(activity)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), {
                    addSuffix: true,
                    locale: es
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
}

function getActivityMessage(activity: ActivityHistory): string {
  switch (activity.type) {
    case 'favorite':
      return `Guardaste "${activity.sourceName}" en favoritos`;
    case 'favorite_removed':
      return `Eliminaste "${activity.sourceName}" de favoritos`;
    case 'rating':
    case 'rating_added':
      return `Valoraste la fuente "${activity.sourceName}"`;
    case 'comment':
      return `Comentaste en "${activity.sourceName}"`;
    case 'comment_deleted':
      return `Eliminaste un comentario en "${activity.sourceName}"`;
    case 'comment_reply':
      return `Respondiste a un comentario en "${activity.sourceName}"`;
    case 'follow':
      return `Comenzaste a seguir a ${activity.userName}`;
    default:
      return `Realizaste una acción: ${activity.type}`;
  }
}