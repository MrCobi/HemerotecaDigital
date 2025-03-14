"use client";
import { useEffect, useState, useContext, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChatWindow } from "@/src/app/components/Chat/ChatWindow";
import { Button } from "@/src/app/components/ui/button";
import {
  MessageSquarePlus,
  MessageCircle,
  Users2,
  Search,
  UserCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/app/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/src/app/components/ui/avatar";
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

interface CombinedItem {
  id: string;
  isConversation: boolean;
  data: Conversation | User;
  lastInteraction?: Date;
}

export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [mutualFollowers, setMutualFollowers] = useState<User[]>([]);
  const [combinedList, setCombinedList] = useState<CombinedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [generalSearchTerm, setGeneralSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [mobileView, setMobileView] = useState(false);
  const { updateUnreadCount } = useContext(UnreadMessagesContext);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const CONVERSATIONS_PER_PAGE = 15;

  const conversationId = searchParams.get("conversationWith");

  useEffect(() => {
    const savedConversations = localStorage.getItem("conversations");
    if (savedConversations) {
      setConversations(JSON.parse(savedConversations));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch(
        `/api/messages/conversations?page=${currentPage}&limit=${CONVERSATIONS_PER_PAGE}`
      );
      if (!res.ok) throw new Error("Error al cargar conversaciones");

      const data = await res.json();
      const receivedConversations = data.conversations || [];

      const updatedConversations = receivedConversations.map((conv: any) => ({
        id: conv.id,
        senderId: session.user.id,
        receiverId: conv.receiver.id,
        createdAt: conv.createdAt,
        sender: {
          id: session.user.id,
          username: session.user.username,
          image: session.user.image,
        },
        receiver: conv.receiver,
        lastMessage: conv.lastMessage
          ? {
              ...conv.lastMessage,
              createdAt: new Date(conv.lastMessage.createdAt),
            }
          : null,
        unreadCount: conv.unreadCount,
      }));

      setConversations((prev) => {
        const merged = [
          ...updatedConversations,
          ...prev.filter(
            (c) =>
              !updatedConversations.some((uc: Conversation) => uc.id === c.id)
          ),
        ];
        return merged.sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt || b.createdAt).getTime() -
            new Date(a.lastMessage?.createdAt || a.createdAt).getTime()
        );
      });
      setTotalPages(
        Math.ceil(
          (data.total || updatedConversations.length) / CONVERSATIONS_PER_PAGE
        )
      );
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, currentPage, conversationId]);

  useEffect(() => {
    const combineLists = () => {
      const currentUserId = session?.user?.id;
      const existingUserIds = new Set(
        conversations.flatMap(c => [
          c.senderId === currentUserId ? c.receiverId : c.senderId,
          c.senderId,
          c.receiverId
        ])
      );

      const newCombined = [
        ...conversations.map((c) => ({
          id: c.id,
          isConversation: true,
          data: c,
          lastInteraction: new Date(c.lastMessage?.createdAt || c.createdAt),
        })),
        ...mutualFollowers
          .filter((user) => user.id !== currentUserId && !existingUserIds.has(user.id))
          .map((user) => ({
            id: `mutual-${user.id}`,
            isConversation: false,
            data: user,
            lastInteraction: new Date(0),
          })),
      ].sort(
        (a, b) => b.lastInteraction.getTime() - a.lastInteraction.getTime()
      );

      setCombinedList(newCombined);
    };

    combineLists();
  }, [conversations, mutualFollowers, session?.user?.id]);

  const filteredCombinedList = combinedList.filter((item) => {
    const searchLower = generalSearchTerm.toLowerCase();
    if (item.isConversation) {
      const conv = item.data as Conversation;
      const otherUser =
        conv.senderId === session?.user?.id ? conv.receiver : conv.sender;
      return otherUser?.username?.toLowerCase().includes(searchLower);
    }
    const user = item.data as User;
    return user?.username?.toLowerCase().includes(searchLower);
  });

  useEffect(() => {
    const handleResize = () => setMobileView(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/api/auth/signin");
    if (status === "authenticated") {
      fetchConversations();
      loadMutualFollowers();
    }
  }, [status, router, fetchConversations]);

  useEffect(() => {
    const handleFocus = () => {
      if (status === "authenticated") {
        fetchConversations().then(() => {
          localStorage.setItem("conversations", JSON.stringify(conversations));
        });
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [status, fetchConversations, conversations]);

  useEffect(() => {
    const conversationIdParam = searchParams.get("conversationWith");
    if (conversationIdParam) {
      const targetConv = conversations.find(
        (conv) =>
          conv.senderId === conversationIdParam ||
          conv.receiverId === conversationIdParam
      );
      if (targetConv) setSelectedConversation(targetConv.id);
    }
  }, [searchParams, conversations]);

  const loadMutualFollowers = async () => {
    if (!session?.user?.id) return;
    try {
      const res = await fetch("/api/relationships/mutual");
      if (!res.ok) throw new Error("Error al cargar seguidores mutuos");
      const data = await res.json();

      const existingUserIds = new Set(
        conversations.flatMap(conv => [conv.senderId, conv.receiverId])
      );

      setMutualFollowers(
        data.filter((user: User) => 
          user.id !== session.user.id && 
          !existingUserIds.has(user.id)
      ));
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const startNewConversation = async (userId: string) => {
    try {
      setMutualFollowers(prev => prev.filter(user => user.id !== userId));
      setDialogOpen(false);
      const res = await fetch("/api/messages/conversations/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (!res.ok) throw new Error("Error al crear conversación");
      const { conversation: newConversation } = await res.json();

      setConversations((prev) => [
        { ...newConversation, lastMessage: null, unreadCount: 0 },
        ...prev,
      ]);

      router.push(`/messages?conversationWith=${userId}`);
      setSelectedConversation(newConversation.id);
    } catch (error) {
      console.error("Error:", error);
      setConversations((prev) =>
        prev.filter((conv) => !conv.id.startsWith("temp-"))
      );
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
      {(!mobileView || !selectedConversation) && (
        <div className="w-full md:w-96 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar conversaciones..."
                className="pl-10 rounded-xl bg-gray-100 dark:bg-gray-700 border-0 focus-visible:ring-2 ring-blue-500"
                value={generalSearchTerm}
                onChange={(e) => setGeneralSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-160px)] px-2 pb-4">
            {filteredCombinedList.map((item) => {
              if (item.isConversation) {
                const conversation = item.data as Conversation;
                const currentOtherUser =
                  conversation.senderId === session?.user?.id
                    ? conversation.receiver
                    : conversation.sender;

                return (
                  <div
                    key={`conv-${conversation.id}-${
                      conversation.lastMessage?.createdAt ||
                      conversation.createdAt
                    }`}
                    className={`group flex items-center p-3 gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer rounded-xl m-2 ${
                      selectedConversation === conversation.id
                        ? "bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 shadow-sm"
                        : ""
                    }`}
                    onClick={() => handleConversationSelect(conversation.id)}
                  >
                    <Avatar className="h-14 w-14 border-2 border-blue-200 dark:border-blue-800 group-hover:border-blue-500">
                      {currentOtherUser?.image ? (
                        <CldImage
                          src={currentOtherUser.image}
                          alt={currentOtherUser?.username || "Usuario"}
                          width={56}
                          height={56}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-lg font-medium">
                          {currentOtherUser?.username?.[0]?.toUpperCase() ||
                            "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1 gap-2">
                        <h3 className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                          {currentOtherUser?.username || "Usuario desconocido"}
                        </h3>
                        {conversation.lastMessage && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            {new Date(
                              conversation.lastMessage.createdAt
                            ).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex justify-between items-center">
                        {conversation.lastMessage ? (
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {conversation.lastMessage.content}
                          </p>
                        ) : (
                          <p className="text-sm text-blue-500 italic">
                            Nuevo chat
                          </p>
                        )}
                        {(conversation.unreadCount ?? 0) > 0 && (
                          <span className="bg-red-500 text-white rounded-full px-2 py-1 text-xs min-w-[24px] flex justify-center items-center">
                            {conversation.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              } else {
                const user = item.data as User;
                return (
                  <div
                    key={`mutual-${user.id}`}
                    className="group flex items-center p-3 gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all cursor-pointer rounded-xl m-2"
                    onClick={() => startNewConversation(user.id)}
                  >
                    <Avatar className="h-14 w-14 border-2 border-blue-200 dark:border-blue-800">
                      {user?.image ? (
                        <CldImage
                          src={user.image}
                          alt={user?.username || "Usuario"}
                          width={56}
                          height={56}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-lg font-medium">
                          {user?.username?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                        {user.username || "Usuario sin nombre"}
                      </h3>
                      <p className="text-sm text-blue-500 italic">
                        Nuevo chat disponible
                      </p>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col">
        {selectedConversation && otherUser ? (
          <ChatWindow
            otherUser={otherUser}
            currentUserId={session?.user?.id || ""}
            onMessageSent={fetchConversations}
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