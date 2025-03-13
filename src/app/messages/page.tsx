"use client"
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatWindow } from "@/src/app/components/Chat/ChatWindow";

interface User {
  id: string;
  username: string | null;
  image: string | null;
}

interface Conversation {
  id: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: User;
  receiver: User;
}

export default function MessagesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirigir si no está autenticado
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }

    // Obtener conversaciones cuando el usuario esté autenticado
    if (status === "authenticated" && session?.user?.id) {
      const fetchConversations = async () => {
        try {
          const res = await fetch('/api/messages/conversations');
          if (!res.ok) throw new Error('Error al cargar conversaciones');
          const data = await res.json();
          setConversations(data);
        } catch (error) {
          console.error('Error:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchConversations();
    }
  }, [session, status, router]);

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-white">Cargando mensajes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Mensajes Directos</h1>
      {conversations.length === 0 ? (
        <div className="text-center p-8 bg-blue-900 rounded-lg">
          <p className="text-white">No tienes conversaciones activas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {conversations.map((conversation) => {
            const otherUser = conversation.senderId === session?.user?.id 
              ? conversation.receiver 
              : conversation.sender;
              
            return (
              <div key={conversation.id} className="border rounded-lg p-4 bg-blue-900">
                <ChatWindow 
                  otherUser={otherUser} 
                  currentUserId={session?.user?.id as string}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}