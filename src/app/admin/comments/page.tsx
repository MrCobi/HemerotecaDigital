import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function CommentsPage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");

  try {
    const comments = await prisma.comment.findMany({
      select: {
        id: true,
        content: true,
        isDeleted: true,
        depth: true,
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
            name: true
          }
        },
        _count: {
          select: {
            replies: true
          }
        }
      },
      where: {
        parentId: null // Solo comentarios principales para simplificar
      },
      orderBy: { createdAt: "desc" },
      take: 20 // Limitar a 20 para no sobrecargar la pu00e1gina
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Moderaciu00f3n de Comentarios</h1>
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
          </div>
        </div>

        <div className="bg-card shadow overflow-hidden rounded-lg">
          <div className="p-4 sm:p-6 md:p-8 flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
              <div className="mb-4 sm:mb-0">
                <h2 className="text-lg font-medium text-card-foreground">Lista de Comentarios</h2>
                <p className="text-sm text-muted-foreground">Revise y modere los comentarios de los usuarios.</p>
              </div>
              <div className="flex space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar comentarios..."
                    className="border border-input px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <select
                  className="border border-input px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                >
                  <option value="">Todos</option>
                  <option value="deleted">Eliminados</option>
                  <option value="active">Activos</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              {comments.length > 0 ? (
                <div className="divide-y divide-border">
                  {comments.map((comment) => (
                    <div key={comment.id} className={`p-4 hover:bg-muted/50 ${comment.isDeleted ? 'bg-destructive/5' : ''}`}>
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {comment.user.image ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={comment.user.image}
                              alt={comment.user.name || comment.user.username || 'Usuario'}
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                              {(comment.user.name || comment.user.username || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center mb-1">
                            <div>
                              <span className="text-sm font-medium text-foreground">
                                {comment.user.name || comment.user.username || 'Usuario anu00f3nimo'}
                              </span>
                              <span className="mx-1 text-muted-foreground">&middot;</span>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true, locale: es })}
                              </span>
                            </div>
                            <Link
                              href={`/admin/sources/${comment.source.id}`}
                              className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              {comment.source.name}
                            </Link>
                          </div>
                          <div className={`text-sm mb-2 ${comment.isDeleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {comment.content}
                          </div>
                          <div className="flex justify-between items-center">
                            <div className="flex space-x-4 text-xs">
                              <div className="flex items-center text-muted-foreground">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                                {comment._count.replies} respuestas
                              </div>
                              <span className="text-muted-foreground">&middot;</span>
                              <div className="text-muted-foreground">
                                Nivel {comment.depth}
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <Link 
                                href={`/admin/comments/${comment.id}`}
                                className="text-xs px-2 py-1 rounded-md text-primary hover:bg-muted transition-colors duration-200"
                              >
                                Ver detalles
                              </Link>
                              {comment.isDeleted ? (
                                <button 
                                  className="text-xs px-2 py-1 rounded-md text-primary hover:bg-muted transition-colors duration-200"
                                  onClick={() => {}}
                                >
                                  Restaurar
                                </button>
                              ) : (
                                <button 
                                  className="text-xs px-2 py-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors duration-200"
                                  onClick={() => {}}
                                >
                                  Eliminar
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-muted-foreground/50 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    <p className="text-lg font-medium text-foreground">No hay comentarios disponibles</p>
                    <p className="text-sm mt-1 text-muted-foreground">Au00fan no hay comentarios para moderar</p>
                  </div>
                </div>
              )}
            </div>

            {comments.length > 0 && (
              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {comments.length} de {comments.length} comentarios
                </div>
                <div className="flex space-x-2">
                  <button
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    disabled={true}
                  >
                    Anterior
                  </button>
                  <button
                    className="inline-flex items-center px-3 py-1 border border-transparent rounded-md text-sm font-medium text-foreground bg-muted hover:bg-muted/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    disabled={true}
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar comentarios:", error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card shadow overflow-hidden rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-destructive mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-foreground mb-2">Error al cargar los comentarios</h2>
              <p className="text-muted-foreground mb-4">Ocurriu00f3 un error al intentar cargar los comentarios. Por favor, intente nuevamente mu00e1s tarde.</p>
              <div className="flex justify-center space-x-4">
                <Link
                  href="/admin/dashboard"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-colors duration-200"
                >
                  Volver al Dashboard
                </Link>
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-foreground bg-background hover:bg-muted transition-colors duration-200"
                >
                  Reintentar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
