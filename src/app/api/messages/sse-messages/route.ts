// src/app/api/messages/sse-messages/route.ts

import { NextResponse } from 'next/server';

// Esta ruta ya no se utiliza activamente, pero mantenemos la compatibilidad
export async function GET() {
  return new NextResponse(
    JSON.stringify({ message: 'Esta API ha sido reemplazada por Socket.io' }),
    {
      status: 410, // Gone
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );
}
