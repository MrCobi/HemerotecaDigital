// src/app/sources/[id]/page.server.tsx
import { Source } from "@/src/interface/source";
import { Article } from "@/src/interface/article";
import SourcePageClient from "./SourcePageClient";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { API_ROUTES } from "@/src/config/api-routes";

export default async function SourcePage(
  context: { params: Promise<{ id: string }> }
) {
  // Verificación de autenticación
  const session = await auth();
  
  // Verificar si el usuario está autenticado
  if (!session || !session.user) {
    redirect("/api/auth/signin");
  }
  
  // Verificar si el correo está verificado
  if (!session.user.emailVerified) {
    redirect("/auth/verification-pending");
  }

  // Espera a resolver la promesa para obtener el id
  const { id: sourceId } = await context.params;

  if (!sourceId || sourceId.trim() === "") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900">
          ID de fuente no proporcionado.
        </h1>
      </div>
    );
  }

  let source: Source | null = null;
  let articles: Article[] = [];

  try {
    // Obtener fuente desde el endpoint de la API
    const sourceResponse = await fetch(
      new URL(API_ROUTES.sources.get(sourceId), process.env.NEXTAUTH_URL).toString()
    );

    if (sourceResponse.ok) {
      source = await sourceResponse.json();
    }

    // Obtener artículos desde el endpoint de la API
    if (source) {
      const articlesResponse = await fetch(
        new URL(`${API_ROUTES.sources.articles(sourceId)}?sortBy=popularity&language=${source.language}`, process.env.NEXTAUTH_URL).toString()
      );

      if (articlesResponse.ok) {
        articles = await articlesResponse.json();
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }

  if (!source) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900">
          No se encontró la fuente solicitada.
        </h1>
      </div>
    );
  }

  return <SourcePageClient source={source} articles={articles} />;
}
