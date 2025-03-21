// Tipos para la página de Actividad

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface Source {
  id: string;
  title: string;
}

export interface CommentWithAuthor {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  sourceId: string;
  user: User;
  source: Source;
}

export interface RatingWithAuthor {
  id: string;
  rating: number;
  createdAt: Date;
  userId: string;
  sourceId: string;
  user: User;
  source: Source;
}

export interface FavoriteWithDetails {
  id: string;
  createdAt: Date;
  userId: string;
  sourceId: string;
  user: User;
  source: Source;
}

export type ActivityType = 
  | 'comment' 
  | 'comment_reply' 
  | 'comment_deleted' 
  | 'rating' 
  | 'rating_added'
  | 'rating_removed'
  | 'favorite' 
  | 'login' 
  | 'follow'
  | 'unfollow'
  | 'unknown';

export type TargetType = 'source' | 'user' | 'comment';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  targetName: string;
  targetId: string;
  targetType: TargetType;
  createdAt: Date;
  details: string | null;
}

export interface ActivityTableProps {
  activities: ActivityItem[];
}

export interface ActivityFilter {
  query: string;
  type: ActivityType | null;
}
