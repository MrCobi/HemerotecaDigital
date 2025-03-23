import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { withAuth } from "../../../lib/auth-utils";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const POST = withAuth(async (req: Request, { userId }: { userId: string }) => {
  try {
    const data = await req.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ error: 'No se subió ningún archivo' }, { status: 400 });
    }

    // Validar tipo de archivo
    const fileType = data.get('fileType') as string || 'image';
    
    if (fileType === 'image') {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'Tipo de archivo de imagen no permitido' }, { status: 400 });
      }
      
      // Validar tamaño (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'El archivo es demasiado grande (máx. 5MB)' }, { status: 400 });
      }
    } else if (fileType === 'audio') {
      const allowedTypes = ['audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/webm;codecs=opus'];
      
      // Solución para algunos tipos MIME que pueden venir con formato diferente
      const mimeMainType = file.type.split(';')[0].toLowerCase();
      const isAllowedAudio = allowedTypes.some(type => 
        file.type.includes(type) || 
        mimeMainType === 'audio/webm' ||
        mimeMainType === 'audio/mp3' || 
        mimeMainType === 'audio/mpeg' ||
        mimeMainType === 'audio/ogg' ||
        mimeMainType === 'audio/wav'
      );
      
      if (!isAllowedAudio) {
        console.log('Tipo de archivo rechazado:', file.type);
        return NextResponse.json({ error: `Tipo de archivo de audio no permitido: ${file.type}` }, { status: 400 });
      }
      
      // Validar tamaño para audio (max 10MB)
      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json({ error: 'El archivo de audio es demasiado grande (máx. 10MB)' }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Tipo de archivo no soportado' }, { status: 400 });
    }

    // Convertir el archivo a un buffer para subirlo a Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generar un identificador único para el archivo con el ID del usuario
    const timestamp = Date.now();
    const uniqueId = `user_uploads/user_${userId}_${timestamp}`;

    // Crear una promesa para la carga a Cloudinary
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          public_id: uniqueId,
          folder: 'hemeroteca_digital', // Opcional: carpeta en tu cuenta de Cloudinary
          resource_type: fileType === 'image' ? 'image' : 'auto', // Cambiar a 'auto' para que Cloudinary detecte automáticamente
        },
        (error, result) => {
          if (error) {
            console.error('Error al subir a Cloudinary:', error);
            reject(error);
          } else {
            console.log('Archivo subido con éxito a Cloudinary:', result?.url);
            resolve(result);
          }
        }
      ).end(buffer);
    });

    // Retornar el public_id para usar con CldImage - solo devolvemos el ID, no la URL completa
    return NextResponse.json({ 
      url: result.secure_url, // Usar la URL completa segura (https) para los audios
      publicId: result.public_id // Mantener public_id para compatibilidad
    });

  } catch (error) {
    console.error('Error subiendo archivo a Cloudinary:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
});