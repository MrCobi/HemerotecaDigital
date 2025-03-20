import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import SourcesTable from "./SourcesTable";

export default async function SourcesPage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");

  try {
    const sources = await prisma.source.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        url: true,
        imageUrl: true,
        category: true,
        language: true,
        country: true,
        createdAt: true,
        _count: {
          select: {
            comments: true,
            ratings: true,
            favoriteSources: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Administración de Fuentes</h1>
          <div className="flex space-x-4">
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/admin/sources/new"
              className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Nueva Fuente
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <SourcesTable sources={sources} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar fuentes:", error);
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Administración de Fuentes</h1>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-500 text-xl mb-4">Error al cargar las fuentes</div>
          <p className="mb-4">Ha ocurrido un error al intentar cargar las fuentes. Por favor, intenta nuevamente.</p>
          <Link 
            href="/admin/dashboard" 
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
          >
            Volver al Dashboard
          </Link>
        </div>
      </div>
    );
  }
}
