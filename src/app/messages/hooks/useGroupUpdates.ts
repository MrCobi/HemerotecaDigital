import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';

// Define a type for group update data
interface GroupUpdateData {
  [key: string]: string | number | boolean | object | null;
}

/**
 * Hook para escuchar actualizaciones de grupo en tiempo real mediante Server-Sent Events (SSE)
 * 
 * @param groupId ID del grupo (con el prefijo 'group_' incluido)
 * @param onUpdate Callback para manejar actualizaciones
 */
export function useGroupUpdates(
  groupId: string | null,
  onUpdate: (updateType: string, data: GroupUpdateData) => void
) {
  const { data: session } = useSession();
  
  const setupSSE = useCallback(() => {
    if (!groupId || !session?.user?.id) return null;
    
    // Extraer el ID del grupo sin el prefijo 'group_' para la llamada a la API
    const apiGroupId = groupId.replace(/^group_/, '');
    
    // Crear una fuente de eventos para escuchar actualizaciones
    const eventSource = new EventSource(`/api/messages/group/updates/sse?groupId=${apiGroupId}`);
    
    // Manejar eventos de conexión
    eventSource.addEventListener('connect', (event) => {
      console.log('[SSE] Conexión establecida para actualizaciones de grupo:', JSON.parse((event as MessageEvent).data));
    });
    
    // Manejar eventos de actualización de nombre o descripción
    eventSource.addEventListener('group_updated', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      console.log('[SSE] Grupo actualizado:', data);
      onUpdate('group_updated', data);
    });
    
    // Manejar eventos de adición de participantes
    eventSource.addEventListener('participants_added', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      console.log('[SSE] Participantes añadidos:', data);
      onUpdate('participants_added', data);
    });
    
    // Manejar eventos de eliminación de participantes
    eventSource.addEventListener('participant_removed', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      console.log('[SSE] Participante eliminado:', data);
      onUpdate('participant_removed', data);
    });
    
    // Manejar eventos de abandono de grupo
    eventSource.addEventListener('participant_left', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      console.log('[SSE] Participante abandonó el grupo:', data);
      onUpdate('participant_left', data);
    });
    
    // Manejar eventos de eliminación de grupo
    eventSource.addEventListener('group_deleted', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      console.log('[SSE] Grupo eliminado:', data);
      onUpdate('group_deleted', data);
    });
    
    // Manejar errores
    eventSource.onerror = (error) => {
      console.error('[SSE] Error en la conexión de actualizaciones de grupo:', error);
    };
    
    return eventSource;
  }, [groupId, session?.user?.id, onUpdate]);
  
  // Establecer la conexión SSE cuando se monta el componente y limpiarla al desmontar
  useEffect(() => {
    // Solo intentar establecer la conexión si hay un ID de grupo válido
    // y si es un grupo (ID comienza con 'group_')
    if (!groupId || !groupId.startsWith('group_')) return;
    
    const eventSource = setupSSE();
    
    // Limpiar al desmontar
    return () => {
      if (eventSource) {
        console.log('[SSE] Cerrando conexión para actualizaciones de grupo');
        eventSource.close();
      }
    };
  }, [groupId, setupSSE]);
  
  // También establecer un listener para eventos locales (para actualizaciones inmediatas)
  useEffect(() => {
    if (!groupId) return;
    
    const handleLocalUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { conversationId, updateType, data } = customEvent.detail;
      
      // Solo procesar eventos para este grupo
      if (conversationId === groupId) {
        console.log(`[Local] Actualización de grupo recibida (${updateType}):`, data);
        onUpdate(updateType, data);
      }
    };
    
    // Agregar listener para eventos locales
    window.addEventListener('group-data-updated', handleLocalUpdate);
    
    // Limpiar listener al desmontar
    return () => {
      window.removeEventListener('group-data-updated', handleLocalUpdate);
    };
  }, [groupId, onUpdate]);
}
