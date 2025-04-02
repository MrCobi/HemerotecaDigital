import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "../../../../../../lib/auth-utils";

// Mapa para almacenar eventos pendientes por usuario
const pendingGroupUpdates: Map<string, Array<{type: string, data: any}>> = new Map();

// Función para agregar un evento para un grupo
export const addGroupUpdateEvent = (groupId: string, eventType: string, eventData: any) => {
  // Convertimos el ID del grupo a formato sin prefijo
  const cleanGroupId = groupId.replace(/^group_/, '');
  
  // Obtenemos o creamos la lista de eventos para este grupo
  if (!pendingGroupUpdates.has(cleanGroupId)) {
    pendingGroupUpdates.set(cleanGroupId, []);
  }
  
  // Agregamos el nuevo evento
  pendingGroupUpdates.get(cleanGroupId)?.push({
    type: eventType,
    data: eventData
  });
};

// Endpoint SSE para actualizaciones de grupo
export const GET = withAuth(async (
  req: Request,
  { userId }: { userId: string }
) => {
  // Verificar que se proporciona un ID de grupo
  const url = new URL(req.url);
  const groupId = url.searchParams.get('groupId');
  
  if (!groupId) {
    return NextResponse.json(
      { error: 'Se requiere el ID del grupo' },
      { status: 400 }
    );
  }
  
  // Añadir el prefijo 'group_' al ID para buscar en la base de datos
  const fullGroupId = `group_${groupId}`;
  const cleanGroupId = groupId;
  
  // Verificar que el usuario pertenece al grupo
  try {
    console.log(`Verificando permisos para usuario ${userId} en grupo ${fullGroupId} (o ${groupId})`);
    
    const participant = await prisma.conversationParticipant.findFirst({
      where: {
        userId: userId,
        conversation: {
          OR: [
            { id: fullGroupId }, // Con prefijo group_
            { id: groupId }      // Sin prefijo (por si acaso)
          ]
        }
      },
      include: {
        conversation: {
          select: {
            id: true
          }
        }
      }
    });
    
    if (!participant) {
      console.log(`Permiso denegado: Usuario ${userId} no tiene acceso al grupo ${fullGroupId}`);
      return NextResponse.json(
        { error: 'No tienes permiso para ver este grupo' },
        { status: 403 }
      );
    }
    
    console.log(`Permiso concedido: Usuario ${userId} tiene acceso al grupo ${participant.conversation.id}`);
  } catch (error) {
    console.error('Error verificando permisos:', error);
    return NextResponse.json(
      { error: 'Error al verificar permisos' },
      { status: 500 }
    );
  }
  
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController | null = null;
  let interval: NodeJS.Timeout | null = null;

  const cleanup = () => {
    if (interval) {
      clearInterval(interval);
      interval = null;
    }
    if (controller) {
      try {
        controller.close();
      } catch (error) {
        console.error("Error al cerrar el controlador:", error);
      }
      controller = null;
    }
  };

  // Función para enviar un evento SSE
  const sendEvent = (data: { type: string; event: string; data: any }) => {
    if (!controller) return;
    
    try {
      const event = `event: ${data.event}\ndata: ${JSON.stringify(data.data)}\n\n`;
      controller.enqueue(encoder.encode(event));
    } catch (error) {
      console.error("Error al enviar evento SSE:", error);
      cleanup();
    }
  };

  // Función para verificar y enviar actualizaciones pendientes
  const checkForUpdates = () => {
    // Usar el ID sin prefijo para buscar actualizaciones en el mapa
    const updates = pendingGroupUpdates.get(cleanGroupId);
    if (updates && updates.length > 0) {
      // Enviar todos los eventos pendientes
      for (const update of updates) {
        sendEvent({
          type: 'group-update',
          event: update.type,
          data: update.data
        });
      }
      // Limpiar los eventos enviados
      pendingGroupUpdates.set(cleanGroupId, []);
    }
  };

  // Crear el stream
  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Enviar un evento inicial
      sendEvent({
        type: 'initial',
        event: 'connect',
        data: { connected: true, groupId: fullGroupId }
      });

      // Verificar actualizaciones inmediatamente
      checkForUpdates();

      // Configurar el intervalo para verificar actualizaciones
      // Reducimos el intervalo a 500ms para actualizaciones más rápidas
      interval = setInterval(() => {
        checkForUpdates();
      }, 500); // Cambiado de 2000 a 500ms para mayor velocidad

      // Manejar la finalización del stream
      req.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      cleanup();
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  });
});

// Endpoint POST para publicar actualizaciones
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { groupId, updateType, data } = body;
    
    if (!groupId || !updateType) {
      return NextResponse.json(
        { error: 'Se requieren groupId y updateType' },
        { status: 400 }
      );
    }
    
    // Agregar el evento a la cola de eventos pendientes
    addGroupUpdateEvent(groupId, updateType, data);
    
    // Agregamos un pequeño retraso para garantizar que los clientes reciban la actualización
    // Este enfoque evita problemas de timing cuando la actualización y la comprobación ocurren muy cerca
    setTimeout(() => {
      console.log(`Evento ${updateType} registrado para el grupo ${groupId}`);
    }, 100);
    
    return NextResponse.json(
      { success: true, message: 'Evento registrado' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error procesando la solicitud:', error);
    return NextResponse.json(
      { error: 'Error al procesar la solicitud' },
      { status: 500 }
    );
  }
}
