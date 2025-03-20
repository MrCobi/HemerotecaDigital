import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default async function MessagesPage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");

  try {
    const messages = await prisma.directMessage.findMany({
      select: {
        id: true,
        content: true,
        read: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Administraciu00f3n de Mensajes</h1>
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
                <h2 className="text-lg font-medium text-card-foreground">Mensajes Directos</h2>
                <p className="text-sm text-muted-foreground">Supervise la comunicaciu00f3n entre usuarios en la plataforma.</p>
              </div>
              <div className="flex space-x-4">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar mensajes..."
                    className="border border-input px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
                <select
                  className="border border-input px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-background"
                >
                  <option value="">Todos</option>
                  <option value="read">Leu00eddos</option>
                  <option value="unread">No leu00eddos</option>
                </select>
              </div>
            </div>

            <div className="overflow-x-auto rounded-md border">
              {messages.length > 0 ? (
                <div className="divide-y divide-border">
                  {messages.map((message) => (
                    <div key={message.id} className={`p-4 hover:bg-muted/50 ${message.read ? '' : 'bg-primary/5'}`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0 flex flex-col items-center space-y-1 mr-4">
                          <div className="flex items-center">
                            {message.sender.image ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={message.sender.image}
                                alt={message.sender.name || message.sender.username || 'Remitente'}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                {(message.sender.name || message.sender.username || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mx-1 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                            </svg>
                            {message.receiver.image ? (
                              <img
                                className="h-10 w-10 rounded-full"
                                src={message.receiver.image}
                                alt={message.receiver.name || message.receiver.username || 'Destinatario'}
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                {(message.receiver.name || message.receiver.username || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground text-center mt-1">
                            {formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: es })}
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <div>
                              <span className="text-sm font-medium text-foreground">
                                De: {message.sender.name || message.sender.username || 'Usuario anu00f3nimo'}
                              </span>
                              <span className="mx-1 text-muted-foreground">&rarr;</span>
                              <span className="text-sm font-medium text-foreground">
                                Para: {message.receiver.name || message.receiver.username || 'Usuario anu00f3nimo'}
                              </span>
                            </div>
                            <div className="flex items-center">
                              {message.read ? (
                                <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                                  Leu00eddo
                                </span>
                              ) : (
                                <span className="text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
                                  No leu00eddo
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm mb-2 text-foreground bg-muted/50 p-3 rounded-md">
                            {message.content}
                          </div>
                          <div className="flex justify-end space-x-2">
                            <Link 
                              href={`/admin/users/${message.sender.id}`}
                              className="text-xs px-2 py-1 rounded-md text-primary hover:bg-muted transition-colors duration-200"
                            >
                              Ver remitente
                            </Link>
                            <Link 
                              href={`/admin/users/${message.receiver.id}`}
                              className="text-xs px-2 py-1 rounded-md text-primary hover:bg-muted transition-colors duration-200"
                            >
                              Ver destinatario
                            </Link>
                            <button 
                              className="text-xs px-2 py-1 rounded-md text-destructive hover:bg-destructive/10 transition-colors duration-200"
                              onClick={() => {}}
                            >
                              Eliminar
                            </button>
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
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-lg font-medium text-foreground">No hay mensajes disponibles</p>
                    <p className="text-sm mt-1 text-muted-foreground">Au00fan no hay mensajes para supervisar</p>
                  </div>
                </div>
              )}
            </div>

            {messages.length > 0 && (
              <div className="flex justify-between items-center pt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {messages.length} de {messages.length} mensajes
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
    console.error("Error al cargar mensajes:", error);
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card shadow overflow-hidden rounded-lg p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-destructive mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold text-foreground mb-2">Error al cargar los mensajes</h2>
              <p className="text-muted-foreground mb-4">Ocurriu00f3 un error al intentar cargar los mensajes. Por favor, intente nuevamente mu00e1s tarde.</p>
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
