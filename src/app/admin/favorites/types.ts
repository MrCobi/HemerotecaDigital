// Definición de tipos para la sección de favoritos

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

export interface Source {
  id: string;
  name: string;
  url: string | null;
  imageUrl: string | null;
  category: string;
}

export interface Favorite {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  userId: string;
  sourceId: string;
  user: User;
  source: Source;
}
