import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import MessagesTable from "./MessagesTable";

export default async function MessagesPage() {
  const session = await auth();

  if (!session) redirect("/api/auth/signin");
  if (session.user.role !== "admin") redirect("/acceso-denegado");

  try {
    const messages = await prisma.directMessage.findMany({
      select: {
        id: true,
        content: true,
        createdAt: true,
        read: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Administración de Mensajes</h1>
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
          <MessagesTable messages={messages} />
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error al cargar mensajes:", error);
    
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">Administración de Mensajes</h1>
        </div>
        
        <div className="bg-card shadow overflow-hidden rounded-lg p-6 text-center">
          <div className="text-destructive text-xl mb-4">Error al cargar los mensajes</div>
          <p className="mb-4">Ha ocurrido un error al intentar cargar los mensajes. Por favor, intenta nuevamente.</p>
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
