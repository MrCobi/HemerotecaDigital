"use client";
import { useEffect, useState, useContext, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatWindow } from "@/src/app/components/Chat/ChatWindow";
import { Button } from "@/src/app/components/ui/button";
import {
  MessageSquarePlus,
  MessageCircle,
  ArrowLeft,
  Users2,
  Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/app/components/ui/dialog";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/app/components/ui/avatar";
import { Input } from "@/src/app/components/ui/input";
import { UnreadMessagesContext } from "@/src/app/contexts/UnreadMessagesContext";
import { CldImage } from "next-cloudinary";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";

interface User {
  id: string;
  username: string | null;
  image: string | null;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  read: boolean;
  createdAt: string;
}

interface Conversation {
  id: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender: User;
  receiver: User;
  lastMessage?: Message;
  unreadCount?: number;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState(false);
  const { updateUnreadCount } = useContext(UnreadMessagesContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const CONVERSATIONS_PER_PAGE = 15;

  const conversationId = searchParams.get("conversationWith");

  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return;
  
    try {
      const res = await fetch(
        `/api/messages/conversations?page=${currentPage}&limit=${CONVERSATIONS_PER_PAGE}`
      );
      if (!res.ok) throw new Error("Error al cargar conversaciones");
      
      const data = await res.json();
      
      // Añadir verificación de data.conversations
      const receivedConversations = data.conversations || [];
      
      const updatedConversations = receivedConversations.map((conv: Conversation) => ({
        ...conv,
        lastMessage: conv.lastMessage ? {
          ...conv.lastMessage,
          createdAt: new Date(conv.lastMessage.createdAt)
        } : null
      }));
  
      setConversations(prev => {
        const merged = [...updatedConversations, ...prev.filter(c => 
          !updatedConversations.some((uc: Conversation) => uc.id === c.id)
        )];
        return merged.sort((a, b) => 
          new Date(b.lastMessage?.createdAt || b.createdAt).getTime() - 
          new Date(a.lastMessage?.createdAt || a.createdAt).getTime()
        );
      });
  
      setTotalPages(
        Math.ceil((data.total || updatedConversations.length) / CONVERSATIONS_PER_PAGE)
      );
  
      if (conversationId) {
        const targetConversation = updatedConversations.find((conv: Conversation) => {
          const otherUserId = conv.senderId === session.user.id ? conv.receiverId : conv.senderId;
          return otherUserId === conversationId;
        });
  
        if (targetConversation) {
          setSelectedConversation(targetConversation.id);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, currentPage, conversationId]);

  useEffect(() => {
    const handleResize = () => {
      setMobileView(window.innerWidth < 768);
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
    }

    if (status === "authenticated") {
      fetchConversations();
    }
  }, [status, router, fetchConversations]);

  useEffect(() => {
    const handleFocus = () => {
      if (status === "authenticated") {
        fetchConversations();
      }
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [status, fetchConversations]);

  const loadMutualFollowers = async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch("/api/relationships/mutual");
      if (!res.ok) throw new Error("Error al cargar seguidores mutuos");
      const data = await res.json();

      const existingUserIds = new Set(
        conversations.map((conv) =>
          conv.senderId === session.user.id ? conv.receiverId : conv.senderId
        )
      );

      const filteredUsers = data.filter(
        (user: User) => !existingUserIds.has(user.id)
      );
      setMutualFollowers(filteredUsers);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const filteredUsers = searchTerm
  ? mutualFollowers.filter((user) => 
      user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  : mutualFollowers;

  const startNewConversation = async (userId: string) => {
    if (!session?.user) return;

    try {
      setDialogOpen(false);

      const otherUser = mutualFollowers.find((user) => user.id === userId);
      if (!otherUser) return;

      const tempId = `temp-${Date.now()}`;
      const tempConversation: Conversation = {
        id: tempId,
        senderId: session.user.id,
        receiverId: otherUser.id,
        createdAt: new Date().toISOString(),
        sender: {
          id: session.user.id,
          username: session.user.username || null,
          image: session.user.image || null,
        },
        receiver: otherUser,
        unreadCount: 0,
      };

      setConversations((prev) => [tempConversation, ...prev]);
      setSelectedConversation(tempId);

      const response = await fetch("/api/messages/conversations/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) throw new Error("Error al crear la conversación");

      await fetchConversations();
      const newConversation = conversations.find(
        (conv: Conversation) =>
          (conv.senderId === session.user.id && conv.receiverId === userId) ||
          (conv.receiverId === session.user.id && conv.senderId === userId)
      );

      if (newConversation) {
        setSelectedConversation(newConversation.id);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    const conversation = conversations.find((c) => c.id === conversationId);
    if (conversation) {
      const otherUserId =
        conversation.senderId === session?.user?.id
          ? conversation.receiverId
          : conversation.senderId;
      router.push(`/messages?conversationWith=${otherUserId}`);
      setSelectedConversation(conversationId);
    }
  };

  const handleBackToList = () => {
    setSelectedConversation(null);
    if (mobileView) router.push("/messages");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const selectedConversationData = conversations.find(
    (conv) => conv.id === selectedConversation
  );
  const otherUser = selectedConversationData
    ? selectedConversationData.senderId === session?.user?.id
      ? selectedConversationData.receiver
      : selectedConversationData.sender
    : null;

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Lista de conversaciones */}
      {(!mobileView || !selectedConversation) && (
        <div className="w-full md:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Header con botón nuevo mensaje */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white shadow-sm"
                  onClick={loadMutualFollowers}
                >
                  <MessageSquarePlus className="h-4 w-4 mr-2" />
                  Nuevo mensaje
                </Button>
              </DialogTrigger>

              {/* Diálogo nuevo mensaje */}
              <DialogContent className="max-w-md p-0 bg-white dark:bg-gray-800 rounded-lg overflow">
                <DialogHeader className="px-6 pt-6">
                  <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-blue-500" />
                    Nuevo mensaje
                  </DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6">
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar contacto..."
                      className="pl-10 rounded-lg bg-gray-100 dark:bg-gray-700 border-none"
                    />
                  </div>

                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                        onClick={() => startNewConversation(user.id)}
                      >
                        <Avatar className="h-10 w-10">
                          {user.image ? (
                            <CldImage
                              src={user.image}
                              alt={user.username || "Usuario"}
                              width={40}
                              height={40}
                              className="rounded-full"
                            />
                          ) : (
                            <AvatarFallback className="bg-blue-100 dark:bg-blue-800">
                              {user.username?.[0] || "U"}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div className="ml-3">
                          <p className="font-medium text-gray-800 dark:text-gray-200">
                            {user.username}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Seguimiento mutuo
                          </p>
                        </div>
                      </div>
                    ))}

                    {filteredUsers.length === 0 && (
                      <div className="text-center py-8">
                        <Users2 className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 dark:text-gray-300 font-medium">
                          No se encontraron usuarios
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Lista de conversaciones */}
          <div className="overflow-y-auto h-[calc(100vh-160px)]">
            {conversations.map((conversation) => {
              const currentOtherUser =
                conversation.senderId === session?.user?.id
                  ? conversation.receiver
                  : conversation.sender;

              return (
                <div
                  key={conversation.id}
                  className={`flex items-center p-3 gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer border-b border-gray-200 dark:border-gray-700 ${
                    selectedConversation === conversation.id
                      ? "bg-blue-50 dark:bg-blue-900/20"
                      : ""
                  }`}
                  onClick={() => handleConversationSelect(conversation.id)}
                >
                  {/* Avatar y contenido de la conversación */}
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                        {currentOtherUser.username}
                      </h3>
                      {conversation.lastMessage && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(
                            conversation.lastMessage.createdAt
                          ).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    {conversation.lastMessage ? (
                      <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                        {conversation.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">
                        Conversación iniciada
                      </p>
                    )}
                  </div>
                  {(conversation.unreadCount ?? 0) > 0 && (
                    <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs">
                      {conversation.unreadCount}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Área de chat */}
      <div className="flex-1 flex flex-col">
        {selectedConversation && otherUser ? (
          <ChatWindow
            otherUser={otherUser}
            currentUserId={session?.user?.id || ""}
            onMessageSent={() => {
              const fetchConversations = async () => {
                const res = await fetch("/api/messages/conversations");
                if (res.ok) {
                  const data = await res.json();
                  const sortedConversations = data.sort(
                    (a: Conversation, b: Conversation) => {
                      const dateA = a.lastMessage?.createdAt || a.createdAt;
                      const dateB = b.lastMessage?.createdAt || b.createdAt;
                      return (
                        new Date(dateB).getTime() - new Date(dateA).getTime()
                      );
                    }
                  );
                  setConversations(sortedConversations);
                }
              };
              fetchConversations();
            }}
            isOpen={true}
            onClose={handleBackToList}
            isMobile={mobileView}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
            <div className="text-center p-8">
              <MessageCircle className="h-12 w-12 mx-auto text-blue-500 dark:text-blue-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Selecciona una conversación
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Elige una conversación existente o inicia una nueva
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
