// src/app/api/messages/conversations/route.ts
import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";


interface _ConversationPair {
  user1: string;
  user2: string;
  lastMessageDate: Date;
}

interface _ConversationResponse {
  id: string;
  receiver: {
    id: string;
    username: string | null;
    name: string | null;
    image: string | null;
  };
  lastMessage?: {
    id: string;
    content: string | null;
    createdAt: Date;
    read: boolean;
    senderId: string;
    sender: {
      id: string;
      username: string | null;
      image: string | null;
    };
  };
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
  isGroup: boolean;
  name?: string;
  description?: string;
  imageUrl?: string;
  participants?: {
    id: string;
    userId: string;
    conversationId: string;
    isAdmin: boolean;
    joinedAt: Date;
    user: {
      id: string;
      username: string | null;
      image: string | null;
    };
  }[];
  participantsCount?: number;
  settings?: {
    isPrivate: boolean;
    onlyAdminsCanInvite: boolean;
    onlyAdminsCanMessage: boolean;
    onlyAdminsCanEdit: boolean;
    maxParticipants: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Usuario no autenticado" },
        { status: 401 }
      );
    }

    // Obtener parámetros de paginación y filtrado
    const searchParams = request.nextUrl.searchParams;
    
    // Extraer y validar parámetros
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') || 10)));
    const offset = (page - 1) * limit;
    
    // Extraer parámetro de filtro y decodificarlo correctamente
    const filterRaw = searchParams.get('filter');
    const filter = filterRaw || 'all';
    
    // Debug detallado
    console.log(`API: Parámetro raw de filtro: "${filterRaw}"`);
    console.log(`API: Tipo de filterRaw: ${typeof filterRaw}`);
    console.log(`API: Filtro normalizado: "${filter}"`);
    console.log(`API: searchParams completo:`, Object.fromEntries(searchParams.entries()));
    
    // Extraer término de búsqueda y decodificarlo
    let searchTerm = searchParams.get('search') || '';
    searchTerm = decodeURIComponent(searchTerm.trim());
    if (searchTerm) {
      console.log(`API: Término de búsqueda: "${searchTerm}"`);
    }
    
    // Soportar tanto el formato page/limit como offset/limit
    const limitParam = limit;
    const offsetParam = offset;
    
    // Calcular el offset real (priorizar offset si está presente, de lo contrario usar page)
    const offsetReal = offsetParam;
    const limitReal = limitParam;
    
    console.log(`API Request - User: ${session.user.id}, Filter: ${filter}, Search: '${searchTerm}', Limit: ${limitReal}, Page: ${page}, Offset: ${offsetReal}`);

    // Construir la cláusula WHERE según el filtro seleccionado
    let whereClause = `WHERE cp.user_id = '${session.user.id}'`;
    
    // Aplicar filtro de tipo según lo solicitado
    if (filter === 'private') {
      console.log(`API: Aplicando filtro PRIVATE`);
      // Solo conversaciones privadas (no grupales)
      whereClause += ` AND c.is_group = 0`;
    } else if (filter === 'group') {
      console.log(`API: Aplicando filtro GROUP`);
      // Solo conversaciones grupales
      whereClause += ` AND c.is_group = 1`;
    } else {
      console.log(`API: Aplicando filtro ALL (sin restricción de tipo)`);
      // Todos los tipos
    }
    
    // Aplicar búsqueda si hay término, RESPETANDO el filtro ya aplicado
    if (searchTerm) {
      // Cambiamos completamente la estrategia de búsqueda
      console.log(`Buscando conversaciones con término: "${searchTerm}"`);
      
      // NUEVA LÓGICA: Solo mostrar lo que corresponda según el filtro
      if (filter === 'private') {
        // En modo privado solo buscamos conversaciones 1:1 con ese usuario
        whereClause += ` AND EXISTS (
          SELECT 1 FROM users u 
          JOIN conversation_participants cp2 ON u.id = cp2.user_id 
          WHERE cp2.conversation_id = c.id 
          AND cp2.user_id != '${session.user.id}' 
          AND (
            u.name LIKE '%${searchTerm}%' OR 
            u.username LIKE '%${searchTerm}%'
          )
        )`;
      } else if (filter === 'group') {
        // En modo grupo solo buscamos grupos cuyo nombre coincida
        whereClause += ` AND c.name LIKE '%${searchTerm}%'`;
      } else {
        // En modo "todos", aplicamos la lógica combinada
        whereClause += ` AND (
          /* CASO 1: Grupos cuyo NOMBRE coincide con el término (ignorando participantes) */
          (c.is_group = 1 AND c.name LIKE '%${searchTerm}%')
          
          OR
          
          /* CASO 2: Conversaciones privadas 1:1 con un usuario cuyo nombre/username coincide */
          (c.is_group = 0 AND EXISTS (
            SELECT 1 FROM users u 
            JOIN conversation_participants cp2 ON u.id = cp2.user_id 
            WHERE cp2.conversation_id = c.id 
            AND cp2.user_id != '${session.user.id}' 
            AND (
              u.name LIKE '%${searchTerm}%' OR 
              u.username LIKE '%${searchTerm}%'
            )
          ))
        )`;
      }
    }
    
    console.log(`Ejecutando consulta con WHERE: ${whereClause}`);
    
    // 1. Obtener conversaciones paginadas
    // Modificamos el ORDER BY para priorizar conversaciones 1:1 con el usuario buscado
    const orderByClause = searchTerm 
      ? `
        /* Orden de prioridad cuando hay búsqueda */
        ORDER BY 
          /* 1. Primero las conversaciones privadas 1:1 con usuarios que coincidan exactamente */
          CASE WHEN 
            c.is_group = 0 AND 
            EXISTS (
              SELECT 1 FROM users u 
              JOIN conversation_participants cp2 ON u.id = cp2.user_id 
              WHERE cp2.conversation_id = c.id 
              AND cp2.user_id != '${session.user.id}' 
              AND (
                u.username = '${searchTerm}' OR 
                u.name = '${searchTerm}'
              ) 
            )
            THEN 0
          /* 2. Luego las conversaciones privadas 1:1 con usuarios que coincidan parcialmente */
          WHEN 
            c.is_group = 0 AND 
            EXISTS (
              SELECT 1 FROM users u 
              JOIN conversation_participants cp2 ON u.id = cp2.user_id 
              WHERE cp2.conversation_id = c.id 
              AND cp2.user_id != '${session.user.id}' 
              AND (
                u.username LIKE '%${searchTerm}%' OR 
                u.name LIKE '%${searchTerm}%'
              )
            )
            THEN 1
          /* 3. Luego los grupos cuyo nombre coincida exactamente con la búsqueda */
          WHEN c.is_group = 1 AND c.name = '${searchTerm}' THEN 2
          /* 4. Luego los grupos cuyo nombre contenga la búsqueda */
          WHEN c.is_group = 1 AND c.name LIKE '%${searchTerm}%' THEN 3
          /* 5. Por último, otros resultados (que no deberían existir con el nuevo WHERE) */
          ELSE 4
          END,
        /* Secundariamente ordenar por fecha de actualización */
        c.updated_at DESC
      `
      : `ORDER BY c.updated_at DESC`; // Orden predeterminado si no hay búsqueda
    
    // MODIFICACIÓN CLAVE: Si hay un término de búsqueda, omitimos la paginación
    // y devolvemos todas las coincidencias, luego haremos la selección manual
    const limitOffsetClause = searchTerm 
      ? `` // Sin límite cuando hay búsqueda, mostrar todos los resultados
      : `LIMIT ${limitReal} OFFSET ${offsetReal}`; // Paginación normal en modo sin búsqueda
    
    const userConversations = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id as conversationId,
        c.created_at as createdAt, 
        c.updated_at as updatedAt,
        c.is_group as isGroup,
        c.name as name,
        c.description as description,
        c.image_url as imageUrl,
        gs.is_private as isPrivate,
        gs.only_admins_can_invite as onlyAdminsCanInvite,
        gs.only_admins_can_message as onlyAdminsCanMessage,
        gs.only_admins_can_edit as onlyAdminsCanEdit,
        gs.max_participants as maxParticipants
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      LEFT JOIN group_settings gs ON c.id = gs.conversation_id
      ${whereClause}
      ${orderByClause}
      ${limitOffsetClause}
    `);

    // Obtener el total para calcular si hay más páginas
    const totalCountResult = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as total
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      ${whereClause}
    `);
    
    const totalCount = Array.isArray(totalCountResult) && totalCountResult.length > 0 
      ? Number(totalCountResult[0].total)
      : 0;
    
    console.log(`Encontradas ${Array.isArray(userConversations) ? userConversations.length : 0} conversaciones de un total de ${totalCount}`);

    if (!Array.isArray(userConversations) || userConversations.length === 0) {
      // No hay conversaciones
      return NextResponse.json({
        conversations: [],
        page,
        limit,
        totalCount,
        hasMore: false
      });
    }
    
    // Si hay un término de búsqueda, aplicamos manualmente la paginación después de obtener todos los resultados
    let paginatedUserConversations = userConversations;
    if (searchTerm && Array.isArray(userConversations)) {
      // Limitamos a los resultados de la página actual
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      paginatedUserConversations = userConversations.slice(startIndex, endIndex);
      
      console.log(`Aplicando paginación manual: mostrando ${paginatedUserConversations.length} de ${userConversations.length} coincidencias (página ${page})`);
    }

    // 2. Para cada conversación, obtener al otro participante
    const conversationsWithParticipants = await Promise.all(
      (paginatedUserConversations as Array<_ConversationResponse & { 
        conversationId?: string;
        isPrivate?: boolean;
        onlyAdminsCanInvite?: boolean;
        onlyAdminsCanMessage?: boolean;
        onlyAdminsCanEdit?: boolean;
        maxParticipants?: number;
      }>).map(async (conv) => {
        try {
          // Determinar si es un grupo basado en el ID
          const isGroup = conv.isGroup || (typeof conv.conversationId === 'string' && conv.conversationId.startsWith('group_'));
          
          if (isGroup) {
            // Obtener datos completos del grupo
            const groupData = await prisma.conversation.findUnique({
              where: { id: conv.conversationId },
              include: {
                participants: {
                  include: {
                    user: {
                      select: { id: true, username: true, image: true }
                    }
                  }
                }
              }
            });
            
            if (!groupData) return null;
            
            console.log(`[DEBUG] Datos del grupo: ID=${groupData.id}, Nombre=${groupData.name}, Participantes=${groupData.participants.length}`);
            console.log(`[DEBUG] Detalles del grupo:`, JSON.stringify({
              id: groupData.id,
              name: groupData.name,
              participants: groupData.participants.length
            }));
            
            // Obtener el último mensaje y conteo de no leídos
            const [lastMessage, unreadCount] = await Promise.all([
              prisma.directMessage.findFirst({
                where: { conversationId: conv.conversationId },
                orderBy: { createdAt: 'desc' },
                include: {
                  sender: {
                    select: { id: true, username: true, image: true }
                  }
                }
              }),
              prisma.directMessage.count({
                where: {
                  conversationId: conv.conversationId,
                  senderId: { not: session.user.id },
                  read: false
                }
              })
            ]);
            
            const formattedGroup = {
              id: conv.conversationId,
              isGroup: true,
              name: groupData.name,
              description: groupData.description,
              imageUrl: groupData.imageUrl,
              participants: groupData.participants,
              participantsCount: groupData.participants.length,
              lastMessage: lastMessage ? {
                id: lastMessage.id,
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                read: lastMessage.read,
                sender: lastMessage.sender
              } : null,
              unreadCount,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt,
              settings: {
                isPrivate: conv.isPrivate,
                onlyAdminsCanInvite: conv.onlyAdminsCanInvite,
                onlyAdminsCanMessage: conv.onlyAdminsCanMessage,
                onlyAdminsCanEdit: conv.onlyAdminsCanEdit,
                maxParticipants: conv.maxParticipants
              }
            };
            
            console.log(`[DEBUG] Devolviendo grupo formateado:`, JSON.stringify({
              id: formattedGroup.id,
              name: formattedGroup.name,
              participantsCount: formattedGroup.participantsCount
            }));
            
            return formattedGroup;
          } else {
            // Obtener al otro participante
            const otherParticipant = await prisma.$queryRaw`
              SELECT 
                u.id, 
                u.username, 
                u.name, 
                u.image
              FROM conversation_participants cp
              JOIN users u ON cp.user_id = u.id
              WHERE cp.conversation_id = ${conv.conversationId}
              AND cp.user_id != ${session.user.id}
              LIMIT 1
            `;

            // Si no hay otro participante (posible en conversaciones grupales o corruptas)
            if (!Array.isArray(otherParticipant) || otherParticipant.length === 0) {
              console.log(`No se encontró otro participante para conversación: ${conv.conversationId}`);
              return null;
            }

            // Asegurar que otherParticipant tiene el formato correcto
            const otherUser = {
              id: otherParticipant[0].id as string,
              username: otherParticipant[0].username as string | null,
              name: otherParticipant[0].name as string | null,
              image: otherParticipant[0].image as string | null
            };

            // Obtener el último mensaje usando conversationId (ajuste clave)
            const lastMessage = await prisma.directMessage.findFirst({
              where: {
                conversationId: conv.conversationId
              },
              orderBy: { createdAt: 'desc' }
            });

            // Obtener número de mensajes no leídos
            const unreadCount = await prisma.directMessage.count({
              where: {
                conversationId: conv.conversationId,
                senderId: { not: session.user.id },
                read: false
              }
            });

            return {
              id: conv.conversationId,
              receiver: {
                id: otherUser.id,
                username: otherUser.username,
                name: otherUser.name,
                image: otherUser.image
              },
              lastMessage: lastMessage ? {
                id: lastMessage.id,
                content: lastMessage.content,
                createdAt: lastMessage.createdAt,
                senderId: lastMessage.senderId,
                read: lastMessage.read
              } : null,
              unreadCount,
              createdAt: conv.createdAt,
              updatedAt: conv.updatedAt || conv.createdAt,
              isGroup: false
            };
          }
        } catch (error) {
          console.error(`Error procesando conversación ${conv.conversationId}:`, error);
          return null;
        }
      })
    );

    // Filtrar nulos y ordenar por fecha de actualización (más reciente primero)
    const filteredConversations = conversationsWithParticipants.filter((conv): conv is NonNullable<typeof conv> => conv !== null);
    
    console.log(`Procesadas ${filteredConversations.length} conversaciones válidas`);
    
    const sortedConversations = filteredConversations.sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
      const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    // Devolver con metadatos de paginación
    return NextResponse.json({
      conversations: sortedConversations,
      page,
      limit,
      totalCount,
      hasMore: searchTerm 
        ? (userConversations as (_ConversationResponse & { 
            conversationId?: string;
            isPrivate?: boolean;
            onlyAdminsCanInvite?: boolean;
            onlyAdminsCanMessage?: boolean;
            onlyAdminsCanEdit?: boolean;
            maxParticipants?: number;
          })[]).length > (page * limit) // Para búsqueda, comprobamos contra el total de coincidencias 
        : (page * limit) < totalCount // Para navegación normal, comprobamos contra el total en la base de datos
    });

  } catch (error) {
    console.error("Error al obtener conversaciones:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Error desconocido"
      },
      { status: 500 }
    );
  }
}

