export interface Source {
  id: string;          // Identificador único de la fuente
  name: string;        // Nombre de la fuente (ej: "BBC News")
  description: string; // Descripción de la fuente
  url: string;         // URL de la fuente
  imageUrl?: string | null;   // URL de la imagen de la fuente
  category: string;    // Categoría de la fuente (ej: "general", "business", "sports")
  language: string;    // Idioma de la fuente (ej: "en", "es", "de")
  country: string;     // País de origen de la fuente (ej: "us", "gb", "es")
  createdAt: Date;     // Fecha de creación del registro
  updatedAt: Date;     // Fecha de última actualización del registro
}

export interface Rating {
  id: string;           // Identificador único de la calificación
  value: number;        // Valor numérico de la calificación (ej: 1-5)
  userId: string;       // ID del usuario que realizó la calificación
  sourceId: string;     // ID de la fuente que fue calificada
  comment?: string;     // Comentario opcional sobre la calificación
  createdAt: Date;      // Fecha de creación del registro
  updatedAt: Date;      // Fecha de última actualización del registro
}