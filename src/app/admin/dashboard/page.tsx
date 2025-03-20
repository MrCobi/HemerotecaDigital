import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";

export default async function AdminDashboard() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");

  // Obtener conteos de cada entidad para mostrar estadísticas
  const [userCount, sourceCount, commentCount, ratingCount, favoriteCount, messageCount] = await Promise.all([
    prisma.user.count(),
    prisma.source.count(),
    prisma.comment.count(),
    prisma.rating.count(),
    prisma.favoriteSource.count(),
    prisma.directMessage.count()
  ]);

  // Definir los módulos del panel de administración
  const adminModules = [
    {
      title: "Usuarios",
      description: "Gestionar cuentas de usuario, roles y permisos",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      count: userCount,
      href: "/admin/users",
      color: "bg-blue-500"
    },
    {
      title: "Fuentes",
      description: "Administrar fuentes de información y categorías",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
        </svg>
      ),
      count: sourceCount,
      href: "/admin/sources",
      color: "bg-purple-500"
    },
    {
      title: "Comentarios",
      description: "Moderar y administrar los comentarios de los usuarios",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      count: commentCount,
      href: "/admin/comments",
      color: "bg-green-500"
    },
    {
      title: "Valoraciones",
      description: "Gestionar las valoraciones de las fuentes",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
        </svg>
      ),
      count: ratingCount,
      href: "/admin/ratings",
      color: "bg-yellow-500"
    },
    {
      title: "Favoritos",
      description: "Ver las fuentes favoritas de los usuarios",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
      count: favoriteCount,
      href: "/admin/favorites",
      color: "bg-red-500"
    },
    {
      title: "Mensajes",
      description: "Administrar mensajes directos entre usuarios",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      count: messageCount,
      href: "/admin/messages",
      color: "bg-indigo-500"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-foreground">Panel de Administración</h1>
        <div className="flex space-x-4">
          <Link
            href="/home"
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            Volver al inicio
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {adminModules.map((module) => (
          <Link key={module.title} href={module.href} className="block">
            <div className={`rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 bg-card`}>
              <div className={`p-4 ${module.color} text-white flex justify-between items-center`}>
                {module.icon}
                <span className="text-2xl font-bold">{module.count}</span>
              </div>
              <div className="p-4">
                <h3 className="text-lg font-medium text-card-foreground">{module.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 bg-card rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Acciones rápidas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/users/create"
            className="flex items-center p-3 rounded-md hover:bg-muted/50 transition-colors duration-200"
          >
            <div className="flex-shrink-0 mr-3 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium">Añadir usuario</h3>
              <p className="text-xs text-muted-foreground">Crear una nueva cuenta de usuario</p>
            </div>
          </Link>

          <Link
            href="/admin/sources/create"
            className="flex items-center p-3 rounded-md hover:bg-muted/50 transition-colors duration-200"
          >
            <div className="flex-shrink-0 mr-3 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium">Añadir fuente</h3>
              <p className="text-xs text-muted-foreground">Crear una nueva fuente de información</p>
            </div>
          </Link>

          <Link
            href="/admin/comments"
            className="flex items-center p-3 rounded-md hover:bg-muted/50 transition-colors duration-200"
          >
            <div className="flex-shrink-0 mr-3 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium">Moderar comentarios</h3>
              <p className="text-xs text-muted-foreground">Revisar y moderar los comentarios recientes</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
