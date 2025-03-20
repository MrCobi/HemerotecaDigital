// Tipos para la página de Actividad

export interface User {
  id: string;
  name: string | null;
  email: string;
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

export type ActivityItem = {
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
