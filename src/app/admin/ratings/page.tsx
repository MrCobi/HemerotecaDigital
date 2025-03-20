import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import RatingsTable from "./RatingsTable";

export default async function RatingsPage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");

  try {
    const ratings = await prisma.rating.findMany({
      select: {
        id: true,
        value: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        source: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            category: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Gestión de Valoraciones</h1>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="py-4">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <RatingsTable ratings={ratings} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar valoraciones:", error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card shadow overflow-hidden rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-destructive mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-foreground mb-2">Error al cargar las valoraciones</h2>
              <p className="text-muted-foreground mb-4">Ocurriu00f3 un error al intentar cargar las valoraciones. Por favor, intente nuevamente mu00e1s tarde.</p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
                >
                  Volver al Dashboard
                </Link>
                <ActionButton
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors duration-200"
                >
                  Reintentar
                </ActionButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
