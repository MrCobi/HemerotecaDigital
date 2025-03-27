"use client";

import React, { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Settings } from 'lucide-react';
import { Button } from "@/src/app/components/ui/button";
import { Avatar } from "@/src/app/components/ui/avatar";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";

// Importar correctamente el componente optimizado
import OptimizedChatWindow from "./OptimizedChatWindow";

import { ConversationData, User } from '@/src/app/messages/types';

interface MessageContainerProps {
  selectedConversation?: string | null;
  selectedConversationData?: ConversationData | null;
  conversation?: ConversationData;
  onBackClick: () => void;
  onSettingsClick: () => void;
  onUserProfileClick?: (user: User) => void;
  loading?: boolean;
  isMobileView?: boolean;
  currentUserId?: string;
}

const MessageContainer = React.memo(({
  selectedConversation,
  selectedConversationData,
  conversation,
  onBackClick,
  onSettingsClick,
  onUserProfileClick,
  loading = false,
  isMobileView = false,
  currentUserId
}: MessageContainerProps) => {
  const { data: session } = useSession();
  
  // Si no hay conversación seleccionada o estamos en modo móvil sin conversación, mostrar mensaje
  if (!selectedConversation || (isMobileView && !selectedConversation)) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="flex items-center justify-center bg-gray-200 dark:bg-gray-800 p-4 rounded-full mb-4 w-16 h-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Tus mensajes</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Selecciona una conversación para comenzar a chatear
          </p>
        </div>
      </div>
    );
  }

  // Si está cargando, mostrar spinner
  if (loading) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <LoadingSpinner className="w-8 h-8 text-blue-500" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando conversación...</p>
      </div>
    );
  }

  // Si no hay datos de conversación pero hay ID, mostrar error
  if (selectedConversation && !selectedConversationData) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="flex items-center justify-center bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4 w-16 h-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8 3a1 1 0 100-2 1 1 0 000 2zm-1-9a1 1 0 011-1 1 1 0 011 1v4a1 1 0 11-2 0V4z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Error al cargar la conversación</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            No se pudo cargar la información de esta conversación
          </p>
        </div>
      </div>
    );
  }

  // En este punto, sabemos que selectedConversationData no es null
  const conversationData = selectedConversationData!;
  // Determinar si la conversación es un grupo
  const isGroup = conversationData.isGroup;
  const isRealGroup = isGroup && conversationData.participants && conversationData.participants.length > 0;

  return (
    <div className="flex-1 flex flex-col">
      {/* Conversación */}
      <OptimizedChatWindow 
        conversationId={selectedConversation} 
        conversation={conversationData}
        currentUserId={currentUserId || session?.user?.id || ""}
        onUserProfileClick={onUserProfileClick}
        className="h-full"
      />
    </div>
  );
});

MessageContainer.displayName = 'MessageContainer';

export default MessageContainer;