// Versión final corregida usando transacciones adecuadas
export async function POST(request: NextRequest): Promise<NextResponse>  {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const data = await request.json();
    const { receiverId } = data;

    if (!receiverId) {
      return NextResponse.json(
        { error: "Se requiere un ID de destinatario" },
        { status: 400 }
      );
    }

    // Verificar que el destinatario exista
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId }
    });

    if (!receiver) {
      return NextResponse.json(
        { error: "Destinatario no encontrado" },
        { status: 404 }
      );
    }

    // Buscar conversación existente entre los usuarios
    const existingConversations = await prisma.$queryRaw`
      SELECT c.id, c.created_at
      FROM conversations c
      JOIN conversation_participants p1 ON c.id = p1.conversation_id
      JOIN conversation_participants p2 ON c.id = p2.conversation_id
      WHERE p1.user_id = ${session.user.id}
      AND p2.user_id = ${receiverId}
      AND c.is_group = false
      LIMIT 1
    `;

    if (Array.isArray(existingConversations) && existingConversations.length > 0) {
      const _conv = existingConversations[0] as { id: string; created_at: Date };
      console.log(`Conversación existente encontrada: ${_conv.id}`);
      
      return NextResponse.json({
        id: _conv.id,
        receiver: {
          id: receiver.id,
          username: receiver.username,
          name: receiver.name,
          image: receiver.image
        },
        createdAt: _conv.created_at,
        isNew: false
      });
    }

    // Crear nueva conversación con transacción correcta
    let newConversation;
    try {
      newConversation = await prisma.$transaction(async (tx) => {
        // 1. Crear la conversación
        const _conv = await tx.$executeRaw`
          INSERT INTO conversations (id, is_group, created_at, updated_at)
          VALUES (CONCAT('conv_', UUID()), false, NOW(), NOW())
        `;
        
        // Obtener la conversación recién creada
        const createdConv = await tx.$queryRaw`
          SELECT id, created_at 
          FROM conversations 
          ORDER BY created_at DESC 
          LIMIT 1
        `;
        
        if (!Array.isArray(createdConv) || createdConv.length === 0) {
          throw new Error("No se pudo crear la conversación");
        }
        
        const newConv = createdConv[0] as { id: string; created_at: Date };
        const conversationId = newConv.id;
        
        // 2. Crear los participantes
        await tx.$executeRaw`
          INSERT INTO conversation_participants (id, user_id, conversation_id, is_admin, joined_at)
          VALUES (CONCAT('cp_', UUID()), ${session.user.id}, ${conversationId}, true, NOW())
        `;
        
        await tx.$executeRaw`
          INSERT INTO conversation_participants (id, user_id, conversation_id, is_admin, joined_at)
          VALUES (CONCAT('cp_', UUID()), ${receiverId}, ${conversationId}, false, NOW())
        `;
        
        return { id: conversationId, createdAt: newConv.created_at };
      });
    } catch (error) {
      console.error("Error en la transacción:", error);
      return NextResponse.json(
        { error: "Error al crear la conversación", details: (error as Error).message },
        { status: 500 }
      );
    }

    console.log(`Nueva conversación creada: ${newConversation.id}`);
    
    return NextResponse.json({
      id: newConversation.id,
      receiver: {
        id: receiver.id,
        username: receiver.username,
        name: receiver.name,
        image: receiver.image
      },
      createdAt: newConversation.createdAt,
      isNew: true
    });

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor", details: (error as Error).message },
      { status: 500 }
    );
  }
}
