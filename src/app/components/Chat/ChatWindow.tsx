"use client";
import { useState, useEffect, useContext, useRef } from "react";
import { useSession } from "next-auth/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import {
  UnreadMessagesContext,
  UnreadMessagesContextType,
} from "@/src/app/contexts/UnreadMessagesContext";
import { CldImage } from "next-cloudinary";
import {
  Send,
  UserCheck,
  Clock,
  MessageCircle,
  ChevronLeft,
} from "lucide-react";

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
  createdAt: string;
  read: boolean;
}

export function ChatWindow({
  otherUser,
  currentUserId,
  onMessageSent,
  isOpen,
  onClose,
  isMobile,
}: {
  otherUser: User;
  currentUserId: string;
  onMessageSent?: () => void;
  isOpen: boolean;
  onClose: () => void;
  isMobile: boolean;
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isMutualFollow, setIsMutualFollow] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const unreadContext = useContext<UnreadMessagesContextType>(
    UnreadMessagesContext
  );
  const eventSourceRef = useRef<EventSource | null>(null);

  // Verificar si existe seguimiento mutuo
  const checkMutualFollow = async () => {
    try {
      const res = await fetch(
        `/api/relationships/check?targetUserId=${otherUser.id}`
      );
      const data = await res.json();
      setIsMutualFollow(data.isMutualFollow);
    } catch (error) {
      console.error("Error al verificar seguimiento mutuo:", error);
      setIsMutualFollow(false);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!session) return;

    const res = await fetch(`/api/messages?userId=${otherUser.id}`);
    const data = await res.json();

    // Marcar mensajes como leídos si son recibidos y no leídos
    const hasUnreadMessages = data.some(
      (msg: Message) => msg.receiverId === currentUserId && !msg.read
    );

    if (hasUnreadMessages) {
      await fetch(`/api/messages/read?senderId=${otherUser.id}`, {
        method: "POST",
      });
      unreadContext.updateUnreadCount();
    }

    setMessages(data);
  };

  // Configurar SSE para actualizaciones en tiempo real
  useEffect(() => {
    if (session && isOpen) {
      // Cerrar conexión SSE existente si hay una
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // Crear nueva conexión SSE
      const eventSource = new EventSource(
        `/api/messages/sse?userId=${otherUser.id}`
      );

      eventSource.onmessage = (event) => {
        const newMessage = JSON.parse(event.data);
        setMessages((prev) => {
          // Evitar duplicados
          if (!prev.some((msg) => msg.id === newMessage.id)) {
            return [...prev, newMessage];
          }
          return prev;
        });
      };

      eventSourceRef.current = eventSource;

      return () => {
        eventSource.close();
        eventSourceRef.current = null;
      };
    }
  }, [session, otherUser.id, isOpen]);

  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    
    const setupSSE = () => {
      if (session && isOpen && otherUser.id) {
        const eventSource = new EventSource(
          `/api/messages/sse?userId=${otherUser.id}`
        );
  
        eventSource.onmessage = (event) => {
          try {
            const newMessage = JSON.parse(event.data);
            setMessages(prev => {
              const exists = prev.some(msg => msg.id === newMessage.id);
              return exists ? prev : [...prev, newMessage];
            });
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
  
        eventSource.onerror = () => {
          eventSource.close();
          reconnectTimer = setTimeout(setupSSE, 3000);
        };
      }
    };
  
    setupSSE();
  
    return () => {
      clearTimeout(reconnectTimer);
    };
  }, [session, otherUser.id, isOpen]);

  // Scroll al último mensaje cuando cambian los mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (session && isOpen) {
      checkMutualFollow();
      fetchMessages();
    }
  }, [session, otherUser.id, isOpen]);

  const handleSend = async () => {
    if (!session || !newMessage.trim() || !isMutualFollow || isSending) return;
  
    setIsSending(true);
    const optimisticMessage: Message = {
      id: `temp-${Date.now()}`,
      content: newMessage,
      senderId: currentUserId,
      receiverId: otherUser.id,
      createdAt: new Date().toISOString(),
      read: false,
    };
  
    try {
      setMessages(prev => [...prev, optimisticMessage]);
      setNewMessage("");
  
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: otherUser.id,
          content: newMessage,
        }),
      });
  
      if (!response.ok) throw new Error("Error al enviar mensaje");
      
      await fetchMessages();
      
    } catch (error) {
      console.error("Error:", error);
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const groupMessagesByDate = () => {
    const groups: { [key: string]: Message[] } = {};

    messages.forEach((message) => {
      const date = new Date(message.createdAt).toLocaleDateString("es-ES");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
    });

    return groups;
  };

  const messageGroups = groupMessagesByDate();

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr.split(",")[0]);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Hoy";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Ayer";
    } else {
      return date.toLocaleDateString("es-ES", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
  };

  const toggleConversation = () => {
    if (isOpen) {
      onClose();
    } else {
      fetchMessages(); // Ensure messages are fetched when opening
    }
  };

  if (!session) return null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-900/30 dark:to-indigo-900/30 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-3xl transform -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-indigo-500/5 rounded-full blur-3xl transform translate-x-1/2 translate-y-1/2"></div>
      </div>

      {/* Header */}
      <div className="flex items-center p-4 border-b border-blue-200/30 dark:border-blue-800/30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 shadow-sm">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30"
            onClick={onClose}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        )}
        <Avatar className="h-10 w-10 ring-2 ring-blue-200/50 dark:ring-blue-700/50">
          {otherUser.image ? (
            <CldImage
              src={otherUser.image}
              alt={otherUser.username || "Usuario"}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <AvatarFallback className="bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
              {otherUser.username?.[0] || "U"}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="ml-3">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            {otherUser.username}
          </h2>
          {isMutualFollow && (
            <div className="flex items-center text-xs text-green-600 dark:text-green-400">
              <UserCheck className="h-3 w-3 mr-1" />
              Seguimiento mutuo
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 pb-4 h-[calc(100vh-180px)]">
          {Object.entries(messageGroups).map(([date, msgs]) => (
            <div key={date}>
              <div className="sticky top-2 z-20 mb-4">
                <div className="inline-flex px-4 py-1 text-xs font-medium bg-white dark:bg-gray-800 rounded-full shadow-sm border border-gray-200 dark:border-gray-700">
                  {formatDateHeader(date)}
                </div>
              </div>

              <div className="space-y-2">
                {msgs.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderId === currentUserId
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >
                    <div
                      className={`p-3 rounded-lg max-w-[80%] ${
                        message.senderId === currentUserId
                          ? "bg-blue-500 text-white ml-auto rounded-br-none"
                          : "bg-gray-100 dark:bg-gray-700 mr-auto rounded-bl-none"
                      }`}
                    >
                      <p className="text-sm break-words">{message.content}</p>
                      <div className="flex items-center justify-end gap-1 mt-2">
                        <span className="text-xs opacity-75">
                          {new Date(message.createdAt).toLocaleTimeString([], {
                            timeStyle: "short",
                          })}
                        </span>
                        {message.senderId === currentUserId &&
                          (message.read ? (
                            <UserCheck className="w-3 h-3" />
                          ) : (
                            <Clock className="w-3 h-3" />
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {isMutualFollow ? (
        <div className="p-4 border-t border-blue-200/30 dark:border-blue-800/30 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2"
          >
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-blue-50/50 dark:bg-blue-900/30 border-blue-200/50 dark:border-blue-700/50 text-gray-800 dark:text-white placeholder:text-blue-400 focus-visible:ring-blue-400"
            />
            <Button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white shadow-sm transition-all"
            >
              {isSending ? (
                <Clock className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      ) : (
        <div className="p-4 text-center text-amber-800 dark:text-amber-200 border-t border-amber-100 dark:border-amber-800/50 bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm z-10">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 text-amber-600 dark:text-amber-400" />
          <p className="font-medium">
            Necesitas seguimiento mutuo para enviar mensajes
          </p>
        </div>
      )}
    </div>
  );
}
