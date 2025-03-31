"use client";

import { useState, useEffect, useCallback } from 'react';
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
import io from 'socket.io-client';

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
  isAdmin: boolean;
  onConversationUpdate: (updatedData: Partial<ConversationData>) => void;
  onDeleteGroup?: () => void;
  onLeaveGroup?: () => void;
  onGroupDeleted?: (groupId: string) => void;
}

const GroupManagementModal: React.FC<GroupManagementModalProps> = ({
  isOpen,
  onClose,
  conversationData,
  currentUserId,
  isAdmin,
  onConversationUpdate,
  onDeleteGroup,
  onLeaveGroup,
  onGroupDeleted
}) => {
  const { data: _session } = useSession();
  const { toast } = useToast();
  
  // Estados locales
  const [groupNameEdit, setGroupNameEdit] = useState("");
  const [groupDescriptionEdit, setGroupDescriptionEdit] = useState("");
  const [_isGroupAdmin, setIsGroupAdmin] = useState(false);
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
  const [possibleParticipants, setPossibleParticipants] = useState<User[]>([]);
  const [selectedNewParticipants, setSelectedNewParticipants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [localConversationData, setLocalConversationData] = useState<ConversationData | null>(null);
  
  // Actualizar nuestro estado local cuando los datos de la conversación cambian desde el exterior
  useEffect(() => {
    if (conversationData) {
      setLocalConversationData(conversationData);
      // También actualizar otros estados importantes
      setGroupNameEdit(conversationData.name || "");
      setGroupDescriptionEdit(conversationData.description || "");
      setPreviewImage(null);
      setGroupImageFile(null);
      setUploadProgress(0);
      
      // Verificar si el usuario actual es administrador
      const currentUserParticipant = conversationData.participants.find(
        p => p.userId === currentUserId
      );
      const userIsAdmin = !!currentUserParticipant && ['admin', 'owner'].includes(currentUserParticipant.role);
      setIsGroupAdmin(userIsAdmin);
      
      console.log("[DEBUG] Datos de conversación actualizados:", conversationData, "Usuario es admin:", userIsAdmin);
    }
  }, [conversationData, currentUserId]);

  // Limpiar estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setShowAddParticipantsModal(false);
      setIsUpdatingGroup(false);
      setPreviewImage(null);
      setGroupImageFile(null);
      setUploadProgress(0);
    }
  }, [isOpen]);

  // Crear una función para notificar a los demás participantes de los cambios
  const notifyGroupUpdated = useCallback(async (updateType: string, updatedData: any) => {
    if (!conversationData) return;
    
    try {
      // Enviar notificación a través de socket.io
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001');
      
      // Usamos el ID con prefijo para mantener la consistencia con la lógica de socket
      socket.emit('group_updated', {
        groupId: conversationData.id.startsWith('group_') ? conversationData.id : `group_${conversationData.id}`,
        updateType,
        updatedData,
        updatedBy: {
          id: currentUserId,
          name: _session?.user?.name,
          image: _session?.user?.image
        }
      });
    } catch (error) {
      console.error('Error al notificar actualización del grupo:', error);
    }
  }, [conversationData, currentUserId, _session?.user]);
  
  // Función para asegurar que el ID de conversación tiene el formato correcto
  const ensureIdFormat = useCallback((id: string | null | undefined) => {
    if (!id) return '';
    // Si ya tiene el prefijo, devolverlo tal cual
    if (id.startsWith('group_') || id.startsWith('conv_')) {
      return id;
    }
    // Si no tiene prefijo, añadir 'group_' para grupos
    return `group_${id}`;
  }, []);
  
  // Función para eliminar el prefijo del ID para la API
  const getIdForApi = useCallback((id: string) => {
    return id.replace(/^(conv_|group_)/, '');
  }, []);
  
  // Función para actualizar la información del grupo
  const updateGroupInfo = async (data: { name?: string, description?: string, imageUrl?: string }) => {
    if (!conversationData) return false;
    
    try {
      setIsUpdatingGroup(true);
      
      // Obtenemos solo el ID sin prefijo para enviarlo a la API
      const groupId = getIdForApi(conversationData.id);
      console.log(`[Cliente] Actualizando grupo con ID: ${groupId} (original: ${conversationData.id})`);
      console.log(`[Cliente] Datos a enviar:`, data);
      
      // Asegurarnos de que estamos usando ensureIdFormat consistentemente en el cliente y servidor
      const response = await fetch(`${API_ROUTES.messages.group.update(groupId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      console.log(`[Cliente] Respuesta del servidor - Status: ${response.status}`);
      
      // Intentamos capturar y mostrar la respuesta completa para depuración
      let responseText = "";
      try {
        responseText = await response.text();
        console.log(`[Cliente] Respuesta texto completo:`, responseText);
        
        let responseData: {
          success?: boolean;
          error?: string;
          conversation?: any;
        } = {};
        
        try {
          // Solo intentar parsear si hay contenido
          if (responseText.trim().length > 0) {
            responseData = JSON.parse(responseText);
            console.log(`[Cliente] Respuesta JSON parseada:`, responseData);
          } else {
            console.log(`[Cliente] Respuesta vacía del servidor`);
            responseData = { error: "Respuesta vacía del servidor" };
          }
        } catch (e) {
          console.error('[Cliente] Error al parsear la respuesta JSON:', e);
          throw new Error('Error al parsear la respuesta del servidor');
        }
        
        if (!response.ok) {
          console.error('[Cliente] Error al actualizar grupo:', responseData);
          throw new Error(responseData.error || 'Error actualizando grupo');
        }
        
        if (responseData && (responseData.success || responseData.conversation)) {
          toast({
            title: "Grupo actualizado",
            description: "La información del grupo ha sido actualizada correctamente"
          });
          
          // Notificar a los demás participantes usando notifyGroupUpdated
          try {
            notifyGroupUpdated('info_updated', data);
            console.log(`[Cliente] Notificación enviada para el grupo: ${conversationData.id}`);
          } catch (notifyError) {
            console.error('[Cliente] Error al notificar actualización:', notifyError);
          }
          
          // Actualizar la conversación en el contexto
          if (responseData.conversation) {
            onConversationUpdate(responseData.conversation);
          } else {
            onConversationUpdate(data);
          }
          
          setIsUpdatingGroup(false);
          return true;
        } else {
          throw new Error('La respuesta no indicó éxito');
        }
      } catch (parseError) {
        console.error('[Cliente] Error al procesar la respuesta:', parseError);
        throw new Error('Error al procesar la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo actualizar la información del grupo",
        variant: "destructive"
      });
      setIsUpdatingGroup(false);
      return false;
    }
  };
  
  // Función para manejar la subida de imágenes
  const handleImageUpload = useCallback(async (e: Event) => {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      // Verificar que es una imagen
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Solo se permiten archivos de imagen",
          variant: "destructive"
        });
        return;
      }

      // Mostrar previsualización
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setPreviewImage(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
      setGroupImageFile(file);

      // Subir la imagen a Cloudinary
      try {
        setIsUploadingImage(true);
        setUploadProgress(0);
        
        // Crear FormData para la carga
        const formData = new FormData();
        formData.append('file', file);
        
        // Crear XHR para poder monitorear el progreso
        const xhr = new XMLHttpRequest();
        
        // Configurar el evento de progreso
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        });
        
        // Configurar evento cuando la carga termina
        xhr.onreadystatechange = async () => {
          if (xhr.readyState === 4) {
            if (xhr.status === 200) {
              // Carga exitosa
              const response = JSON.parse(xhr.responseText);
              
              // Actualizar la información del grupo con la nueva URL de imagen
              if (response.url) {
                const success = await updateGroupInfo({ imageUrl: response.url });
                if (success) {
                  toast({
                    title: "Imagen actualizada",
                    description: "La imagen del grupo ha sido actualizada correctamente"
                  });
                }
              }
            } else {
              // Error
              toast({
                title: "Error",
                description: "No se pudo subir la imagen",
                variant: "destructive"
              });
            }
            setIsUploadingImage(false);
          }
        };
        
        // Abrir y enviar la solicitud
        xhr.open("POST", API_ROUTES.messages.uploadGroupImage);
        xhr.send(formData);
        
      } catch (error) {
        console.error('Error al subir imagen:', error);
        toast({
          title: "Error",
          description: "No se pudo subir la imagen",
          variant: "destructive"
        });
        setIsUploadingImage(false);
      }
    }
  }, [toast, updateGroupInfo]);
  
  // Función para actualizar el nombre del grupo
  const handleUpdateGroupName = async () => {
    if (groupNameEdit.trim() === "") {
      toast({
        title: "Error",
        description: "El nombre del grupo no puede estar vacío",
        variant: "destructive"
      });
      return;
    }
    
    const success = await updateGroupInfo({ name: groupNameEdit });
    if (success) {
      toast({
        title: "Nombre actualizado",
        description: "El nombre del grupo ha sido actualizado correctamente"
      });
    }
  };

  // Función para actualizar la descripción del grupo
  const handleUpdateGroupDescription = async () => {
    const success = await updateGroupInfo({ description: groupDescriptionEdit });
    if (success) {
      toast({
        title: "Descripción actualizada",
        description: "La descripción del grupo ha sido actualizada correctamente"
      });
    }
  };
  
  // Función para cargar los posibles participantes (seguidores mutuos)
  const loadPossibleParticipants = useCallback(async () => {
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
        variant: "destructive"
      });
    }
  }, [conversationData, toast]);
  
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
    if (!conversationData || !isAdmin || selectedNewParticipants.length === 0) return;
    
    try {
      setIsUpdatingGroup(true);
      
      // Obtenemos solo el ID sin prefijo para enviarlo a la API
      const groupId = getIdForApi(conversationData.id);
      console.log(`[Cliente] Añadiendo participantes al grupo: ${groupId} (original: ${conversationData.id})`);
      
      const response = await fetch(
        API_ROUTES.messages.group.addParticipants(groupId),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ participants: selectedNewParticipants })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error al añadir participantes:', errorData);
        throw new Error('Error al añadir participantes');
      }
      
      // Obtener los datos actualizados de la respuesta
      const responseData = await response.json();
      console.log('[DEBUG] Respuesta de añadir participantes:', responseData);
      
      // Cerrar modal y limpiar selección
      setShowAddParticipantsModal(false);
      setSelectedNewParticipants([]);
      
      // Usar los datos completos de la conversación que devuelve el servidor
      if (responseData && responseData.conversation) {
        // Llamar a la función de actualización del componente padre con los datos completos
        onConversationUpdate(responseData.conversation);
      }
      
      // Notificar a los demás participantes
      notifyGroupUpdated('participants_added', selectedNewParticipants);
      
      toast({
        title: "Participantes añadidos",
        description: "Los participantes han sido añadidos correctamente"
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al añadir los participantes",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Función para eliminar un participante
  const handleRemoveParticipant = async (userId: string) => {
    if (!conversationData || !isAdmin) return;
    
    try {
      setIsUpdatingGroup(true);
      
      // Obtenemos solo el ID sin prefijo para enviarlo a la API
      const groupId = getIdForApi(conversationData.id);
      console.log(`[Cliente] Eliminando participante ${userId} del grupo: ${groupId} (original: ${conversationData.id})`);
      
      const response = await fetch(
        API_ROUTES.messages.group.removeParticipant(groupId, userId),
        {
          method: 'DELETE'
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error al eliminar participante:', errorData);
        throw new Error('Error al eliminar participante');
      }
      
      // Obtener los datos actualizados de la respuesta
      const responseData = await response.json();
      console.log('[DEBUG] Respuesta de eliminar participante:', responseData);
      
      // Usar los datos completos de la conversación que devuelve el servidor
      if (responseData && responseData.conversation) {
        // Llamar a la función de actualización del componente padre con los datos completos
        onConversationUpdate(responseData.conversation);
      } else {
        // Si no hay datos completos en la respuesta, actualizar localmente
        const updatedParticipants = conversationData.participants.filter(p => p.userId !== userId);
        onConversationUpdate({ participants: updatedParticipants });
      }
      
      // Notificar a los demás participantes
      notifyGroupUpdated('participant_removed', userId);
      
      toast({
        title: "Participante eliminado",
        description: "El participante ha sido eliminado correctamente"
      });
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al eliminar el participante",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingGroup(false);
    }
  };
  
  // Función para eliminar el grupo
  const handleDeleteGroup = async () => {
    if (!conversationData || !isAdmin) return;
    
    const confirmDelete = window.confirm('¿Estás seguro de eliminar este grupo? Esta acción no se puede deshacer.');
    
    if (confirmDelete) {
      try {
        setIsUpdatingGroup(true);
        
        // Obtenemos solo el ID sin prefijo para enviarlo a la API
        const groupId = getIdForApi(conversationData.id);
        console.log(`[Cliente] Eliminando grupo: ${groupId} (original: ${conversationData.id})`);
        
        const response = await fetch(
          API_ROUTES.messages.group.delete(groupId),
          {
            method: 'DELETE'
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error al eliminar grupo:', errorData);
          throw new Error('Error al eliminar el grupo');
        }
        
        // Notificar a los demás participantes
        notifyGroupUpdated('group_deleted', conversationData.id);
        
        toast({
          title: "Grupo eliminado",
          description: "El grupo ha sido eliminado correctamente"
        });
        
        // Cerrar modal y notificar para refrescar la lista de conversaciones
        onClose();
        if (onGroupDeleted) {
          onGroupDeleted(conversationData.id);
        }
        
      } catch (error) {
        toast({
          title: "Error",
          description: "Ha ocurrido un error al eliminar el grupo",
          variant: "destructive"
        });
      } finally {
        setIsUpdatingGroup(false);
      }
    }
  };

  // Función para abandonar el grupo
  const handleLeaveGroup = async () => {
    if (!conversationData) return;
    
    const confirmLeave = window.confirm('¿Estás seguro de abandonar este grupo?');
    
    if (confirmLeave) {
      try {
        setIsUpdatingGroup(true);
        
        // Obtenemos solo el ID sin prefijo para enviarlo a la API
        const groupId = getIdForApi(conversationData.id);
        console.log(`[Cliente] Abandonando grupo: ${groupId} (original: ${conversationData.id})`);
        
        const response = await fetch(
          API_ROUTES.messages.group.leaveGroup(groupId),
          {
            method: 'POST'
          }
        );
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Error al abandonar grupo:', errorData);
          throw new Error('Error al abandonar el grupo');
        }
        
        // Notificar a los demás participantes
        notifyGroupUpdated('participant_left', currentUserId);
        
        toast({
          title: "Grupo abandonado",
          description: "Has abandonado el grupo correctamente"
        });
        
        // Cerrar modal y actualizar lista de conversaciones
        onClose();
        if (onGroupDeleted) {
          onGroupDeleted(conversationData.id);
        }
        
      } catch (error) {
        toast({
          title: "Error",
          description: "Ha ocurrido un error al abandonar el grupo",
          variant: "destructive"
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
          <div className="relative flex justify-center mb-6">
            {previewImage ? (
              <div className="relative h-24 w-24 rounded-full overflow-hidden">
                <Image
                  src={previewImage}
                  alt="Preview"
                  width={96}
                  height={96}
                  className="object-cover"
                />
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                    <div className="w-16 h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : conversationData?.imageUrl ? (
              <div className="h-24 w-24 rounded-full overflow-hidden">
                <Image
                  src={conversationData.imageUrl}
                  alt={conversationData.name || "Grupo"}
                  width={96}
                  height={96}
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Users className="h-12 w-12 text-gray-500 dark:text-gray-400" />
              </div>
            )}
            <Button 
              variant="secondary" 
              size="icon" 
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full shadow-md"
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*';
                input.onchange = handleImageUpload;
                input.click();
              }}
              disabled={isUploadingImage || !isAdmin}
            >
              <UploadCloud className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Nombre del grupo */}
          <div>
            <h3 className="text-sm font-medium mb-2">Nombre del grupo</h3>
            <div className="flex space-x-2">
              <Input 
                value={groupNameEdit}
                onChange={(e) => setGroupNameEdit(e.target.value)}
                placeholder="Nombre del grupo"
                disabled={!isAdmin || isUpdatingGroup}
                className="flex-1"
              />
              {isAdmin && (
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
                disabled={!isAdmin || isUpdatingGroup}
                className="min-h-[80px]"
              />
              {isAdmin && (
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
              <h3 className="text-sm font-medium">Participantes ({localConversationData?.participants.length || 0})</h3>
              {isAdmin && (
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
              {localConversationData?.participants?.map((participant) => (
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
                  {isAdmin && participant.userId !== currentUserId && (
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
              {isAdmin ? (
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
