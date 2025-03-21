import Link from "next/link";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/db";
import UsersTable from "./UsersTable";

// Importar el tipo User y Role del componente UsersTable
import type { User, Role } from "./UsersTable";

// Definir una interfaz que coincida con lo que Prisma devuelve
interface UserWithCounts {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: "user" | "admin"; // Roles en minuscula como en Prisma
  createdAt: Date;
  _count: {
    accounts: number;
    comments: number;
    favoriteSources: number;
    ratings: number;
    sentMessages: number;
    receivedMessages: number;
  };
}

// Función auxiliar para convertir roles de Prisma al tipo Role del componente
const mapPrismaRoleToComponentRole = (prismaRole: string): Role => {
  switch (prismaRole) {
    case "admin":
      return "ADMIN";
    case "user":
      return "USER";
    default:
      return "EDITOR";
  }
};

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
        username: true,
        email: true,
        image: true,
        role: true,
        createdAt: true,
        emailVerified: true,
        _count: {
          select: {
            comments: true,
            ratings: true,
            favoriteSources: true,
            sentMessages: true,
            receivedMessages: true,
            accounts: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Convertir los roles de minúscula (Prisma) a mayúscula (componente) y adaptar la estructura
    const formattedUsers: User[] = users.map(user => ({
      id: user.id,
      name: user.name,
      username: user.username || undefined,
      email: user.email,
      emailVerified: user.emailVerified,
      image: user.image,
      role: mapPrismaRoleToComponentRole(user.role),
      createdAt: user.createdAt
    }));

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
              <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
            </svg>
            Añadir Usuario
          </Link>
        </div>

        <div className="bg-card shadow rounded-lg overflow-hidden mt-8">
          <UsersTable users={formattedUsers} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <h1 className="text-3xl font-bold text-foreground">Gestión de Usuarios</h1>
          <Link
            href="/admin/dashboard"
            className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Volver al Dashboard
          </Link>
        </div>
        
        <div className="bg-card shadow rounded-lg p-6 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="mt-4 text-xl font-medium text-foreground">Error al cargar usuarios</h2>
          <p className="mt-2 text-muted-foreground">Ha ocurrido un error al obtener la lista de usuarios.</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            Intentar de nuevo
          </button>
        </div>
      </div>
    );
  }
}
