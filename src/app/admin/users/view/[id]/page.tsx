"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

// Definición del tipo de usuario adaptada al esquema actual
type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "ADMIN" | "EDITOR" | "USER";
  createdAt: Date;
  updatedAt: Date;
  emailVerified: Date | null;
};

export default function UserViewPage() {
  const { id } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/users/${id}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        } else {
          setError("No se pudo cargar la información del usuario");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Error al cargar los datos del usuario");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (id) {
      fetchUser();
    }
  }, [id]);

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "EDITOR":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400";
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "ADMIN":
        return "Administrador";
      case "EDITOR":
        return "Editor";
      default:
        return "Usuario";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-card rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-destructive mb-4">Error</h2>
          <p className="text-muted-foreground mb-6">{error || "No se pudo cargar el usuario"}</p>
          <button
            onClick={() => router.back()}
            className="px-5 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Detalle de Usuario</h1>
          <div className="flex space-x-3">
            <Link
              href={`/admin/users/edit/${user.id}`}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-md transition-colors"
            >
              Editar
            </Link>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
            >
              Volver
            </button>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            {/* Panel lateral izquierdo */}
            <div className="md:w-1/3 bg-primary/10 p-8 flex flex-col items-center">
              <div className="text-center">
                <div className="relative w-48 h-48 mx-auto mb-6">
                  <Image
                    src={user.image || "/placeholders/user.png"}
                    alt={user.name || "Avatar"}
                    width={260}
                    height={260}
                    className="rounded-full object-cover border-4 border-primary/30"
                  />
                </div>
                <h2 className="text-2xl font-bold mb-2">{user.name}</h2>
                <div className="inline-block px-3 py-1 mb-4 rounded-full text-sm font-medium 
                  ${getRoleBadgeColor(user.role)}"
                >
                  {getRoleLabel(user.role)}
                </div>
              </div>
            </div>

            {/* Panel principal derecho */}
            <div className="md:w-2/3 p-8">
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Información de Contacto</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="min-w-40 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-muted-foreground">Email:</span>
                      </div>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <div className="flex items-start">
                      <div className="min-w-40 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2" />
                        </svg>
                        <span className="text-muted-foreground">ID:</span>
                      </div>
                      <span className="font-medium break-all">{user.id}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-foreground mb-3">Información de Cuenta</h3>
                  <div className="space-y-3">
                    <div className="flex items-start">
                      <div className="min-w-40 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-muted-foreground">Creado:</span>
                      </div>
                      <span className="font-medium">{new Date(user.createdAt).toLocaleDateString()} - {new Date(user.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-start">
                      <div className="min-w-40 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span className="text-muted-foreground">Actualizado:</span>
                      </div>
                      <span className="font-medium">{new Date(user.updatedAt).toLocaleDateString()} - {new Date(user.updatedAt).toLocaleTimeString()}</span>
                    </div>
                    <div className="flex items-start">
                      <div className="min-w-40 flex items-center">
                        <svg className="w-5 h-5 mr-2 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-muted-foreground">Verificado:</span>
                      </div>
                      <span className="font-medium">{user.emailVerified ? `${new Date(user.emailVerified).toLocaleDateString()}` : 'No verificado'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
