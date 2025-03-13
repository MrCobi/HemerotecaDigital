import { NextResponse } from "next/server";

// Esta es una ruta de compatibilidad transitoria
// que redirige las solicitudes a la API actualizada en /api/favorites

export async function POST(req: Request) {
  try {
    // Extraer los datos del cuerpo de la solicitud
    const body = await req.json();

    // Reenviar la solicitud al endpoint principal de favoritos
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/favorites`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Pasar la cookie de autenticación
        "Cookie": req.headers.get("cookie") || "",
      },
      body: JSON.stringify(body),
    });

    // Devolver la respuesta tal cual la recibimos
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error en la compatibilidad transitoria de añadir favorito:", error);
    return NextResponse.json(
      { error: "Error al procesar la solicitud para añadir favorito" },
      { status: 500 }
    );
  }
}
