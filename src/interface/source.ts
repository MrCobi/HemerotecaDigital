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