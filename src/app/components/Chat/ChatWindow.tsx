"use client";
import { useState, useEffect, useContext, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Avatar } from "../ui/avatar";
import { UnreadMessagesContext } from "@/src/app/contexts/UnreadMessagesContext";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
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
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const unreadContext = useContext(UnreadMessagesContext);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Configurar Server-Sent Events (SSE)
  useEffect(() => {
    if (!session || !isOpen) return;

    // Cerrar conexión anterior si existe
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    console.log('Connecting to SSE endpoint...');
    
    try {
      const eventSource = new EventSource('/api/messages/sse-messages');
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('SSE connected successfully');
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('Received SSE message:', message);
          
          // Si es un mensaje de tipo 'connected', ignorarlo
          if (message.type === 'connected') return;
          
          // Solo procesar mensajes relacionados con la conversación actual
          if (
            (message.senderId === otherUser.id && message.receiverId === currentUserId) || 
            (message.senderId === currentUserId && message.receiverId === otherUser.id)
          ) {
            console.log('Adding/updating message in state');
            setMessages((prev) =>
              prev.some((m) => m.id === message.id)
                ? prev.map((m) => (m.id === message.id ? message : m))
                : [...prev, message]
            );

            // Marcar como leído si somos el receptor
            if (message.receiverId === currentUserId && !message.read) {
              fetch(`/api/messages/read?senderId=${otherUser.id}`, {
                method: "POST",
              }).then(() => {
                unreadContext.updateUnreadCount();
              });
            }
          }
        } catch (error) {
          console.error("Error procesando mensaje SSE:", error);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE error:", error);
        // Cerrar y reconectar en error
        eventSource.close();
        eventSourceRef.current = null;
        // Intentar reconectar después de un breve retraso
        setTimeout(() => {
          if (isOpen && session) {
            console.log('Reconnecting to SSE after error...');
            const newEventSource = new EventSource('/api/messages/sse-messages');
            eventSourceRef.current = newEventSource;
          }
        }, 2000);
      };

      return () => {
        console.log('Closing SSE connection');
        eventSource.close();
        eventSourceRef.current = null;
      };
    } catch (error) {
      console.error('Error creating SSE connection:', error);
    }
  }, [session, isOpen, currentUserId, otherUser.id, unreadContext]);

  // Cargar mensajes iniciales optimizado
  const initializeChat = useCallback(async () => {
    try {
      const [messagesRes, followRes] = await Promise.all([
        fetch(`/api/messages?userId=${otherUser.id}&cache=${Date.now()}`),
        fetch(`/api/relationships/check?targetUserId=${otherUser.id}`),
      ]);

      const [messagesData, followData] = await Promise.all([
        messagesRes.json(),
        followRes.json(),
      ]);

      setMessages(messagesData);
      setIsMutualFollow(followData.isMutualFollow);

      if (
        messagesData.some(
          (msg: Message) => !msg.read && msg.receiverId === currentUserId
        )
      ) {
        await fetch(`/api/messages/read?senderId=${otherUser.id}`, {
          method: "POST",
        });
        unreadContext.updateUnreadCount();
      }
    } catch (error) {
      console.error("Error inicializando chat:", error);
    }
  }, [otherUser.id, currentUserId, unreadContext]);

  useEffect(() => {
    if (session && isOpen) initializeChat();
  }, [session, isOpen, initializeChat]);

  // Scroll automático optimizado
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (container) {
      const isNearBottom =
        container.scrollHeight - container.clientHeight <=
        container.scrollTop + 100;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
    }
  }, [messages]);

  // Envío optimizado de mensajes
  const handleSend = async () => {
    if (!session || !newMessage.trim() || !isMutualFollow || isSending) return;

    const trimmedMessage = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    const tempMessage = {
      id: tempId,
      content: trimmedMessage,
      senderId: currentUserId,
      receiverId: otherUser.id,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setIsSending(true);
    setMessages((prev) => [...prev, tempMessage]);
    setNewMessage("");

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          // Añadir un timestamp para evitar caché
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0" 
        },
        body: JSON.stringify({
          receiverId: otherUser.id,
          content: trimmedMessage,
          timestamp: Date.now() // Añadir timestamp para prevenir cacheo
        }),
      });

      if (!response.ok) throw new Error("Error enviando mensaje");
      
      const realMessage = await response.json();
      setMessages((prev) =>
        prev.map((msg) => (msg.id === tempId ? realMessage : msg))
      );
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // Agrupación eficiente de mensajes
  const groupMessagesByDate = useCallback(() => {
    const groups: { [key: string]: Message[] } = {};
    for (const message of messages) {
      const date = new Date(message.createdAt).toLocaleDateString("es-ES");
      groups[date] = groups[date] || [];
      groups[date].push(message);
    }
    return groups;
  }, [messages]);

  // Formateo de fecha memoizado
  const formatDateHeader = useCallback((dateStr: string) => {
    const date = new Date(dateStr.split("/").reverse().join("-"));
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";

    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }, []);

  if (!session) return null;

  return (
    <div className="flex flex-col h-full bg-gradient-to-r from-blue-600/10 to-indigo-600/10 dark:from-blue-900/30 dark:to-indigo-900/30">
      {/* Cabecera */}
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
          {otherUser?.image && otherUser.image.includes("cloudinary") ? (
            // Si la imagen es URL completa de Cloudinary
            <CldImage
              src={otherUser.image}
              alt={otherUser?.username || "Avatar"}
              width={40}
              height={40}
              crop="fill"
              gravity="face"
              className="object-cover rounded-full"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          ) : otherUser?.image &&
            !otherUser.image.startsWith("/") &&
            !otherUser.image.startsWith("http") ? (
            // Si la imagen es un public_id de Cloudinary
            <CldImage
              src={otherUser.image}
              alt={otherUser?.username || "Avatar"}
              width={40}
              height={40}
              crop="fill"
              gravity="face"
              className="object-cover rounded-full"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          ) : (
            // Para imágenes locales o fallback
            <Image
              src={otherUser?.image || "/images/AvatarPredeterminado.webp"}
              alt={otherUser?.username || "Avatar"}
              width={40}
              height={40}
              className="object-cover rounded-full"
              priority
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = "/images/AvatarPredeterminado.webp";
              }}
            />
          )}
        </Avatar>
        <div className="ml-3">
          <h2 className="font-semibold text-gray-800 dark:text-white">
            {otherUser?.username || "Usuario desconocido"}
          </h2>
          {isMutualFollow && (
            <div className="flex items-center text-xs text-green-600 dark:text-green-400">
              <UserCheck className="h-3 w-3 mr-1" />
              Seguimiento mutuo
            </div>
          )}
        </div>
      </div>

      {/* Mensajes */}
      <div className="flex-1 overflow-y-auto" ref={messagesContainerRef}>
        <div className="max-w-3xl mx-auto px-4 pb-4 h-[calc(100vh-180px)]">
          {Object.entries(groupMessagesByDate()).map(([date, msgs]) => (
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
                            hour: "2-digit",
                            minute: "2-digit",
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

      {/* Entrada de mensajes */}
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
