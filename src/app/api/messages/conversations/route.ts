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

    // Obtener parámetros de paginación y búsqueda
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '5');
    const searchTerm = searchParams.get('search') || '';
    const filter = searchParams.get('filter') || 'all';
    
    const offset = (page - 1) * limit;
    
    console.log(`Obteniendo conversaciones para usuario: ${session.user.id}, página: ${page}, límite: ${limit}, filtro: ${filter}, búsqueda: '${searchTerm}'`);

    // Base de la consulta
    let whereClause = `WHERE cp.user_id = '${session.user.id}'`;
    
    // Añadir filtros por tipo
    if (filter === 'private') {
      whereClause += " AND c.is_group = false";
    } else if (filter === 'group') {
      whereClause += " AND c.is_group = true";
    }
    
    // Añadir búsqueda si existe un término
    if (searchTerm) {
      whereClause += ` AND (
        (c.is_group = true AND c.name LIKE '%${searchTerm}%')
        OR
        (c.is_group = false AND EXISTS (
          SELECT 1 FROM conversation_participants cp2
          JOIN users u ON cp2.user_id = u.id
          WHERE cp2.conversation_id = c.id
          AND cp2.user_id != '${session.user.id}'
          AND (u.username LIKE '%${searchTerm}%' OR u.name LIKE '%${searchTerm}%')
        ))
      )`;
    }
    
    // 1. Obtener conversaciones paginadas
    const userConversations = await prisma.$queryRawUnsafe(`
      SELECT 
        c.id as conversationId,
        c.created_at as createdAt, 
        c.updated_at as updatedAt,
        c.is_group as isGroup,
        c.name as name,
        c.description as description,
        c.image_url as imageUrl
      FROM conversations c
      JOIN conversation_participants cp ON c.id = cp.conversation_id
      ${whereClause}
      ORDER BY c.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
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

    // 2. Para cada conversación, obtener al otro participante
    const conversationsWithParticipants = await Promise.all(
      (userConversations as { 
        id: string; 
        isGroup?: boolean; 
        conversationId?: string;
        createdAt?: Date;
        updatedAt?: Date;
        created_at?: Date;
        updated_at?: Date;
      }[]).map(async (conv) => {
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
              updatedAt: conv.updatedAt
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
      hasMore: offset + sortedConversations.length < totalCount
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
