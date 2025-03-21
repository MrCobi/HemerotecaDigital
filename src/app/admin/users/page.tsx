"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import UsersTable from "./UsersTable";
import type { User, Role } from "./UsersTable";
import { useEffect, useState } from "react";

// Función auxiliar para convertir roles de Prisma al tipo Role del componente
const mapPrismaRoleToComponentRole = (prismaRole: string): Role => {
  switch (prismaRole) {
    case "admin":
      return "ADMIN";
    case "moderator":
      return "EDITOR";
    default:
      return "USER";
  }
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUsers() {
      try {
        // Verificar sesión
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (!sessionData || !sessionData.user) {
          router.push("/api/auth/signin");
          return;
        }
        
        if (sessionData.user.role !== "admin") {
          router.push("/acceso-denegado");
          return;
        }

        // Cargar datos de usuarios
        const res = await fetch('/api/admin/users');
        
        if (!res.ok) {
          throw new Error('Error al cargar usuarios');
        }
        
        const data = await res.json();
        
        // Manejo de diferentes formatos de respuesta
        let usersArray = [];
        if (Array.isArray(data)) {
          // Si es un array directamente
          usersArray = data;
        } else if (data.users && Array.isArray(data.users)) {
          // Si tiene una propiedad users que es un array
          usersArray = data.users;
        } else if (data.id) {
          // Si es un solo usuario
          usersArray = [data];
        }
        
        const formattedUsers: User[] = usersArray.map((user: any) => ({
          id: user.id,
          name: user.name,
          username: user.username || undefined,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          role: mapPrismaRoleToComponentRole(user.role),
          createdAt: user.createdAt
        }));
        
        setUsers(formattedUsers);
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar usuarios:", err);
        setError("Error al cargar datos de usuarios");
        setLoading(false);
      }
    }

    loadUsers();
  }, [router]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
        <UsersTable users={users} />
      </div>
    </div>
  );
}
