import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';

// Definir la interfaz para el resultado de Cloudinary
interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  resource_type: string;
  format: string;
  width: number;
  height: number;
  // Para otras propiedades que podría devolver Cloudinary
  [key: string]: string | number | boolean | Record<string, unknown>;
}

// Función auxiliar para verificar si el usuario es administrador
async function isAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// Función para procesar imágenes de Cloudinary
async function processImageUrl(imageUrl: string | null, sourceId: string): Promise<string | null> {
  if (!imageUrl) return null;
  
  // Verificar si la imagen ya es una URL de Cloudinary y evitar duplicación
  if (imageUrl.includes('cloudinary.com')) {
    // Extraer la URL real si hay duplicación
    if (imageUrl.indexOf('https://res.cloudinary.com') !== imageUrl.lastIndexOf('https://res.cloudinary.com')) {
      // Hay duplicación, extraer la segunda URL
      const secondUrlStart = imageUrl.lastIndexOf('https://res.cloudinary.com');
      return imageUrl.substring(secondUrlStart);
    }
    // No hay duplicación, devolver la URL original
    return imageUrl;
  }
  
  // Si es una imagen en base64, procesarla
  if (imageUrl.startsWith('data:image')) {
    try {
      // Configurar Cloudinary
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });
      
      // Extraer la parte de base64
      const base64Data = imageUrl.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Generar ID único
      const timestamp = Date.now();
      const uniqueId = `source_${sourceId}_${timestamp}`;
      
      // Subir a Cloudinary
      const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: uniqueId,
            folder: 'hemeroteca_digital/sources',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) {
              console.error('Error al subir imagen a Cloudinary:', error);
              reject(error);
            } else if (result) {
              console.log('Imagen de fuente subida con éxito a Cloudinary');
              resolve(result);
            } else {
              reject(new Error('No se recibió respuesta de Cloudinary'));
            }
          }
        ).end(buffer);
      });
      
      return result.secure_url;
    } catch (error) {
      console.error('Error al procesar imagen:', error);
      return "/images/default_periodico.jpg";
    }
  }
  
  // Si no es base64 ni URL de Cloudinary, devolver la URL tal cual
  return imageUrl;
}

// GET: Obtener detalles de una fuente por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: sourceId } = await params;

    const source = await prisma.source.findUnique({
      where: { id: sourceId },
      include: {
        _count: {
          select: {
            comments: true,
            favoriteSources: true,
            ratings: true
          }
        }
      }
    });

    if (!source) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Calcular el rating promedio
    const ratings = await prisma.rating.findMany({
      where: { sourceId: source.id }
    });
    
    const avgRating = ratings.length > 0 
      ? ratings.reduce((sum: number, rating: { value: number }) => sum + rating.value, 0) / ratings.length 
      : 0;
    
    const sourceWithStats = {
      ...source,
      avgRating,
      ratingCount: ratings.length
    };

    return NextResponse.json(sourceWithStats);
  } catch (error) {
    console.error("Error al obtener fuente:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos de la fuente" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar información de una fuente
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: sourceId } = await params;
    const body = await req.json();

    // Validar que la fuente existe
    const existingSource = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!existingSource) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Procesar la imagen
    const imageUrl = await processImageUrl(body.imageUrl, sourceId);

    // Actualizar la fuente
    const updatedSource = await prisma.source.update({
      where: { id: sourceId },
      data: {
        name: body.name,
        description: body.description,
        url: body.url,
        imageUrl: imageUrl || "/images/default_periodico.jpg",
        category: body.category,
        language: body.language,
        country: body.country
      },
    });

    return NextResponse.json(updatedSource);
  } catch (error) {
    console.error("Error al actualizar fuente:", error);
    return NextResponse.json(
      { error: "Error al actualizar la fuente" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar una fuente y todos sus datos asociados
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: sourceId } = await params;

    // Verificar que la fuente existe
    const source = await prisma.source.findUnique({
      where: { id: sourceId },
    });

    if (!source) {
      return NextResponse.json({ error: "Fuente no encontrada" }, { status: 404 });
    }

    // Eliminar la fuente (las relaciones se eliminarán automáticamente por las restricciones ON DELETE CASCADE)
    await prisma.source.delete({
      where: { id: sourceId },
    });

    return NextResponse.json({ message: "Fuente eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar fuente:", error);
    return NextResponse.json(
      { error: "Error al eliminar la fuente" },
      { status: 500 }
    );
  }
}
