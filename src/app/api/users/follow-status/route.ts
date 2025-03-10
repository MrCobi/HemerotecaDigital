import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/db";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const ids = searchParams.get("ids")?.split(",") || [];
    
    const followStatus = await prisma.follow.findMany({
      where: {
        followerId: session.user.id,
        followingId: { in: ids }
      },
      select: { followingId: true }
    });

    const statusMap = followStatus.reduce((acc, curr) => ({
      ...acc,
      [curr.followingId]: true
    }), {});

    return NextResponse.json(statusMap);
  } catch (error) {
    console.error("Error fetching follow status:", error);
    return NextResponse.json(
      { error: "Failed to fetch follow status" },
      { status: 500 }
    );
  }
}