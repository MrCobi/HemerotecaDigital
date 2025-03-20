import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import UsersTable from "./UsersTable";

export default async function UsersPage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");

  // Acceder directamente a la base de datos en lugar de a través de la API
  try {
    // Obtener usuarios directamente desde la base de datos con conteos de relaciones
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        _count: {
          select: {
            sources: true,
            comments: true,
            ratings: true,
            favoriteSources: true,
            sentMessages: true,
            receivedMessages: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
          <Link
            href="/admin/users/create"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                clipRule="evenodd"
              />
            </svg>
            Añadir Usuario
          </Link>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <UsersTable users={users} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6 text-center">
          <div className="text-red-500 text-xl mb-4">Error al cargar los usuarios</div>
          <p className="mb-4">Ha ocurrido un error al intentar cargar los usuarios. Por favor, intenta nuevamente.</p>
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
