import { NextResponse } from "next/server";

// Esta es una ruta de compatibilidad transitoria
// que redirige las solicitudes a la API actualizada en /api/favorites

export async function DELETE(req: Request) {
  try {
    let sourceId;
    
    // Intentar obtener el sourceId del body
    try {
      const body = await req.json();
      sourceId = body.sourceId;
    } catch {
      // Si no hay body o no se puede parsear, intentar obtener de los parámetros
      const { searchParams } = new URL(req.url);
      sourceId = searchParams.get("sourceId");
    }

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId es requerido" },
        { status: 400 }
      );
    }

    // Reenviar la solicitud al endpoint principal de favoritos
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/favorites?sourceId=${sourceId}`, {
      method: "DELETE",
      headers: {
        // Pasar la cookie de autenticación
        "Cookie": req.headers.get("cookie") || "",
      },
    });

    // Devolver la respuesta tal cual la recibimos
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error en la compatibilidad transitoria de eliminar favorito:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud para eliminar favorito" },
      { status: 500 }
    );
  }
}

// Añadimos el método POST para mayor compatibilidad
export async function POST(req: Request) {
  try {
    // Extraer los datos del cuerpo de la solicitud
    const body = await req.json();
    const sourceId = body.sourceId;

    if (!sourceId) {
      return NextResponse.json(
        { error: "sourceId es requerido" },
        { status: 400 }
      );
    }

    // Reenviar la solicitud al endpoint principal de favoritos
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/favorites?sourceId=${sourceId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        // Pasar la cookie de autenticación
        "Cookie": req.headers.get("cookie") || "",
      },
    });

    // Devolver la respuesta tal cual la recibimos
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error en la compatibilidad transitoria de eliminar favorito (POST):", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud para eliminar favorito" },
      { status: 500 }
    );
  }
}
