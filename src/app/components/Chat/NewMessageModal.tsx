"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/src/app/components/ui/dialog";
import { Input } from "@/src/app/components/ui/input";
import { Button } from "@/src/app/components/ui/button";
import { Avatar } from "@/src/app/components/ui/avatar";
import { X } from "lucide-react";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";

import { User } from '@/src/app/messages/types';
import { Conversation } from '@/src/app/messages/types';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserSelect: (user: User) => void;
  _currentUserId: string;
  isCreatingConversation: boolean;
  conversations?: Conversation[];
  selectConversation: (conversationId: string) => void;
}

const NewMessageModal = React.memo(({
  isOpen,
  onClose,
  onUserSelect,
  _currentUserId,
  isCreatingConversation,
  conversations = [],
  selectConversation
}: NewMessageModalProps) => {
  // Estado local para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado local para los usuarios disponibles
  const [localUsers, setLocalUsers] = useState<User[]>([]);
  
  // Estado de carga
  const [isLoading, setIsLoading] = useState(false);
  
  // Cargar usuarios cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      // Resetear estado
      setSearchTerm('');
      setIsLoading(true);
      
      // Primero intentar obtener los seguidores mutuos sin conversación
      fetch('/api/relationships/mutual-without-conversation')
        .then(response => response.json())
        .then(data => {
          console.log("Modal: Seguidores mutuos cargados directamente:", data);
          
          if (Array.isArray(data) && data.length > 0) {
            setLocalUsers(data);
            console.log(`Modal: ${data.length} usuarios disponibles`);
          } else {
            console.log("No se encontraron seguidores mutuos sin conversación, cargando todos los usuarios");
            
          
          }
        })
        .catch(error => {
          console.error("Error cargando seguidores mutuos:", error);
          setLocalUsers([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      // Limpiar usuarios al cerrar para evitar datos obsoletos
      setLocalUsers([]);
    }
  }, [isOpen]);
  
  // Para depuración - seguimiento de cambios en searchTerm
  useEffect(() => {
    console.log("Término de búsqueda actualizado:", searchTerm);
  }, [searchTerm]);
  
  // Búsqueda memoizada de usuarios
  const filteredUsers = React.useMemo(() => {
    // Para depuración
    console.log("Calculando filteredUsers - búsqueda:", searchTerm);
    console.log("Calculando filteredUsers - disponibles:", localUsers);
    
    // Verificar primero que estemos trabajando con datos válidos
    if (!Array.isArray(localUsers) || localUsers.length === 0) {
      console.log("No hay seguidores mutuos disponibles o el formato es incorrecto");
      return [];
    }
    
    // Log detallado para depuración
    console.log("IDs de seguidores mutuos disponibles:", 
      localUsers.map(user => `${user.username || user.name} (${user.id})`));
    
    // Si no hay término de búsqueda, mostrar todos los seguidores mutuos
    if (!searchTerm.trim()) {
      console.log("Sin filtro de búsqueda, mostrando todos:", localUsers.length);
      return localUsers;
    }
    
    const term = searchTerm.toLowerCase().trim();
    
    // Filtrar solo entre seguidores mutuos con criterios más rigurosos
    const filtered = localUsers.filter(user => {
      // Validar que el usuario tenga datos
      if (!user || typeof user !== 'object') {
        console.log("Usuario con formato incorrecto:", user);
        return false;
      }
      
      // Obtener datos normalizados y verificar que existan
      const username = (user.username || '').toLowerCase();
      const name = (user.name || '').toLowerCase();
      
      // Comprobar si el término aparece en alguno de los campos
      const matchesUsername = username.includes(term);
      const matchesName = name.includes(term);
      const matchesCombined1 = `${name} ${username}`.includes(term);
      const matchesCombined2 = `${username} ${name}`.includes(term);
      
      // Para depuración
      if (matchesUsername || matchesName || matchesCombined1 || matchesCombined2) {
        console.log("Usuario coincide:", user.username, "- Razón:", 
          matchesUsername ? "username" : 
          matchesName ? "name" : 
          "combinado");
      }
      
      return matchesUsername || matchesName || matchesCombined1 || matchesCombined2;
    });
    
    console.log("Usuarios filtrados:", filtered.length);
    return filtered;
  }, [localUsers, searchTerm]);

  // Manejar la selección de un usuario
  const handleUserSelect = useCallback((user: User) => {
    // Verificar si ya existe una conversación 1:1 con este usuario
    const existingConversation = conversations.find(conv => 
      // Verificar si es una conversación 1:1 (solo 2 participantes Y NO es un grupo)
      !conv.isGroup && 
      conv.participants?.length === 2 && 
      // Verificar si el usuario seleccionado es uno de los participantes
      conv.participants?.some((p: {userId: string}) => p.userId === user.id)
    );
    
    if (existingConversation) {
      // Si la conversación ya existe, simplemente seleccionarla
      console.log("Conversación existente encontrada:", existingConversation.id);
      selectConversation(existingConversation.id);
      onClose();
    } else {
      // Si no existe, crear una nueva conversación
      console.log("Creando nueva conversación con:", user.username || user.name);
      onUserSelect(user);
    }
  }, [onUserSelect, onClose, conversations, selectConversation]);

  return (
    <Dialog open={isOpen} onOpenChange={() => !isCreatingConversation && onClose()}>
      <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-0 shadow-lg rounded-lg">
        <DialogHeader className="pb-4 border-b border-gray-100 dark:border-gray-800">
          <DialogTitle className="text-xl font-bold text-gray-900 dark:text-white">Nuevo mensaje</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 dark:text-gray-400">
            Selecciona un usuario para iniciar una conversación.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-5 pt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <Input
              placeholder="Buscar usuario..."
              value={searchTerm}
              onChange={(e) => {
                console.log("Evento onChange - valor:", e.target.value);
                setSearchTerm(e.target.value);
              }}
              disabled={isCreatingConversation}
              className="pl-10 w-full bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
            />
          </div>
          
          <div className="max-h-[400px] overflow-y-auto rounded-lg">
            {isCreatingConversation ? (
              <div className="py-10 flex justify-center items-center">
                <LoadingSpinner className="w-8 h-8 mr-2 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Creando conversación...</span>
              </div>
            ) : isLoading ? (
              <div className="py-10 flex justify-center items-center">
                <LoadingSpinner className="w-8 h-8 mr-2 text-blue-500" />
                <span className="text-gray-700 dark:text-gray-300 font-medium">Cargando usuarios...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {filteredUsers.map(user => (
                  <div
                    key={user.id}
                    className="p-3 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer rounded-md transition-colors duration-150"
                    onClick={() => handleUserSelect(user)}
                  >
                    <Avatar className="h-12 w-12 ring-2 ring-gray-100 dark:ring-gray-700">
                      {user.image ? (
                        user.image.includes('cloudinary') ? (
                          <CldImage
                            src={user.image}
                            alt={user.username || "Usuario"}
                            width={48}
                            height={48}
                            crop="fill"
                            gravity="face"
                            className="h-full w-full object-cover"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/AvatarPredeterminado.webp";
                            }}
                          />
                        ) : (
                          <Image
                            src={user.image}
                            alt={user.username || "Usuario"}
                            width={48}
                            height={48}
                            className="h-full w-full object-cover"
                            onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/images/AvatarPredeterminado.webp";
                            }}
                          />
                        )
                      ) : (
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center w-full h-full">
                          {user.username?.charAt(0).toUpperCase() || 'U'}
                        </div>
                      )}
                    </Avatar>
                    
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{user.name || user.username || 'Usuario'}</p>
                      {user.username && user.name && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</p>
                      )}
                    </div>
                    
                    <div className="text-blue-500 dark:text-blue-400">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
                      </svg>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-gray-50 dark:bg-gray-800 rounded-lg">
                {searchTerm ? (
                  <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">No se encontraron usuarios con <span className="font-medium">&quot;{searchTerm}&quot;</span></p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400">No tienes seguidores mutuos disponibles. Se muestran todos los usuarios.</p>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {!isCreatingConversation && (
            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <Button variant="outline" onClick={onClose} className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <X size={16} className="mr-2" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

NewMessageModal.displayName = 'NewMessageModal';

export default NewMessageModal;
