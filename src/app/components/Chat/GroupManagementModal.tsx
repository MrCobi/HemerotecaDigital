"use client";

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/src/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/src/app/components/ui/dialog';
import { Input } from '@/src/app/components/ui/input';
import { Textarea } from '@/src/app/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/src/app/components/ui/avatar';
import { X, Users, Pencil, UploadCloud, Trash2, LogOut } from 'lucide-react';
import { CldImage } from 'next-cloudinary';
import Image from 'next/image';
import { API_ROUTES } from '@/src/config/api-routes';
import { useToast } from '@/src/app/hooks/use-toast';

export type User = {
  id: string;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

export type Participant = {
  id: string;
  userId: string;
  role: 'admin' | 'member' | 'moderator' | 'owner';
  user: User;
};

export type ConversationData = {
  id: string;
  name?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  isGroup: boolean;
  participants: Participant[];
  // Usando Record con union types para propiedades adicionales
  [key: string]: string | null | boolean | Participant[] | undefined;
};

interface GroupManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationData: ConversationData | null;
  currentUserId: string;
  onConversationUpdate: (updatedData: Partial<ConversationData>) => void;
  onDeleteGroup?: () => void;
  onLeaveGroup?: () => void;
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
  isOpen,
  onClose,
  conversationData,
  currentUserId,
  onConversationUpdate,
  onDeleteGroup,
  onLeaveGroup
}) => {
  const { data: _session } = useSession();
  const { toast } = useToast();
  
  // Estados locales
  const [groupNameEdit, setGroupNameEdit] = useState("");
  const [groupDescriptionEdit, setGroupDescriptionEdit] = useState("");
  const [isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
  const [possibleParticipants, setPossibleParticipants] = useState<User[]>([]);
  const [selectedNewParticipants, setSelectedNewParticipants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Actualizar estados cuando cambia la conversación seleccionada
  useEffect(() => {
    if (conversationData) {
      setGroupNameEdit(conversationData.name || "");
      setGroupDescriptionEdit(conversationData.description || "");
      
      // Verificar si el usuario actual es administrador
      const currentUserParticipant = conversationData.participants.find(
        p => p.userId === currentUserId
      );
      setIsGroupAdmin(currentUserParticipant?.role === 'admin');
    }
  }, [conversationData, currentUserId]);
  
  // Función para actualizar la información del grupo
  const updateGroupInfo = async (data: { name?: string, description?: string, imageUrl?: string }) => {
    if (!conversationData) return false;
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${conversationData.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el grupo');
      }
      
      // Notificar al componente padre sobre la actualización
      onConversationUpdate(data);
      
      return true;
    } catch (error) {
      console.error('Error al actualizar el grupo:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del grupo",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsUpdatingGroup(false);
    }
  };
  
  // Función para cambiar la imagen del grupo
  const handleChangeGroupImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files[0]) {
        const file = target.files[0];
        
        // Crear URL para previsualización
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            // Preview en este caso no es necesario ya que no mostramos una previsualización
          }
        };
        reader.readAsDataURL(file);
        
        // Subir la imagen a Cloudinary
        try {
          // Iniciar carga
          setIsUpdatingGroup(true);
          
          // Usar el endpoint de carga de imágenes para grupos
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(API_ROUTES.messages.uploadGroupImage, {
            method: 'POST',
            body: formData
          });
          
          if (!response.ok) {
            throw new Error('Error al subir la imagen');
          }
          
          const data = await response.json();
          
          // Actualizar el grupo con la nueva imagen
          await updateGroupInfo({
            imageUrl: data.url
          });
          
          toast({
            title: "Imagen actualizada",
            description: "La imagen del grupo ha sido actualizada correctamente",
          });
        } catch (error) {
          console.error('Error al cambiar la imagen:', error);
          toast({
            title: "Error",
            description: "No se pudo cambiar la imagen del grupo",
            variant: "destructive",
          });
        } finally {
          setIsUpdatingGroup(false);
        }
      }
    };
    input.click();
  };
  
  // Función para actualizar el nombre del grupo
  const handleUpdateGroupName = async () => {
    if (groupNameEdit.trim() === "") {
      toast({
        title: "Error",
        description: "El nombre del grupo no puede estar vacío",
        variant: "destructive",
      });
      return;
    }
    
    const success = await updateGroupInfo({ name: groupNameEdit });
    if (success) {
      toast({
        title: "Nombre actualizado",
        description: "El nombre del grupo ha sido actualizado correctamente",
      });
    }
  };

  // Función para actualizar la descripción del grupo
  const handleUpdateGroupDescription = async () => {
    const success = await updateGroupInfo({ description: groupDescriptionEdit });
    if (success) {
      toast({
        title: "Descripción actualizada",
        description: "La descripción del grupo ha sido actualizada correctamente",
      });
    }
  };
  
  // Función para cargar los posibles participantes (seguidores mutuos)
  const loadPossibleParticipants = async () => {
    if (!conversationData) return;
    
    try {
      const response = await fetch(`${API_ROUTES.relationships.mutual}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Error al cargar seguidores mutuos');
      }
      
      const mutualFollowers = await response.json();
      
      // Filtrar usuarios que ya son participantes
      const participantIds = conversationData.participants.map(p => p.userId);
      const filtered = mutualFollowers.filter((user: User) => !participantIds.includes(user.id));
      
      setPossibleParticipants(filtered);
    } catch (error) {
      console.error('Error al cargar posibles participantes:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los posibles participantes",
        variant: "destructive",
      });
    }
  };
  
  // Cargar posibles participantes cuando se abre el modal
  useEffect(() => {
    if (showAddParticipantsModal) {
      loadPossibleParticipants();
    }
  }, [showAddParticipantsModal, loadPossibleParticipants]);
  
  // Función para manejar la selección de nuevos participantes
  const handleToggleParticipant = (userId: string) => {
    setSelectedNewParticipants(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      } else {
        return [...prev, userId];
      }
    });
  };
  
  // Función para añadir participantes al grupo
  const handleAddParticipants = async () => {
    if (!conversationData || selectedNewParticipants.length === 0) return;
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${conversationData.id}/participants`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ participants: selectedNewParticipants })
      });
      
      if (!response.ok) {
        throw new Error('Error al añadir participantes');
      }
      
      // Actualizar localmente
      const updatedParticipants = [
        ...conversationData.participants,
        ...possibleParticipants
          .filter(user => selectedNewParticipants.includes(user.id))
          .map(user => ({
            id: user.id,
            userId: user.id,
            role: 'member' as 'admin' | 'member' | 'moderator' | 'owner',
            user
          }))
      ];
      
      onConversationUpdate({ participants: updatedParticipants });
      
      toast({
        title: "Participantes añadidos",
        description: "Los participantes han sido añadidos correctamente",
      });
      
      // Cerrar modal y resetear estado
      setShowAddParticipantsModal(false);
      setSelectedNewParticipants([]);
      
    } catch (error) {
      console.error('Error al añadir participantes:', error);
      toast({
        title: "Error",
        description: "No se pudieron añadir los participantes",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };
  
  // Función para eliminar un participante
  const handleRemoveParticipant = async (userId: string) => {
    if (!conversationData || !isGroupAdmin || userId === currentUserId) return;
    
    try {
      setIsUpdatingGroup(true);
      
      const response = await fetch(`${API_ROUTES.messages.createGroup}/${conversationData.id}/participants/${userId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error('Error al eliminar participante');
      }
      
      // Actualizar localmente
      const updatedParticipants = conversationData.participants.filter(p => p.userId !== userId);
      onConversationUpdate({ participants: updatedParticipants });
      
      toast({
        title: "Participante eliminado",
        description: "El participante ha sido eliminado correctamente",
      });
      
    } catch (error) {
      console.error('Error al eliminar participante:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar al participante",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };
  
  // Función para eliminar el grupo
  const handleDeleteGroup = async () => {
    if (!conversationData || !isGroupAdmin) return;
    
    if (window.confirm('¿Estás seguro de que quieres eliminar este grupo? Esta acción no se puede deshacer.')) {
      try {
        setIsUpdatingGroup(true);
        
        const response = await fetch(`${API_ROUTES.messages.createGroup}/${conversationData.id}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          throw new Error('Error al eliminar el grupo');
        }
        
        toast({
          title: "Grupo eliminado",
          description: "El grupo ha sido eliminado correctamente",
        });
        
        // Cerrar modal y notificar al componente padre
        onClose();
        
        if (onDeleteGroup) {
          onDeleteGroup();
        }
        
      } catch (error) {
        console.error('Error al eliminar el grupo:', error);
        toast({
          title: "Error",
          description: "No se pudo eliminar el grupo",
          variant: "destructive",
        });
      } finally {
        setIsUpdatingGroup(false);
      }
    }
  };
  
  // Función para abandonar el grupo
  const handleLeaveGroup = async () => {
    if (!conversationData) return;
    
    if (window.confirm('¿Estás seguro de que quieres abandonar este grupo?')) {
      try {
        setIsUpdatingGroup(true);
        
        const response = await fetch(`${API_ROUTES.messages.createGroup}/${conversationData.id}/leave`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error('Error al abandonar el grupo');
        }
        
        toast({
          title: "Grupo abandonado",
          description: "Has abandonado el grupo correctamente",
        });
        
        // Cerrar modal y notificar al componente padre
        onClose();
        
        if (onLeaveGroup) {
          onLeaveGroup();
        }
        
      } catch (error) {
        console.error('Error al abandonar el grupo:', error);
        toast({
          title: "Error",
          description: "No se pudo abandonar el grupo",
          variant: "destructive",
        });
      } finally {
        setIsUpdatingGroup(false);
      }
    }
  };
  
  // Filtrar participantes por término de búsqueda
  const filteredParticipants = possibleParticipants.filter(user => 
    (user.username?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (user.name?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );
  
  return (
    <>
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md overflow-hidden">
        <DialogHeader>
          <DialogTitle>Gestionar grupo</DialogTitle>
          <DialogDescription>
            Edita la información del grupo y gestiona los participantes
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 max-h-[70vh] overflow-y-auto py-2">
          {/* Imagen del grupo */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24 mx-auto">
                {conversationData?.imageUrl ? (
                  <CldImage
                    src={conversationData.imageUrl}
                    alt={conversationData.name || "Grupo"}
                    width={96}
                    height={96}
                    crop="fill"
                    gravity="face"
                    className="object-cover"
                  />
                ) : (
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-teal-400 to-blue-500">
                    <Users className="h-12 w-12 text-white" />
                  </AvatarFallback>
                )}
              </Avatar>
              {isGroupAdmin && (
                <Button 
                  variant="secondary" 
                  size="icon" 
                  className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
                  onClick={handleChangeGroupImage}
                >
                  <UploadCloud className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          {/* Nombre del grupo */}
          <div>
            <h3 className="text-sm font-medium mb-2">Nombre del grupo</h3>
            <div className="flex space-x-2">
              <Input 
                value={groupNameEdit}
                onChange={(e) => setGroupNameEdit(e.target.value)}
                placeholder="Nombre del grupo"
                disabled={!isGroupAdmin || isUpdatingGroup}
                className="flex-1"
              />
              {isGroupAdmin && (
                <Button 
                  size="sm" 
                  onClick={handleUpdateGroupName}
                  disabled={isUpdatingGroup}
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
              )}
            </div>
          </div>
          
          {/* Descripción del grupo */}
          <div>
            <h3 className="text-sm font-medium mb-2">Descripción</h3>
            <div className="flex flex-col space-y-2">
              <Textarea 
                value={groupDescriptionEdit}
                onChange={(e) => setGroupDescriptionEdit(e.target.value)}
                placeholder="Descripción del grupo"
                disabled={!isGroupAdmin || isUpdatingGroup}
                className="min-h-[80px]"
              />
              {isGroupAdmin && (
                <Button 
                  size="sm" 
                  onClick={handleUpdateGroupDescription}
                  disabled={isUpdatingGroup}
                  className="self-end"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Guardar
                </Button>
              )}
            </div>
          </div>
          
          {/* Participantes */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Participantes ({conversationData?.participants.length || 0})</h3>
              {isGroupAdmin && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowAddParticipantsModal(true)}
                  disabled={isUpdatingGroup}
                >
                  <Users className="h-4 w-4 mr-1" />
                  Añadir
                </Button>
              )}
            </div>
            <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
              {conversationData?.participants?.map((participant) => (
                <div key={participant.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-800 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-8 w-8">
                      {participant.user?.image && participant.user.image.includes('cloudinary') ? (
                        <CldImage 
                          src={participant.user.image}
                          alt={participant.user.username || participant.user.name || "Usuario"}
                          width={32}
                          height={32}
                          crop="fill"
                          gravity="face"
                          className="object-cover"
                        />
                      ) : participant.user?.image ? (
                        <Image
                          src={participant.user.image}
                          alt={participant.user.username || participant.user.name || "Usuario"}
                          width={32}
                          height={32}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback>{(participant.user.username || participant.user.name || "?")[0]}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{participant.user.username || participant.user.name || "Usuario"}</p>
                      {participant.role === 'admin' && (
                        <p className="text-xs text-blue-500">Admin</p>
                      )}
                    </div>
                  </div>
                  {isGroupAdmin && participant.userId !== currentUserId && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleRemoveParticipant(participant.userId)}
                      disabled={isUpdatingGroup}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 h-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          {/* Acciones del grupo */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col space-y-2">
              {isGroupAdmin ? (
                <Button 
                  variant="destructive" 
                  onClick={handleDeleteGroup}
                  disabled={isUpdatingGroup}
                  className="w-full"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar grupo
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={handleLeaveGroup}
                  disabled={isUpdatingGroup}
                  className="w-full"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Abandonar grupo
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    
    {/* Modal para añadir participantes */}
    <Dialog open={showAddParticipantsModal} onOpenChange={setShowAddParticipantsModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir participantes</DialogTitle>
          <DialogDescription>
            Selecciona los usuarios que quieras añadir al grupo
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <Input 
            type="text" 
            placeholder="Buscar usuarios..." 
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
            {filteredParticipants.length > 0 ? (
              filteredParticipants.map((user) => (
                <div 
                  key={user.id} 
                  className={`flex items-center justify-between p-3 rounded-md ${
                    selectedNewParticipants.includes(user.id) 
                      ? 'bg-blue-50 dark:bg-blue-900/30' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
                  }`}
                  onClick={() => handleToggleParticipant(user.id)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      {user.image && user.image.includes('cloudinary') ? (
                        <CldImage
                          src={user.image}
                          alt={user.username || "Usuario"}
                          width={40}
                          height={40}
                          crop="fill"
                          gravity="face"
                          className="object-cover"
                        />
                      ) : user.image ? (
                        <Image
                          src={user.image}
                          alt={user.username || "Usuario"}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <AvatarFallback>
                          {user.username?.[0] || user.name?.[0] || "U"}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.username || user.name || "Usuario sin nombre"}</p>
                    </div>
                  </div>
                  {selectedNewParticipants.includes(user.id) && (
                    <div className="h-6 w-6 rounded-full bg-blue-500 flex items-center justify-center text-white">
                      <X className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                No se encontraron usuarios
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowAddParticipantsModal(false)}
            >
              Cancelar
            </Button>
            <Button 
              disabled={selectedNewParticipants.length === 0}
              onClick={handleAddParticipants}
            >
              Añadir participantes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default GroupManagementModal;
