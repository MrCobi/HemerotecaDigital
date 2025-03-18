import { NextRequest } from 'next/server';
import { auth } from "@/auth";

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 });

  return new Response(
    JSON.stringify({
      message: "Esta API ha sido reemplazada por Socket.io para comunicación en tiempo real.",
      info: "Por favor, actualice su cliente para usar la nueva implementación de WebSockets."
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}