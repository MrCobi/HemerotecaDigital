import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener formulario con el archivo
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: "No se encontró ningún archivo" }, { status: 400 });
    }

    // Verificar que sea una imagen
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
    }

    // Obtener los bytes del archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar un nombre de archivo único basado en timestamp y usuario
    const timestamp = new Date().getTime();
    const userId = session.user.id;
    const filename = `group_${userId}_${timestamp}`;

    // Subir a Cloudinary
    return new Promise((resolve, reject) => {
      // Stream a Cloudinary
      const uploadOptions = {
        public_id: `groups/${filename}`,
        folder: 'hemeroteca/groups',
        resource_type: 'image' as 'image',
        transformation: [
          { width: 500, height: 500, crop: 'limit', quality: 'auto:good' }
        ]
      };

      cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) {
            console.error('Error al subir a Cloudinary:', error);
            resolve(NextResponse.json({ 
              error: "Error al subir la imagen", 
              details: error.message 
            }, { status: 500 }));
          } else {
            resolve(NextResponse.json({ url: result?.secure_url }));
          }
        }
      ).end(buffer);
    });
  } catch (error) {
    console.error('Error procesando la solicitud:', error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
