"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/app/components/ui/dialog";
import { Input } from "@/src/app/components/ui/input";
import { Button } from "@/src/app/components/ui/button";
import { Avatar } from "@/src/app/components/ui/avatar";
import { X } from "lucide-react";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";

import { User } from '@/src/app/messages/types';

interface NewMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  mutualFollowers: User[];
  onUserSelect: (user: User) => void;
  _currentUserId: string;
  isCreatingConversation: boolean;
}

const NewMessageModal = React.memo(({
  isOpen,
  onClose,
  mutualFollowers,
  onUserSelect,
  _currentUserId,
  isCreatingConversation
}: NewMessageModalProps) => {
  // Estado local para la búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  
  // Para depuración - mostrar los usuarios disponibles
  useEffect(() => {
    console.log("NewMessageModal - Seguidores mutuos recibidos:", mutualFollowers);
  }, [mutualFollowers]);
  
  // Para depuración - seguimiento de cambios en searchTerm
  useEffect(() => {
    console.log("Término de búsqueda actualizado:", searchTerm);
  }, [searchTerm]);
  
  // Búsqueda memoizada de usuarios
  const filteredUsers = React.useMemo(() => {
    // Para depuración
    console.log("Término de búsqueda:", searchTerm);
    console.log("Usuarios disponibles:", mutualFollowers);
    
    // Verificar primero que estemos trabajando con datos válidos
    if (!Array.isArray(mutualFollowers) || mutualFollowers.length === 0) {
      console.log("No hay seguidores mutuos disponibles o el formato es incorrecto");
      return [];
    }
    
    // Si no hay término de búsqueda, mostrar todos los seguidores mutuos
    if (!searchTerm.trim()) return mutualFollowers;
    
    const term = searchTerm.toLowerCase().trim();
    
    // Filtrar solo entre seguidores mutuos con criterios más rigurosos
    const filtered = mutualFollowers.filter(user => {
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
  }, [mutualFollowers, searchTerm]);

  // Resetear la búsqueda cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      console.log("Modal abierto - Reseteando búsqueda");
      setSearchTerm('');
    }
  }, [isOpen]);

  // Manejar la selección de un usuario
  const handleUserSelect = useCallback((user: User) => {
    onUserSelect(user);
    onClose();
  }, [onUserSelect, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={() => !isCreatingConversation && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo mensaje</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Input
            placeholder="Buscar usuario..."
            value={searchTerm}
            onChange={(e) => {
              console.log("Evento onChange - valor:", e.target.value);
              setSearchTerm(e.target.value);
            }}
            disabled={isCreatingConversation}
            className="w-full"
          />
          
          <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
            {isCreatingConversation ? (
              <div className="py-10 flex justify-center items-center">
                <LoadingSpinner className="w-8 h-8 mr-2" />
                <span>Creando conversación...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  className="p-2 flex items-center space-x-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  onClick={() => handleUserSelect(user)}
                >
                  <Avatar className="h-10 w-10">
                    {user.image ? (
                      user.image.includes('cloudinary') ? (
                        <CldImage
                          src={user.image}
                          alt={user.username || "Usuario"}
                          width={40}
                          height={40}
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
                          width={40}
                          height={40}
                          className="h-full w-full object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      )
                    ) : (
                      <div className="bg-blue-500 text-white flex items-center justify-center w-full h-full">
                        {user.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </Avatar>
                  
                  <div>
                    <p className="font-medium">{user.username || user.name || 'Usuario'}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                {searchTerm ? (
                  <p>No se encontraron usuarios con &quot;{searchTerm}&quot;</p>
                ) : (
                  <p>No tienes seguidores mutuos</p>
                )}
              </div>
            )}
          </div>
          
          {!isCreatingConversation && (
            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
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
