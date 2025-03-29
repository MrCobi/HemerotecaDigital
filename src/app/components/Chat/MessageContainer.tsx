"use client";

import React from 'react';
import { useSession } from 'next-auth/react';
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";

// Importar correctamente los componentes
import OptimizedChatWindow from "./OptimizedChatWindow";
import PrivateChatWindow from "./PrivateChatWindow"; // Añadimos el nuevo componente

import { ConversationData, User } from '@/src/app/messages/types';

interface MessageContainerProps {
  _selectedConversation?: string | null;
  _selectedConversationData?: ConversationData | null;
  _conversation?: ConversationData;
  _onBackClick: () => void;
  _onSettingsClick: () => void;
  _onUserProfileClick?: (user: User) => void;
  _loading?: boolean;
  _isMobileView?: boolean;
  _currentUserId?: string;
}

const MessageContainer = React.memo(({
  _selectedConversation,
  _selectedConversationData,
  _conversation,
  _onBackClick,
  _onSettingsClick,
  _onUserProfileClick,
  _loading = false,
  _isMobileView = false,
  _currentUserId
}: MessageContainerProps) => {
  const { data: _session } = useSession();
  // Estado para seguimiento de errores de permisos
  const [accessError, setAccessError] = React.useState<string | null>(null);
  
  // Efecto para comprobar si hay un error de permisos guardado para esta conversación
  React.useEffect(() => {
    if (_selectedConversation) {
      // Verificar en localStorage si se ha guardado un error para esta conversación
      const savedError = localStorage.getItem(`chat_access_error_${_selectedConversation}`);
      if (savedError) {
        setAccessError(savedError);
      } else {
        setAccessError(null);
      }
    } else {
      setAccessError(null);
    }
  }, [_selectedConversation]);
  
  // Si no hay conversación seleccionada o estamos en modo móvil sin conversación, mostrar mensaje
  if (!_selectedConversation || (_isMobileView && !_selectedConversation)) {
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
  if (_loading) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <LoadingSpinner className="w-8 h-8 text-blue-500" />
        <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando conversación...</p>
      </div>
    );
  }

  // Si hay un error de acceso registrado, mostrar mensaje de error de permisos
  if (accessError) {
    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="flex items-center justify-center bg-red-100 dark:bg-red-900/30 p-4 rounded-full mb-4 w-16 h-16">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Error de acceso</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {accessError}
          </p>
          <button
            onClick={_onBackClick}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Si no hay datos de conversación pero hay ID, mostrar error
  if (_selectedConversation && !_selectedConversationData) {
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

  // En este punto, sabemos que _selectedConversationData no es null
  const conversationData = _selectedConversationData!;
  
  // Determinar si la conversación es un grupo mediante múltiples comprobaciones
  // 1. Comprobar el campo isGroup explícitamente
  // 2. Comprobar si el ID comienza con 'group_' o 'conv_'
  let isGroupByField = false;
  
  // Comprobar el campo isGroup con conversiones seguras para diferentes tipos de datos
  if (typeof conversationData.isGroup === 'boolean') {
    isGroupByField = conversationData.isGroup;
  } else if (typeof conversationData.isGroup === 'number') {
    isGroupByField = conversationData.isGroup === 1;
  } else if (typeof conversationData.isGroup === 'string') {
    const isGroupValue = conversationData.isGroup as string;
    isGroupByField = isGroupValue === '1' || isGroupValue.toLowerCase() === 'true';
  }
  
  const isGroupById = conversationData.id?.toString().startsWith('group_') || false;
  const isPrivateById = conversationData.id?.toString().startsWith('conv_') || false;
  
  // Si hay conflicto entre los indicadores, priorizamos el ID como fuente de verdad
  // Si no hay conflicto, usamos isGroup
  const isGroup = isPrivateById ? false : (isGroupById ? true : isGroupByField);
  
  console.log('Tipo de conversación detectado:', {
    id: conversationData.id,
    isGroupField: conversationData.isGroup,
    isGroupByField,
    isGroupById,
    isPrivateById,
    decisiónFinal: isGroup ? 'GRUPO' : 'PRIVADO'
  });

  return (
    <div className="flex-1 flex flex-col">
      {/* Conversación - Usar el componente adecuado según el tipo de conversación */}
      {isGroup ? (
        <OptimizedChatWindow 
          conversationId={_selectedConversation} 
          conversation={conversationData}
          currentUserId={_currentUserId || _session?.user?.id || ""}
          _onUserProfileClick={_onUserProfileClick}
          className="h-full"
        />
      ) : (
        <PrivateChatWindow 
          conversationId={_selectedConversation} 
          conversation={conversationData}
          currentUserId={_currentUserId || _session?.user?.id || ""}
          _onUserProfileClick={_onUserProfileClick}
          className="h-full"
        />
      )}
    </div>
  );
});

MessageContainer.displayName = 'MessageContainer';

export default MessageContainer;
