import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo de archivo no permitido' }, { status: 400 });
    }

    // Validar tamaño (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'El archivo es demasiado grande (máx. 5MB)' }, { status: 400 });
    }

    // Convertir el archivo a un buffer para subirlo a Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar un identificador único para el archivo
    const timestamp = Date.now();
    const uniqueId = `user_uploads/user_${timestamp}`;

    // Crear una promesa para la carga a Cloudinary
    const cloudinaryUpload = new Promise<string>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: uniqueId,
          folder: 'hemeroteca_digital', // Opcional: carpeta en tu cuenta de Cloudinary
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            console.error('Error de Cloudinary:', error);
            reject(error);
          } else {
            // Retornamos solo el public_id que se usará con CldImage
            resolve(result?.public_id || '');
          }
        }
      );

      // Escribir el buffer en el stream de carga
      const cloudinaryBuffer = Buffer.from(buffer);
      uploadStream.end(cloudinaryBuffer);
    });

    // Esperar a que se complete la carga
    const publicId = await cloudinaryUpload;

    // Retornar el public_id para usar con CldImage - solo devolvemos el ID, no la URL completa
    return NextResponse.json({ url: publicId });

  } catch (error) {
    console.error('Error subiendo archivo a Cloudinary:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}