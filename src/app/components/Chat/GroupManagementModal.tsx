"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/src/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/src/app/components/ui/dialog';
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

interface ParticipantRemovalBlock {
  [userId: string]: {
    groupId: string;
    timestamp: number;
  }
}

declare global {
  interface Window {
    __lastParticipantRemoval?: ParticipantRemovalBlock;
  }
}

export const GroupManagementModal = ({
  isOpen,
  onClose,
  conversationData,
  currentUserId,
  isAdmin: initialIsAdmin,
  onConversationUpdate,
  _onDeleteGroup,
  _onLeaveGroup,
}: GroupManagementModalProps) => {
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
  
  // NUEVO: Estado local para participantes para actualización inmediata en la interfaz
  const [localParticipants, setLocalParticipants] = useState<Participant[]>([]);
  
  // NUEVO: Estados para manejar carga independiente de datos
  const [_isLoading, setIsLoading] = useState(false);
  const [serverGroupData, setServerGroupData] = useState<ConversationData | null>(null);
  
  // IMPORTANTE: Guardar los valores actuales para que no se pierdan en renderizados
  const savedNameRef = useRef(groupName);
  const savedDescriptionRef = useRef(groupDescription);
  
  // Función para obtener el ID sin prefijo
  const getIdForApi = useCallback((id: string): string => {
    if (!id) return '';
    return id.replace(/^(group_|conv_)/, '');
  }, []);
  
  // NUEVO: Función para cargar datos del grupo directamente desde la API
  const loadGroupDataFromServer = useCallback(async (groupId: string) => {
    if (!groupId) return;
    
    setIsLoading(true);
    try {
      console.log(`[GroupManagementModal] Cargando datos del grupo ${groupId} directamente de la API`);
      
      // Obtener datos frescos del servidor
      const apiId = getIdForApi(groupId);
      const response = await fetch(`/api/messages/group/${apiId}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos del grupo');
      }
      
      const data = await response.json();
      
      // Actualizar estado local con datos del servidor
      setServerGroupData(data);
      setLocalParticipants(data.participants || []);
      
      // Inicializar campos del formulario
      if (savedNameRef.current) {
        setGroupName(savedNameRef.current);
      } else {
        setGroupName(data.name || "");
      }
      
      if (savedDescriptionRef.current) {
        setGroupDescription(savedDescriptionRef.current);
      } else {
        setGroupDescription(data.description || "");
      }
      
      console.log(`[GroupManagementModal] Datos cargados del servidor:`, {
        name: data.name,
        participantes: data.participants?.length || 0
      });
      
    } catch (error) {
      console.error('[GroupManagementModal] Error al cargar datos del grupo:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del grupo",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [getIdForApi, toast]);
  
  // Actualizar referencias cuando el usuario modifica los campos
  useEffect(() => {
    savedNameRef.current = groupName;
  }, [groupName]);
  
  useEffect(() => {
    savedDescriptionRef.current = groupDescription;
  }, [groupDescription]);
  
  // MODIFICADO: Inicializar los datos del formulario cuando se abre el modal
  // Ahora cargando datos directamente del servidor
  useEffect(() => {
    if (isOpen && conversationData) {
      // Cargar datos frescos del servidor cada vez que se abre el modal
      loadGroupDataFromServer(conversationData.id);
    }
  }, [isOpen, conversationData, loadGroupDataFromServer]);
  
  // Escuchar eventos de actualización de grupo para actualizar la interfaz inmediatamente
  useEffect(() => {
    // Solo activar si el modal está abierto y tenemos datos de conversación
    if (!isOpen || !serverGroupData || !serverGroupData.id) return;
    
    const handleGroupDataUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { conversationId: updatedGroupId, updateType, data } = customEvent.detail;
      
      // Solo actualizar si es este grupo
      if (updatedGroupId !== serverGroupData.id) return;
      
      console.log(`[GroupManagementModal] Detectado evento ${updateType} para este grupo:`, data);
      
      // Actualizar según el tipo de evento
      if (updateType === 'participants_added') {
        // Verificar el formato de los datos recibidos para participantes añadidos
        if (Array.isArray(data)) {
          // Formato: array de IDs de usuario
          const existingParticipantIds = new Set(localParticipants.map(p => p.userId));
          
          // Convertir los IDs a objetos de participante completos
          const newParticipantsToAdd = data
            .filter(userId => !existingParticipantIds.has(userId))
            .map(userId => {
              // Buscar los datos completos del usuario en los posibles participantes
              const userData = possibleParticipants.find(p => p.id === userId);
              
              return {
                id: `temp_participant_${userId}`, // ID temporal
                userId: userId,
                role: 'member' as const,
                user: userData || { 
                  id: userId,
                  username: "Usuario", // Nombre genérico hasta recibir datos reales
                  name: null,
                  image: null
                }
              };
            });
          
          if (newParticipantsToAdd.length > 0) {
            // Actualizar el estado local de participantes
            setLocalParticipants(prev => [...prev, ...newParticipantsToAdd]);
            console.log(`[GroupManagementModal] Añadidos ${newParticipantsToAdd.length} participantes en la interfaz`);
          }
        }
      } 
      else if (updateType === 'participant_removed') {
        // Actualizar la interfaz al eliminar un participante
        const participantIdToRemove = data.userId;
        
        setLocalParticipants(prev => 
          prev.filter(p => p.userId !== participantIdToRemove)
        );
        
        console.log(`[GroupManagementModal] Eliminado participante ${participantIdToRemove} de la interfaz`);
      }
    };

    // Añadir event listener
    window.addEventListener('group-data-updated', handleGroupDataUpdate as EventListener);
    
    // Limpiar el event listener al desmontar
    return () => {
      window.removeEventListener('group-data-updated', handleGroupDataUpdate as EventListener);
    };
    
  // IMPORTANTE: Quitar localParticipants de las dependencias para evitar efectos circulares
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, serverGroupData, possibleParticipants]);
  
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

  // NUEVO: Función para emitir eventos de actualización de forma estandarizada
  const dispatchGroupUpdateEvent = useCallback((updateType: string, data: Record<string, unknown>) => {
    if (!serverGroupData?.id) return;
    
    console.log(`[GroupManagementModal] Emitiendo evento ${updateType}:`, data);
    
    // Disparar evento personalizado para que otros componentes puedan actualizarse
    const event = new CustomEvent('group-data-updated', {
      detail: {
        conversationId: serverGroupData.id,
        updateType,
        data
      }
    });
    
    window.dispatchEvent(event);
  }, [serverGroupData?.id]);

  // Función para guardar cambios generales del grupo
  const handleSaveChanges = async () => {
    if (!serverGroupData || !initialIsAdmin) return false;
    
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
      const groupId = getIdForApi(serverGroupData.id);
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
        ...serverGroupData,
        name: groupName,
        description: groupDescription,
        // Aseguramos que todas las propiedades importantes estén presentes
        id: serverGroupData.id,
        isGroup: true,
        participants: serverGroupData.participants,
        imageUrl: serverGroupData.imageUrl
      };
      
      console.log("[DEBUG] Enviando datos actualizados al OptimizedChatWindow:", updatedConversationData);
      
      // Notificar a través de evento para actualizar otros componentes
      dispatchGroupUpdateEvent('group_updated', {
        name: groupName,
        description: groupDescription,
        imageUrl: serverGroupData.imageUrl
      });
      
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
                  if (!serverGroupData) return;
                  
                  const groupId = getIdForApi(serverGroupData.id);
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
                      ...serverGroupData,
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
  }, [toast, serverGroupData, getIdForApi, onConversationUpdate]);
  
  // Función para cargar los posibles participantes (seguidores mutuos)
  const loadPossibleParticipants = useCallback(async () => {
    if (!serverGroupData) return;
    
    try {
      const response = await fetch(`${API_ROUTES.relationships.mutual}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Error al cargar seguidores mutuos');
      }
      
      const mutualFollowers = await response.json();
      
      // Filtrar usuarios que ya son participantes
      const participantIds = serverGroupData.participants.map(p => p.userId);
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
  }, [serverGroupData, toast]);
  
  // Cargar posibles participantes cuando se abre el modal
  useEffect(() => {
    if (showAddParticipantsModal) {
      loadPossibleParticipants();
    }
  }, [showAddParticipantsModal, loadPossibleParticipants]);
  
  // Filtramos los usuarios mutuos para mostrar solo los que NO están en el grupo
  const filteredMutualUsers = useMemo(() => {
    if (!possibleParticipants || !localParticipants) return [];
    
    // Obtener la lista de IDs de participantes actuales
    const currentParticipantIds = new Set(localParticipants.map(p => p.userId));
    
    // Verificar si hay un bloqueo activo por eliminación reciente
    const lastRemoval = window.__lastParticipantRemoval || {};
    const recentlyRemovedIds = new Set<string>();
    
    // Verificar todos los usuarios que tienen un bloqueo activo para este grupo
    if (lastRemoval && serverGroupData?.id) {
      const now = new Date().getTime();
      const groupId = serverGroupData.id;
      
      // Recorrer todas las entradas en el objeto lastRemoval
      Object.keys(lastRemoval).forEach(userId => {
        const removal = lastRemoval[userId];
        
        // Comprobar si este bloqueo es para este grupo y no ha expirado
        if (removal.groupId === groupId) {
          // Comprobar si el bloqueo ha expirado (24 horas)
          const blockHasExpired = (now - removal.timestamp > 24 * 60 * 60 * 1000);
          
          // Si el bloqueo no ha expirado y NO estamos en el modal de añadir participantes
          if (!blockHasExpired && !showAddParticipantsModal) {
            recentlyRemovedIds.add(userId);
            console.log(`[GroupManagementModal] Excluyendo usuario recientemente eliminado: ${userId}`);
          } else if (blockHasExpired) {
            console.log(`[GroupManagementModal] Bloqueo de usuario ${userId} ha expirado`);
          }
        }
      });
    }
    
    // Filtrar la lista de seguidores mutuos excluyendo a los participantes actuales
    // y también a los usuarios recientemente eliminados
    return possibleParticipants.filter(user => {
      const isCurrentParticipant = currentParticipantIds.has(user.id);
      const isRecentlyRemoved = recentlyRemovedIds.has(user.id);
      
      // Excluir si ya es participante o si fue eliminado recientemente
      return !isCurrentParticipant && !isRecentlyRemoved;
    });
  }, [possibleParticipants, localParticipants, serverGroupData?.id, showAddParticipantsModal]);
  
  // Función para manejar la selección de nuevos participantes
  const handleToggleParticipant = (userId: string) => {
    
    console.log("[DEBUG_TOGGLE] Toggling participante:", {
      userId,
      isCurrentlySelected: selectedNewParticipants.includes(userId)
    });
    
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
    
    console.log("[DEBUG_ADD] Iniciando adición de participantes:", {
      selectedCount: selectedNewParticipants.length,
      selectedIds: selectedNewParticipants,
      groupId: serverGroupData?.id || 'sin grupo'
    });
    
    if (!serverGroupData || selectedNewParticipants.length === 0) return;
    
    try {
      setIsUpdatingGroup(true);
      
      // Obtenemos solo el ID sin prefijo para enviarlo a la API
      const groupId = getIdForApi(serverGroupData.id);
      console.log(`[Cliente] Añadiendo participantes al grupo: ${groupId} (original: ${serverGroupData.id})`);
      console.log(`[Cliente] Participantes seleccionados:`, selectedNewParticipants);
      
      // Función auxiliar para generar UUIDs compatible con todos los navegadores
      const generateUUID = (): string => {
        // Implementación universalmente compatible para generar UUIDs
        let d = new Date().getTime();
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = (d + Math.random() * 16) % 16 | 0;
          d = Math.floor(d / 16);
          return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
      };

      // ACTUALIZACIÓN OPTIMISTA: Crear versiones temporales de los nuevos participantes
      const newParticipantsObjects = selectedNewParticipants.map(userId => {
        // Buscar los datos completos del usuario en los posibles participantes
        const userData = possibleParticipants.find(p => p.id === userId);
        
        // Crear un objeto participante con los datos disponibles
        return {
          id: generateUUID(), // ID temporal generado con función compatible
          userId: userId,
          role: 'member' as const,
          user: userData || { 
            id: userId,
            username: "Usuario", // Nombre genérico hasta recibir datos reales
            name: null,
            image: null
          }
        };
      });
      
      // 1. Actualizar UI local primero
      setLocalParticipants(prev => [...prev, ...newParticipantsObjects]);
      
      // 2. Crear versión optimista para otros componentes
      const optimisticConversationData = {
        ...serverGroupData,
        participants: [...serverGroupData.participants, ...newParticipantsObjects]
      };
      
      // 3. Actualizar UI con datos optimistas antes de API call
      onConversationUpdate(optimisticConversationData);
      
      // 4. Notificar a través de evento para actualizar otros componentes
      dispatchGroupUpdateEvent('participants_added', { participants: selectedNewParticipants });
      
      // 5. Cerrar modal y limpiar selección inmediatamente para mejor UX
      setShowAddParticipantsModal(false);
      setSelectedNewParticipants([]);
      
      // Realizar la llamada a la API en segundo plano
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
      
      // Si la respuesta no es exitosa, revertir la actualización optimista
      if (!response.ok) {
        console.error('Error al añadir participantes:', await response.text());
        
        // Revertir la actualización optimista en todos los componentes
        onConversationUpdate(serverGroupData);
        setLocalParticipants(serverGroupData.participants || []);
        
        throw new Error('Error al añadir participantes');
      }
      
      // Procesar respuesta exitosa
      const responseData = await response.json();
      console.log('[DEBUG] Respuesta de añadir participantes:', responseData);
      
      // 6. Notificar a los demás participantes incluso si hubo éxito
      // pero no intentar refrescar datos del servidor (confiamos en la actualización optimista)
      onConversationUpdate({
        ...serverGroupData,
        participants: [...serverGroupData.participants, ...newParticipantsObjects]
      });
      
      // Solo actualizar con datos del servidor si proporcionó información completa
      if (responseData && 
          responseData.conversation && 
          typeof responseData.conversation === 'object' && 
          Array.isArray(responseData.conversation.participants)) {
        
        // Verificar si hay diferencias sustanciales entre nuestra actualización optimista
        // y los datos del servidor que requieran actualización
        const serverParticipantIds = new Set(responseData.conversation.participants.map((p: {userId: string}) => p.userId));
        const localParticipantIds = new Set(localParticipants.map(p => p.userId));
        
        // Si hay discrepancias, actualizar con datos del servidor
        if (serverParticipantIds.size !== localParticipantIds.size) {
          console.log('[DEBUG] Actualizando con datos del servidor (diferencia en número de participantes)');
          
          const serverData = responseData.conversation;
          // Mapear los datos del servidor al formato que espera la UI
          const mappedParticipants = serverData.participants.map((p: {id: string; userId: string; isAdmin?: boolean; user: User}) => ({
            id: p.id,
            userId: p.userId,
            role: p.isAdmin ? 'admin' : 'member',
            user: p.user
          }));
          
          // Actualizar estado local y global
          setLocalParticipants(mappedParticipants);
          onConversationUpdate({
            ...optimisticConversationData,
            participants: mappedParticipants
          });
        }
      }
      
      toast({
        title: "Participantes añadidos",
        description: "Los participantes han sido añadidos correctamente"
      });
      
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Ha ocurrido un error al añadir participantes",
        variant: "destructive",
      });
      console.error("Error al añadir participantes:", err);
    } finally {
      setIsUpdatingGroup(false);
    }
  };

  // Función para eliminar un participante
  const handleRemoveParticipant = async (userId: string) => {
    
    console.log("[DEBUG_REMOVE] Iniciando eliminación de participante:", {
      userId,
      groupId: serverGroupData?.id || 'sin grupo',
      currentParticipants: localParticipants?.length || 0
    });
    
    if (!serverGroupData || !initialIsAdmin) return;
    
    try {
      setIsLoading(true);
      
      // Añadir función para crear el bloqueo de participante eliminado
      const createParticipantRemovalBlock = (userId: string, groupId: string) => {
        // Inicializar o obtener el objeto window.__lastParticipantRemoval
        const lastRemoval = window.__lastParticipantRemoval || (window.__lastParticipantRemoval = {});
        
        // Guardar el bloqueo para este usuario con timestamp actual
        lastRemoval[userId] = {
          groupId: groupId,
          timestamp: new Date().getTime()
        };
        
        console.log(`[GroupManagementModal] Bloqueado usuario ${userId} para grupo ${groupId} durante 24 horas`);
        return lastRemoval;
      };
      
      // Validación previa
      if (!conversationData?.id) {
        throw new Error('No se puede eliminar participante: Información de conversación faltante');
      }
      
      // MEJORADO: Optimistic update - actualizar la UI antes de la respuesta de la API
      const updatedParticipants = localParticipants.filter(p => p.userId !== userId);
      setLocalParticipants(updatedParticipants);
      
      // Notificar a través de evento para actualizar otros componentes
      dispatchGroupUpdateEvent('participant_removed', { userId });
      
      const response = await fetch(`/api/messages/group/${getIdForApi(serverGroupData.id)}/participants/${userId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar participante');
      }
      
      // IMPORTANTE: Actualizar también serverGroupData.participants para mantener sincronización
      if (serverGroupData.participants) {
        serverGroupData.participants = updatedParticipants;
      }
      
      // Crear bloqueo de participante eliminado
      createParticipantRemovalBlock(userId, serverGroupData.id);
      
      toast({
        title: "Participante eliminado",
        description: "El participante ha sido eliminado del grupo",
      });
      
      // Notificar al componente padre que se ha actualizado la conversación
      // Crear una versión para actualizar el componente padre
      const updatedConversation = {
        ...conversationData,
        participants: updatedParticipants
      };
      
      // Actualizar la interfaz del padre
      onConversationUpdate(updatedConversation);
      
    } catch (error: unknown) {
      console.error("Error al eliminar participante:", error);
      
      // MEJORADO: Si hay error, restauramos el estado original
      if (serverGroupData.participants) {
        setLocalParticipants([...serverGroupData.participants]);
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo eliminar al participante",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Función para eliminar el grupo
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);

  const handleDeleteGroupClick = () => {
    setIsDeleteGroupDialogOpen(true);
  };

  const handleDeleteGroup = async () => {
    if (!serverGroupData || !initialIsAdmin) return;
    
    try {
      setIsUpdatingGroup(true);
      
      // Obtenemos solo el ID sin prefijo para enviarlo a la API
      const groupId = getIdForApi(serverGroupData.id);
      console.log(`[Cliente] Eliminando grupo: ${groupId} (original: ${serverGroupData.id})`);
      
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
      
      // Notificar a través de evento para actualizar otros componentes
      dispatchGroupUpdateEvent('group_deleted', {});
      
      // Notificar a los demás participantes
      onConversationUpdate({
        ...serverGroupData,
        participants: []
      });
      
      toast({
        title: "Grupo eliminado",
        description: "El grupo ha sido eliminado correctamente"
      });
      
      // Cerrar modal y notificar para refrescar la lista de conversaciones
      onClose();
      
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Ha ocurrido un error al eliminar el grupo",
        variant: "destructive"
      });
      console.error("Error al eliminar grupo:", err);
    } finally {
      setIsUpdatingGroup(false);
      setIsDeleteGroupDialogOpen(false);
    }
  };

  // Función para abandonar el grupo
  const [isLeaveGroupDialogOpen, setIsLeaveGroupDialogOpen] = useState(false);

  const handleLeaveGroupClick = () => {
    setIsLeaveGroupDialogOpen(true);
  };

  const confirmLeaveGroup = async () => {
    if (!serverGroupData) return;
    
    setIsUpdatingGroup(true);
    
    try {
      // Obtenemos solo el ID sin prefijo para enviarlo a la API
      const groupId = getIdForApi(serverGroupData.id);
      console.log(`[Cliente] Abandonando grupo: ${groupId} (original: ${serverGroupData.id})`);
      
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
      
      // Notificar a través de evento para actualizar otros componentes
      dispatchGroupUpdateEvent('participant_left', { userId: currentUserId });
      
      // Notificar a los demás participantes
      onConversationUpdate({
        ...serverGroupData,
        participants: serverGroupData.participants.filter(p => p.userId !== currentUserId)
      });
      
      toast({
        title: "Grupo abandonado",
        description: "Has abandonado el grupo correctamente"
      });
      
      // Cerrar modal y actualizar lista de conversaciones
      onClose();
      
      // Si hay una función callback para cuando el usuario abandona el grupo, ejecutarla
      if (_onLeaveGroup) {
        _onLeaveGroup(serverGroupData.id);
      }
      
      // IMPORTANTE: Navegar fuera de la conversación para evitar errores 403 en SSE
      // Esta redirección asegura que no se siga intentando conectar al grupo que acabamos de abandonar
      window.location.href = '/messages';
      
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Ha ocurrido un error al abandonar el grupo",
        variant: "destructive",
      });
      console.error("Error al abandonar grupo:", err);
    } finally {
      setIsUpdatingGroup(false);
      setIsLeaveGroupDialogOpen(false);
    }
  };

  // Filtrar participantes por término de búsqueda
  const filteredParticipants = filteredMutualUsers.filter(user => 
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
            ) : serverGroupData?.imageUrl ? (
              <div className="h-24 w-24 rounded-full overflow-hidden">
                <Image
                  src={serverGroupData.imageUrl}
                  alt={serverGroupData.name || "Grupo"}
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
              <h3 className="text-sm font-medium">Participantes ({localParticipants.length})</h3>
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
              {localParticipants.map((participant) => (
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
                  onClick={handleDeleteGroupClick}
                  disabled={isUpdatingGroup}
                  className="w-full"
                >
                  {isUpdatingGroup ? (
                    <>
                      <span className="mr-2">Eliminando...</span>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Eliminar Grupo
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={handleLeaveGroupClick}
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
              filteredParticipants.map((user: User) => (
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

    {/* Diálogo de confirmación para abandonar grupo */}
    <Dialog open={isLeaveGroupDialogOpen} onOpenChange={setIsLeaveGroupDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Abandonar grupo</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres abandonar este grupo? No podrás volver a unirte a menos que te inviten nuevamente.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setIsLeaveGroupDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={confirmLeaveGroup}
          >
            Abandonar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Diálogo de confirmación para eliminar grupo */}
    <Dialog open={isDeleteGroupDialogOpen} onOpenChange={setIsDeleteGroupDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-red-600 dark:text-red-400">Eliminar grupo</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar este grupo permanentemente? Esta acción no se puede deshacer y se eliminarán todos los mensajes y datos asociados.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setIsDeleteGroupDialogOpen(false)}
          >
            Cancelar
          </Button>
          <Button 
            variant="destructive" 
            onClick={handleDeleteGroup}
          >
            {isUpdatingGroup ? (
              <>
                <span className="mr-2">Eliminando...</span>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar Grupo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default GroupManagementModal;
