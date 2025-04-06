import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// Define una interfaz para el tipo de seguidor mutuo
interface MutualFollower {
  id: string;
  username: string | null;
  name: string | null;
  image: string | null;
  email: string | null;
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    console.log(`Buscando seguidores mutuos para: ${session.user.id}`);

    // Obtener directamente todos los seguidores mutuos
    const mutualFollowers = await prisma.$queryRaw`
      SELECT u.id, u.username, u.name, u.image, u.email 
      FROM users u
      JOIN follows f1 ON u.id = f1.follower_id AND f1.following_id = ${session.user.id}
      JOIN follows f2 ON u.id = f2.following_id AND f2.follower_id = ${session.user.id}
      WHERE u.id != ${session.user.id}
    `;

    console.log(`Encontrados ${(mutualFollowers as MutualFollower[]).length} seguidores mutuos`);
    (mutualFollowers as MutualFollower[]).forEach((user) => {
      console.log(`- ${user.username || user.name} (${user.id})`);
    });

    // Solo si hay seguidores mutuos, verificamos las conversaciones
    if ((mutualFollowers as MutualFollower[]).length > 0) {
      // Verificar si hay conversaciones existentes
      const conversationsExist = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          participants: {
            some: {
              userId: session.user.id
            }
          }
        }
      });

      // Si no hay conversaciones, simplemente devolver todos los seguidores mutuos
      if (!conversationsExist) {
        console.log("No existen conversaciones, devolviendo todos los seguidores mutuos");
        return NextResponse.json(mutualFollowers);
      }

      // Si hay conversaciones, obtener usuarios con los que ya tiene conversación
      console.log("Existen conversaciones, filtrando usuarios que ya tienen conversación");
      const existingConversations = await prisma.conversation.findMany({
        where: {
          isGroup: false,
          participants: {
            some: {
              userId: session.user.id
            }
          }
        },
        include: {
          participants: {
            where: {
              userId: {
                not: session.user.id
              }
            },
            select: {
              userId: true
            }
          }
        }
      });
      
      // Extraer los IDs de los usuarios con los que ya tiene conversación
      const userIdsWithConversation = new Set(
        existingConversations.flatMap(conv => conv.participants.map(p => p.userId))
      );

      console.log("Usuarios con conversación existente:", 
        Array.from(userIdsWithConversation).join(", "));

      // Filtrar usuarios que YA tienen conversación con el usuario actual
      const filteredFollowers = (mutualFollowers as MutualFollower[]).filter(user => 
        !userIdsWithConversation.has(user.id)
      );

      console.log(`Después de filtrar quedan ${filteredFollowers.length} seguidores mutuos`);
      return NextResponse.json(filteredFollowers);
    }

    return NextResponse.json(mutualFollowers);
  } catch (error) {
    console.error("Error al obtener seguidores mutuos sin conversación:", error);
    return NextResponse.json({ error: "Error al obtener seguidores mutuos sin conversación" }, { status: 500 });
  }
}
