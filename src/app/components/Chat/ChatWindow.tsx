// src/app/components/Chat/ChatWindow.tsx
'use client';
import { useState, useEffect } from 'react';
import { useSession } from "next-auth/react";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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

export function ChatWindow({ otherUser, currentUserId, onMessageSent }: { 
  otherUser: User;
  currentUserId: string;
  onMessageSent?: () => void;
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isMutualFollow, setIsMutualFollow] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar si existe seguimiento mutuo
  const checkMutualFollow = async () => {
    try {
      const res = await fetch(`/api/relationships/check?targetUserId=${otherUser.id}`);
      const data = await res.json();
      setIsMutualFollow(data.isMutualFollow);
    } catch (error) {
      console.error('Error al verificar seguimiento mutuo:', error);
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
      // Llamar a la API para marcar mensajes como leídos
      await fetch(`/api/messages/read?senderId=${otherUser.id}`, {
        method: 'POST'
      });
    }
    
    setMessages(data);
  };

  useEffect(() => {
    if (session) {
      checkMutualFollow();
      fetchMessages();
      
      const interval = setInterval(() => {
        checkMutualFollow();
        fetchMessages();
      }, 5000);
      
      return () => clearInterval(interval);
    }
  }, [session, otherUser.id]);

  const handleSend = async () => {
    if (!session || !newMessage.trim() || !isMutualFollow) return;

    await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        receiverId: otherUser.id,
        content: newMessage
      })
    });
    
    setNewMessage('');
    await fetchMessages();
    
    // Notificar al componente padre que se ha enviado un mensaje
    if (onMessageSent) {
      onMessageSent();
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Cargando sesión...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p>Cargando conversación...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-96">
      <div className="flex items-center gap-2 mb-4 p-3 border-b border-blue-800">
        <Avatar>
          <AvatarImage src={otherUser.image || ''} />
          <AvatarFallback>
            {otherUser.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold">{otherUser.username || 'Usuario'}</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.senderId === currentUserId ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs p-3 rounded-lg ${
                message.senderId === currentUserId 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}>
                <p>{message.content}</p>
                <div className="flex justify-between items-center">
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(message.createdAt).toLocaleTimeString()}
                  </p>
                  {message.senderId === currentUserId && (
                    <div className="text-xs opacity-70 ml-2">
                      {message.read ? (
                        <span>✓✓</span>
                      ) : (
                        <span>✓</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-400">No hay mensajes</p>
          </div>
        )}
      </div>
      
      {isMutualFollow ? (
        <div className="flex gap-2 p-3 border-t border-blue-800">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Escribe un mensaje..."
            className="bg-blue-800 border-blue-700 text-white placeholder:text-blue-300"
          />
          <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">Enviar</Button>
        </div>
      ) : (
        <div className="p-3 bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded-lg text-sm text-center">
          Debes seguirse mutuamente con este usuario para poder enviar mensajes
        </div>
      )}
    </div>
  );
}