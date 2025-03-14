// src/app/api/relationships/mutual/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

// GET para obtener usuarios con seguimiento mutuo (que nos siguen y seguimos)
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    // Encontrar usuarios que sigan al usuario actual
    const followingMe = await prisma.follow.findMany({
      where: {
        followingId: session.user.id
      },
      select: {
        followerId: true
      }
    });

    const followerIds = followingMe.map(follow => follow.followerId);

    // De esos usuarios, encontrar a quienes el usuario actual también sigue
    const mutualFollows = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: {
          in: followerIds
        }
      },
      select: {
        following: {
          select: {
            id: true,
            username: true,
            name: true,
            image: true
          }
        }
      }
    });

    const users = mutualFollows.map(follow => follow.following);

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error al obtener seguidores mutuos:", error);
    return NextResponse.json(
      { error: "Error al obtener seguidores mutuos" },
      { status: 500 }
    );
  }
}
