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
import { useRef } from 'react';

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
  onConversationUpdate: (data: Partial<ConversationData>) => void;
  _onDeleteGroup?: (conversationId: string) => void;
  _onLeaveGroup?: (conversationId: string) => void;
}

export const GroupManagementModal = ({
  isOpen,
  onClose,
  conversationData,
  currentUserId,
  isAdmin: initialIsAdmin,
  onConversationUpdate,
}: GroupManagementModalProps) => {
  const { data: _session } = useSession();
  const { toast } = useToast();
  
  // Estados locales simplificados - USANDO REFS para preservar los valores entre renderizados
  const [groupName, setGroupName] = useState("");
  const [groupDescription, setGroupDescription] = useState("");
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false);
  const [showAddParticipantsModal, setShowAddParticipantsModal] = useState(false);
  const [possibleParticipants, setPossibleParticipants] = useState<User[]>([]);
  const [selectedNewParticipants, setSelectedNewParticipants] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [_groupImageFile, setGroupImageFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  
  // IMPORTANTE: Guardar los valores actuales para que no se pierdan en renderizados
  const savedNameRef = useRef(groupName);
  const savedDescriptionRef = useRef(groupDescription);
  
  // Función para obtener el ID sin prefijo
  const getIdForApi = useCallback((id: string): string => {
    if (!id) return '';
    return id.replace(/^(group_|conv_)/, '');
  }, []);
  
  // Actualizar referencias cuando el usuario modifica los campos
  useEffect(() => {
    savedNameRef.current = groupName;
  }, [groupName]);
  
  useEffect(() => {
    savedDescriptionRef.current = groupDescription;
  }, [groupDescription]);
  
  // Inicializar los datos del formulario cuando se abre el modal
  useEffect(() => {
    if (isOpen && conversationData) {
      // SOLUCIÓN: Si ya tenemos valores anteriores, los mantenemos
      if (savedNameRef.current) {
        setGroupName(savedNameRef.current);
      } else {
        setGroupName(conversationData.name || "");
      }
      
      if (savedDescriptionRef.current) {
        setGroupDescription(savedDescriptionRef.current);
      } else {
        setGroupDescription(conversationData.description || "");
      }
      
      console.log("[DEBUG] Modal abierto: usando valores guardados:", 
        { savedName: savedNameRef.current || conversationData.name, 
          savedDescription: savedDescriptionRef.current || conversationData.description });
    }
  }, [isOpen, conversationData]);
  
  // Limpiar estado al cerrar
  useEffect(() => {
    if (!isOpen) {
      setShowAddParticipantsModal(false);
      setIsUpdatingGroup(false);
      setPreviewImage(null);
      setGroupImageFile(null);
      setUploadProgress(0);
      
      // NO RESETEAMOS los valores guardados para preservarlos
    }
  }, [isOpen]);

  // Función para actualizar la información del grupo
  const handleSaveChanges = async () => {
    if (!conversationData || !initialIsAdmin) return false;
    
    // Validar que el nombre no esté vacío
    if (groupName.trim() === "") {
      toast({
        title: "Error",
        description: "El nombre del grupo no puede estar vacío",
        variant: "destructive"
      });
      return false;
    }
    
    setIsUpdatingGroup(true);
    
    try {
      // Preparar datos para actualización
      const updateData = {
        name: groupName,
        description: groupDescription
      };
      
      // Actualizar en el servidor
      const groupId = getIdForApi(conversationData.id);
      const response = await fetch(`${API_ROUTES.messages.group.update(groupId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar el grupo');
      }
      
      // IMPORTANTE: Guardar los valores actuales en las referencias
      savedNameRef.current = groupName;
      savedDescriptionRef.current = groupDescription;
      
      // SOLUCIÓN CLAVE: Crear un objeto completo con TODOS los datos de la conversación
      // pero sustituyendo name y description con los nuevos valores
      const updatedConversationData = {
        ...conversationData,
        name: groupName,
        description: groupDescription,
        // Aseguramos que todas las propiedades importantes estén presentes
        id: conversationData.id,
        isGroup: true,
        participants: conversationData.participants,
        imageUrl: conversationData.imageUrl
      };
      
      console.log("[DEBUG] Enviando datos actualizados al OptimizedChatWindow:", updatedConversationData);
      
      // Notificar al padre (page.tsx) sobre la actualización para que actualice
      // todos los componentes que usan estos datos (incluyendo OptimizedChatWindow)
      onConversationUpdate(updatedConversationData);
      
      toast({
        title: "Grupo actualizado",
        description: "La información del grupo ha sido actualizada correctamente"
      });
      
      setIsUpdatingGroup(false);
      return true;
    } catch (error) {
      console.error('Error al actualizar grupo:', error);
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del grupo",
        variant: "destructive"
      });
      setIsUpdatingGroup(false);
      return false;
    }
  };

  // Función para notificar a los demás participantes de los cambios
  const notifyGroupUpdated = useCallback(async (updateType: string, updatedData: unknown) => {
    if (!conversationData) return;
    
    try {
      // SOLUCIÓN: Ahora usamos el nuevo endpoint SSE para notificar actualizaciones de grupo
      await fetch('/api/messages/group/updates/sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          groupId: conversationData.id,
          updateType,
          data: updatedData
        })
      });
      
      console.log(`[DEBUG] Notificación SSE enviada para actualización de grupo: ${updateType}`, updatedData);
      
      // También despachamos un evento local para actualizaciones inmediatas
      if (typeof window !== 'undefined') {
        // Disparar un evento personalizado para notificar a los componentes locales
        window.dispatchEvent(new CustomEvent('group-data-updated', { 
          detail: { 
            conversationId: conversationData.id,
            updateType,
            data: updatedData
          }
        }));
      }
    } catch (err) {
      console.error('Error al notificar actualización:', err);
      
      // Si falla la notificación por SSE, al menos actualizamos localmente
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('group-data-updated', { 
          detail: { 
            conversationId: conversationData.id,
            updateType,
            data: updatedData
          }
        }));
      }
    }
  }, [conversationData]);
  
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
                try {
                  if (!conversationData) return;
                  
                  const groupId = getIdForApi(conversationData.id);
                  const updateResponse = await fetch(`${API_ROUTES.messages.group.update(groupId)}`, {
                    method: 'PATCH',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ imageUrl: response.url })
                  });
                  
                  if (updateResponse.ok) {
                    // Crear una copia actualizada de los datos de conversación
                    const updatedConversationData = {
                      ...conversationData,
                      imageUrl: response.url
                    };
                    
                    // Notificar al padre sobre la actualización
                    onConversationUpdate(updatedConversationData);
                    
                    toast({
                      title: "Imagen actualizada",
                      description: "La imagen del grupo ha sido actualizada correctamente"
                    });
                  } else {
                    throw new Error('Error al actualizar la imagen');
                  }
                } catch (error) {
                  console.error('Error al actualizar imagen:', error);
                  toast({
                    title: "Error",
                    description: "No se pudo actualizar la imagen del grupo",
                    variant: "destructive"
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
  }, [toast, conversationData, getIdForApi, onConversationUpdate]);
  
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
    if (!conversationData || !initialIsAdmin || selectedNewParticipants.length === 0) return;
    
    try {
      setIsUpdatingGroup(true);
      
      // Obtenemos solo el ID sin prefijo para enviarlo a la API
      const groupId = getIdForApi(conversationData.id);
      console.log(`[Cliente] Añadiendo participantes al grupo: ${groupId} (original: ${conversationData.id})`);
      console.log(`[Cliente] Participantes seleccionados:`, selectedNewParticipants);
      
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
      
      // Obtener los datos de error o respuesta
      const responseText = await response.text();
      let responseData = {};
      
      try {
        // Intentar parsear como JSON solo si hay contenido
        if (responseText) {
          responseData = JSON.parse(responseText);
        }
      } catch (parseError) {
        console.error('Error al parsear respuesta JSON:', parseError);
      }
      
      if (!response.ok) {
        console.error('Error al añadir participantes:', responseData);
        throw new Error('Error al añadir participantes');
      }
      
      console.log('[DEBUG] Respuesta de añadir participantes:', responseData);
      
      // Cerrar modal y limpiar selección
      setShowAddParticipantsModal(false);
      setSelectedNewParticipants([]);
      
      // Usar los datos completos de la conversación que devuelve el servidor
      if (responseData && 'conversation' in responseData) {
        // Llamar a la función de actualización del componente padre con los datos completos
        onConversationUpdate(responseData.conversation as ConversationData);
      }
      
      // Notificar a los demás participantes
      notifyGroupUpdated('participants_added', selectedNewParticipants);
      
      toast({
        title: "Participantes añadidos",
        description: "Los participantes han sido añadidos correctamente"
      });
      
    } catch (err) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al añadir participantes",
        variant: "destructive"
      });
      console.error("Error al añadir participantes:", err);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Función para eliminar un participante
  const handleRemoveParticipant = async (userId: string) => {
    if (!conversationData || !initialIsAdmin) return;
    
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
      
      // SOLUCIÓN MEJORADA: Actualización optimista y consistente
      // Crear una versión actualizada de los participantes eliminando el usuario
      const updatedParticipants = conversationData.participants.filter(p => p.userId !== userId);
      
      // Crear un objeto completo de conversación para asegurar que la UI se actualice correctamente
      const updatedConversationData = {
        ...conversationData,
        participants: updatedParticipants,
        // Asegurar que mantenemos todas las propiedades importantes
        id: conversationData.id,
        name: conversationData.name,
        description: conversationData.description,
        imageUrl: conversationData.imageUrl,
        isGroup: true
      };
      
      // Si tenemos datos completos en la respuesta, usar esos para mayor precisión
      if (responseData && responseData.conversation && responseData.conversation.participants) {
        // Crear un nuevo objeto combinando los datos locales con la respuesta del servidor
        const serverData = responseData.conversation;
        const fullUpdatedData = {
          ...updatedConversationData,
          participants: serverData.participants,
          name: serverData.name || updatedConversationData.name,
          description: serverData.description || updatedConversationData.description,
          imageUrl: serverData.imageUrl || updatedConversationData.imageUrl
        };
        
        // Enviar la actualización completa al componente padre
        onConversationUpdate(fullUpdatedData);
      } else {
        // Si no hay datos completos, usar nuestra versión actualizada localmente
        onConversationUpdate(updatedConversationData);
      }
      
      // Notificar a todos los componentes a través del evento personalizado
      notifyGroupUpdated('participant_removed', {
        userId,
        updatedConversation: updatedConversationData
      });
      
      toast({
        title: "Participante eliminado",
        description: "El participante ha sido eliminado correctamente"
      });
      
    } catch (err) {
      toast({
        title: "Error",
        description: "Ha ocurrido un error al eliminar el participante",
        variant: "destructive"
      });
      console.error("Error al eliminar participante:", err);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Función para eliminar el grupo
  const handleDeleteGroup = async () => {
    if (!conversationData || !initialIsAdmin) return;
    
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
        
      } catch (err) {
        toast({
          title: "Error",
          description: "Ha ocurrido un error al eliminar el grupo",
          variant: "destructive"
        });
        console.error("Error al eliminar grupo:", err);
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
        
      } catch (err) {
        toast({
          title: "Error",
          description: "Ha ocurrido un error al abandonar el grupo",
          variant: "destructive"
        });
        console.error("Error al abandonar grupo:", err);
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
              disabled={isUploadingImage || !initialIsAdmin}
            >
              <UploadCloud className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Sección de Información del Grupo con un solo botón para guardar */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-medium mb-2 text-center">Información del Grupo</h3>
            
            {/* Nombre del grupo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Nombre del grupo</label>
              <Input 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nombre del grupo"
                disabled={!initialIsAdmin || isUpdatingGroup}
                className="w-full"
              />
            </div>
            
            {/* Descripción del grupo */}
            <div>
              <label className="text-sm font-medium mb-2 block">Descripción</label>
              <Textarea 
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                placeholder="Descripción del grupo"
                disabled={!initialIsAdmin || isUpdatingGroup}
                className="min-h-[80px] w-full"
              />
            </div>
            
            {/* Botón unificado para guardar cambios */}
            {initialIsAdmin && (
              <Button 
                className="w-full"
                onClick={handleSaveChanges}
                disabled={isUpdatingGroup}
                variant="default"
              >
                {isUpdatingGroup ? (
                  <>
                    <span className="mr-2">Guardando...</span>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  </>
                ) : (
                  <>
                    <Pencil className="h-4 w-4 mr-2" />
                    Guardar Cambios
                  </>
                )}
              </Button>
            )}
          </div>
          
          {/* Participantes */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium">Participantes ({conversationData?.participants.length || 0})</h3>
              {initialIsAdmin && (
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
                  {initialIsAdmin && participant.userId !== currentUserId && (
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
              {initialIsAdmin ? (
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
