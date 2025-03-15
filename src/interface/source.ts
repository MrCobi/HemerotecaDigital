export interface Source {
  id: string;
  name: string;
  description: string;
  url: string;
  imageUrl?: string | null;
  category: string;
  language: string;
  country: string;
  createdAt: Date;
  updatedAt: Date;
  avgRating?: number;
  ratingCount?: number;
  favoriteCount?: number;
  recentComments?: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  sourceId: string;
  createdAt: string;
  updatedAt?: string;
  user: {
    id: string;
    name: string;          // Cambiado a requerido
    username: string;      // Cambiado a requerido
    image?: string;
  };
  path?: string;           // Propiedad opcional adicional si es necesaria
}

export interface Rating {
  id: string;
  value: number;
  userId: string;
  sourceId: string;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}