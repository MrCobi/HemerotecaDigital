import { NextRequest } from 'next/server';
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    return NextResponse.json({
      message: "Esta API de SSE global ha sido reemplazada por Socket.io para comunicación en tiempo real.",
      info: "Por favor, actualice su cliente para usar la nueva implementación de WebSockets.",
      socketUrl: process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001'
    }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}