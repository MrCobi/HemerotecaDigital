"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/src/app/components/ui/dialog";
import { Input } from "@/src/app/components/ui/input";
import { Button } from "@/src/app/components/ui/button";
import { Avatar } from "@/src/app/components/ui/avatar";
import { Check, X, ImagePlus } from "lucide-react";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";
import { Textarea } from "@/src/app/components/ui/textarea";

import { User, GroupCreationState } from '@/src/app/messages/types';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  mutualFollowers: User[];
  groupState: GroupCreationState;
  onGroupNameChange: (name: string) => void;
  onGroupDescriptionChange: (desc: string) => void;
  onParticipantToggle: (user: User) => void;
  onGroupImageChange: (file: File | null) => void;
  onCreateGroup: () => void;
  _currentUserId: string;
}

const CreateGroupModal = React.memo(({
  isOpen,
  onClose,
  mutualFollowers,
  groupState,
  onGroupNameChange,
  onGroupDescriptionChange,
  onParticipantToggle,
  onGroupImageChange,
  onCreateGroup,
  _currentUserId
}: CreateGroupModalProps) => {
  // Estados locales
  const [searchTerm, setSearchTerm] = useState('');
  
  // Búsqueda memoizada de usuarios
  const filteredUsers = React.useMemo(() => {
    // Verificar que tenemos datos válidos
    if (!Array.isArray(mutualFollowers) || mutualFollowers.length === 0) {
      return [];
    }
    
    // Si no hay término de búsqueda, mostrar todos los usuarios disponibles para grupos
    if (!searchTerm.trim()) return mutualFollowers;
    
    const term = searchTerm.toLowerCase().trim();
    
    // Filtrado específico para grupos - puede incluir tanto seguidores mutuos como otros contactos
    return mutualFollowers.filter(user => {
      // Validar que el usuario tenga datos
      if (!user || typeof user !== 'object') {
        return false;
      }
      
      // Para grupos, podemos considerar más campos o criterios diferentes
      const username = (user.username || '').toLowerCase();
      const name = (user.name || '').toLowerCase();
      
      // Criterios de búsqueda para grupos que pueden ser diferentes a mensajes directos
      const matchesUsername = username.includes(term);
      const matchesName = name.includes(term);
      const matchesCombined = `${name} ${username}`.includes(term) || `${username} ${name}`.includes(term);
      
      return matchesUsername || matchesName || matchesCombined;
    });
  }, [mutualFollowers, searchTerm]);

  // Resetear la búsqueda cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  // Comprobar si un usuario está seleccionado
  const isUserSelected = useCallback((userId: string) => {
    return groupState.participants.some(p => p.userId === userId);
  }, [groupState.participants]);

  // Manejar subida de imagen
  const handleImageUpload = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        
        // Crear URL para previsualización
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const _previewUrl = e.target.result as string;
            // Actualizar imagen y previsualización
            onGroupImageChange(file);
          }
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  }, [onGroupImageChange]);

  return (
    <Dialog open={isOpen} onOpenChange={() => !groupState.isCreating && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Crear grupo</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Imagen del grupo */}
          <div className="flex justify-center">
            <div className="relative h-24 w-24 cursor-pointer" onClick={handleImageUpload}>
              {groupState.imagePreview ? (
                <CldImage 
                  src={groupState.imagePreview} 
                  alt="Previsualización"
                  width={96}
                  height={96}
                  className="h-full w-full object-cover rounded-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : (
                <div className="h-full w-full rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <ImagePlus className="h-8 w-8 text-gray-500" />
                </div>
              )}
              <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-1">
                <ImagePlus size={16} className="text-white" />
              </div>
            </div>
          </div>
          
          {/* Nombre del grupo */}
          <div>
            <label htmlFor="group-name" className="block text-sm font-medium mb-1">
              Nombre del grupo
            </label>
            <Input
              id="group-name"
              placeholder="Nombre del grupo"
              value={groupState.name}
              onChange={(e) => onGroupNameChange(e.target.value)}
              disabled={groupState.isCreating}
              className="w-full"
            />
          </div>
          
          {/* Descripción del grupo */}
          <div>
            <label htmlFor="group-description" className="block text-sm font-medium mb-1">
              Descripción (opcional)
            </label>
            <Textarea
              id="group-description"
              placeholder="Describe el propósito del grupo"
              value={groupState.description}
              onChange={(e) => onGroupDescriptionChange(e.target.value)}
              disabled={groupState.isCreating}
              className="w-full resize-none"
              rows={3}
            />
          </div>
          
          {/* Buscar participantes */}
          <div>
            <label htmlFor="search-participants" className="block text-sm font-medium mb-1">
              Añadir participantes
            </label>
            <Input
              id="search-participants"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={groupState.isCreating}
              className="w-full"
            />
          </div>
          
          {/* Lista de participantes */}
          <div className="max-h-64 overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700 border rounded-md">
            {groupState.isCreating ? (
              <div className="py-10 flex justify-center items-center">
                <LoadingSpinner className="w-8 h-8 mr-2" />
                <span>Creando grupo...</span>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <div
                  key={user.id}
                  className={`p-2 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer ${
                    isUserSelected(user.id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => onParticipantToggle(user)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      {user.image ? (
                        user.image.includes('cloudinary') ? (
                          <CldImage
                            src={user.image}
                            alt={user.username || "Usuario"}
                            width={32}
                            height={32}
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
                            width={32}
                            height={32}
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
                  
                  {isUserSelected(user.id) && (
                    <Check className="h-5 w-5 text-blue-500" />
                  )}
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-gray-500">
                {searchTerm ? (
                  <p>No se encontraron usuarios con &quot;{searchTerm}&quot;</p>
                ) : (
                  <p>No hay usuarios disponibles</p>
                )}
              </div>
            )}
          </div>
          
          {/* Participantes seleccionados */}
          {groupState.participants.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Participantes seleccionados ({groupState.participants.length})</p>
              <div className="flex flex-wrap gap-2">
                {groupState.participants.map(participant => (
                  <div 
                    key={participant.userId}
                    className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs rounded-full px-3 py-1 flex items-center"
                  >
                    <span>{participant.user.username || participant.user.name || 'Usuario'}</span>
                    <X 
                      size={14} 
                      className="ml-1 cursor-pointer" 
                      onClick={(e) => {
                        e.stopPropagation();
                        onParticipantToggle(participant.user);
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Acciones */}
          {!groupState.isCreating && (
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button 
                onClick={onCreateGroup}
                disabled={!groupState.name.trim() || groupState.participants.length === 0}
              >
                Crear grupo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

CreateGroupModal.displayName = 'CreateGroupModal';

export default CreateGroupModal;
