"use client";

import React, { useState, useCallback } from 'react';
import { Button } from '@/src/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/src/app/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/src/app/components/ui/avatar';
import { Trash2, Info } from 'lucide-react';
import { useToast } from '@/src/app/components/ui/use-toast';
import { format } from 'date-fns';
import { FilterType } from '@/src/app/messages/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/app/components/ui/alert-dialog";

export type User = {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

export type Participant = {
  id: string;
  userId: string;
  role?: 'admin' | 'member' | 'moderator' | 'owner';
  user: User;
};

export type ConversationData = {
  id: string;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isGroup: boolean;
  participants: Participant[];
  otherUser?: {
    id: string;
    username?: string | null;
    name?: string | null;
    image?: string | null;
  };
  createdAt?: string | Date;
  // Usando Record con union types para propiedades adicionales
  [key: string]: string | null | boolean | Participant[] | undefined | Date | Record<string, unknown>;
};

interface PrivateChatManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationData: ConversationData | null;
  currentUserId: string;
  onConversationDeleted?: (conversationId: string) => void;
  fetchConversations?: (forceRefresh?: boolean, resetToPage1?: boolean, explicitFilter?: FilterType) => Promise<void>;
}

const PrivateChatManagementModal = ({
  isOpen,
  onClose,
  conversationData,
  currentUserId,
  onConversationDeleted,
  fetchConversations,
}: PrivateChatManagementModalProps) => {
  const { toast } = useToast();
  
  // Estados para manejar las acciones
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Obtener el otro participante de la conversación - usando otherUser directamente
  const otherParticipant = React.useMemo(() => {
    // Para conversaciones privadas, usamos el campo otherUser que ya viene en los datos
    if (conversationData?.otherUser) {
      console.log("[PrivateChatManagementModal] Usando otherUser:", conversationData.otherUser);
      return conversationData.otherUser;
    }
    
    // Fallback al método anterior por si acaso
    if (conversationData && conversationData.participants && conversationData.participants.length >= 2) {
      console.log("[PrivateChatManagementModal] Participantes:", JSON.stringify(conversationData.participants, null, 2));
      const participant = conversationData.participants.find(p => p.userId !== currentUserId);
      if (participant?.user) return participant.user;
    }
    
    console.log("[PrivateChatManagementModal] No se pudo obtener información del otro usuario");
    return null;
  }, [conversationData, currentUserId]);

  // Función para borrar la conversación
  const handleDeleteConversation = useCallback(async () => {
    if (!conversationData?.id) return;
    
    setIsLoading(true);
    try {
      // Usar el ID completo con prefijo, ya que así está en la base de datos
      const conversationId = conversationData.id;

      console.log(`Intentando eliminar conversación: ${conversationId}`);
      console.log(`Tipo de conversación: ${conversationData.isGroup ? 'Grupo' : 'Privada'}`);
      
      const response = await fetch(`/api/messages/conversations/${conversationId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error respuesta:', errorData);
        throw new Error(errorData.error || 'Error al eliminar la conversación');
      }

      toast({
        title: 'Conversación eliminada',
        description: 'La conversación ha sido eliminada exitosamente.',
        variant: 'default',
      });

      // Actualizar la lista de conversaciones usando la función proporcionada
      if (fetchConversations) {
        await fetchConversations(true, true);
        console.log(`Lista de conversaciones actualizada tras eliminar: ${conversationData.id}`);
      }

      // Notificar que la conversación ha sido eliminada
      if (onConversationDeleted) {
        onConversationDeleted(conversationData.id);
      }
      
      onClose();
    } catch (error) {
      console.error('Error al eliminar la conversación:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Ocurrió un error al eliminar la conversación',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirmation(false);
    }
  }, [conversationData, toast, onConversationDeleted, fetchConversations, onClose]);

  // Si no hay datos de conversación, no renderizar
  if (!conversationData) {
    return null;
  }

  // Formatear fecha de creación
  const formattedDate = conversationData.createdAt 
    ? format(new Date(conversationData.createdAt), 'dd/MM/yyyy HH:mm')
    : 'Fecha desconocida';
    
  // Depurar la información que tenemos
  console.log("[PrivateChatManagementModal] Datos completos de conversación:", JSON.stringify(conversationData, null, 2));
  console.log("[PrivateChatManagementModal] Otro participante:", otherParticipant);

  // Renderizar componente
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Información de conversación</DialogTitle>
            <DialogDescription>
              Conversación con {otherParticipant?.username || otherParticipant?.name || 'el usuario'}
            </DialogDescription>
          </DialogHeader>

          {/* Información del otro usuario */}
          {otherParticipant && (
            <div className="flex flex-col space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-md mb-4">
              <div className="flex items-center space-x-4">
                <Avatar className="h-16 w-16">
                  {otherParticipant.image ? (
                    <AvatarImage src={otherParticipant.image} alt={otherParticipant.username || otherParticipant.name || 'Usuario'} />
                  ) : (
                    <AvatarFallback>
                      {(otherParticipant.username || otherParticipant.name)?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-medium text-lg">{otherParticipant.username || 'Usuario'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {otherParticipant.name || ''}
                  </p>
                </div>
              </div>
              
              <div className="text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500 dark:text-gray-400">ID de usuario:</div>
                  <div className="text-gray-700 dark:text-gray-300 font-mono text-xs truncate">{otherParticipant.id}</div>
                  
                  <div className="text-gray-500 dark:text-gray-400">Estado:</div>
                  <div className="text-green-500">
                    <span className="inline-flex items-center">
                      <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                      Activo
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-center mt-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/users/${otherParticipant.username || otherParticipant.id}`, '_blank')}
                >
                  Ver perfil completo
                </Button>
              </div>
            </div>
          )}

          {/* Información adicional de la conversación */}
          <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-md">
            <div className="flex items-center">
              <Info className="mr-2 h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">ID: </span>
              <span className="text-sm ml-2 text-gray-600 dark:text-gray-300 font-mono">
                {conversationData.id}
              </span>
            </div>
            <div className="flex items-center">
              <Info className="mr-2 h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Creada: </span>
              <span className="text-sm ml-2 text-gray-600 dark:text-gray-300">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Opciones de la conversación - Solo eliminar */}
          <div className="space-y-3 mt-4">
            {/* Eliminar conversación */}
            <Button
              variant="destructive"
              size="sm"
              className="w-full justify-start"
              onClick={() => setShowDeleteConfirmation(true)}
              disabled={isLoading}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Eliminar conversación</span>
            </Button>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="secondary" onClick={onClose} disabled={isLoading}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmación para eliminar */}
      <AlertDialog open={showDeleteConfirmation} onOpenChange={setShowDeleteConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente la conversación y todos sus mensajes.
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={isLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {isLoading ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default PrivateChatManagementModal;
