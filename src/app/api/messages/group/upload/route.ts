import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { withAuth, AuthParams } from "../../../../../lib/auth-utils";
import { Readable } from 'stream';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Definir tipos para la respuesta de Cloudinary
interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  [key: string]: unknown;
}

export const POST = withAuth(async (
  req: Request,
  auth: AuthParams
) => {
  try {
    const request = req as unknown as NextRequest;
    // Procesar el archivo
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se ha proporcionado ningún archivo' },
        { status: 400 }
      );
    }
    
    // Convertir archivo a buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Crear un nombre de archivo único basado en el ID del usuario
    const userId = auth.user.id;
    const timestamp = Date.now();
    const filename = `group_${userId}_${timestamp}`;
    
    // Subir a Cloudinary usando streams y promises
    const uploadPromise = new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: 'hemeroteca_digital/group_uploads',
        public_id: filename,
        resource_type: 'image' as const, 
      };
      
      // Utilizar la API de upload_stream de Cloudinary
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      
      // Escribir el buffer al stream de cloudinary
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });
    
    const result = await uploadPromise;
    
    // Devolver la URL de la imagen subida
    return NextResponse.json({
      success: true,
      url: (result as CloudinaryResponse).secure_url,
      publicId: (result as CloudinaryResponse).public_id
    });
    
  } catch (error) {
    console.error('Error al subir imagen de grupo:', error);
    return NextResponse.json(
      { error: 'Error al procesar la imagen', details: (error as Error).message },
      { status: 500 }
    );
  }
});
