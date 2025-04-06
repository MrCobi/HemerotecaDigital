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
    
    // Variable para controlar si el usuario ha abandonado/sido eliminado del grupo
    let userLeftGroup = false;
    
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
      
      // Verificar si el usuario actual fue eliminado
      if (session?.user?.id && data.participantId === session.user.id) {
        console.log('[SSE] El usuario actual fue eliminado del grupo');
        userLeftGroup = true;
        
        // Cerrar la conexión SSE ya que el usuario ya no es parte del grupo
        eventSource.close();
      }
      
      onUpdate('participant_removed', data);
    });
    
    // Manejar eventos de abandono de grupo
    eventSource.addEventListener('participant_left', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      console.log('[SSE] Participante abandonó el grupo:', data);
      
      // Verificar si el usuario actual abandonó el grupo
      if (session?.user?.id && data.participantId === session.user.id) {
        console.log('[SSE] El usuario actual abandonó el grupo');
        userLeftGroup = true;
        
        // Cerrar la conexión SSE ya que el usuario ya no es parte del grupo
        eventSource.close();
      }
      
      onUpdate('participant_left', data);
    });
    
    // Manejar eventos de eliminación de grupo
    eventSource.addEventListener('group_deleted', (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      console.log('[SSE] Grupo eliminado:', data);
      
      // Cerrar la conexión SSE ya que el grupo ya no existe
      eventSource.close();
      
      onUpdate('group_deleted', data);
    });
    
    // Manejar errores
    eventSource.onerror = (error) => {
      // Si recibimos un error 403, es probable que el usuario ya no sea parte del grupo
      // o que el grupo haya sido eliminado
      if (userLeftGroup) {
        console.log('[SSE] Conexión cerrada porque el usuario ya no pertenece al grupo');
        eventSource.close();
        return;
      }
      
      console.error('[SSE] Error en la conexión de actualizaciones de grupo:', error);
      
      // Si recibimos un error 403 o 404, es probable que el grupo ya no exista
      // o que el usuario haya sido expulsado, enviamos un evento de tipo "group_deleted"
      // para que la aplicación maneje correctamente este caso
      if (error instanceof Event && eventSource.readyState === EventSource.CLOSED) {
        console.log('[SSE] Detectada posible eliminación de grupo - notificando al sistema');
        // Notificar a la aplicación como si fuera un evento de grupo eliminado
        onUpdate('group_deleted', { 
          groupId: apiGroupId,
          reason: 'connection_error_detected'
        });
        
        // Cerrar la conexión permanentemente
        eventSource.close();
        return;
      }
      
      // Intentar reconectar solo si el error no parece ser de permisos
      // y el usuario no ha dejado el grupo manualmente
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED && !userLeftGroup) {
          console.log('[SSE] Intentando reconectar...');
          // En lugar de reconectar aquí, devolveremos null para que useEffect cree una nueva conexión
        }
      }, 5000); // Esperar 5 segundos antes de reconectar
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
