// app/sources/page.tsx
import { Source } from "@/src/interface/source";
import prisma from "@/lib/db";
import SourcesPage from "@/src/app/components/SourceList";

// Función para obtener todas las fuentes (periódicos) desde la base de datos
async function fetchAllSources(): Promise<Source[]> {
  try {
    const sources = await prisma.source.findMany();
    return sources;
  } catch (error) {
    console.error("Error fetching sources:", error);
    return [];
  }
}

export default async function Page() {
  const sources = await fetchAllSources();
  return <SourcesPage sources={sources} />;
}