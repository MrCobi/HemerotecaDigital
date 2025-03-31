import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { withAuth, AuthParams } from "../../../../../lib/auth-utils";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  return withAuth(async (user: AuthParams['user']) => {
    try {
      // Procesar el archivo
      const formData = await request.formData();
      const file = formData.get('file') as File;
      
      if (!file) {
        return NextResponse.json(
          { error: 'No se ha proporcionado ningún archivo' },
          { status: 400 }
        );
      }
      
      // Convertir el archivo a un buffer para subirlo a Cloudinary
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      
      // Crear un ID único para la imagen basado en timestamp y userId
      const timestamp = Date.now();
      const userId = user.id;
      const fileName = `group_${userId}_${timestamp}`;
      
      // Subir a Cloudinary
      const uploadPromise = new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'hemeroteca_digital/group_uploads',
            public_id: fileName,
            resource_type: 'image',
          },
          (error, result) => {
            if (error) {
              console.error('Error en Cloudinary:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        uploadStream.end(buffer);
      });
      
      const result = await uploadPromise;
      
      // Devolver la URL de la imagen subida
      return NextResponse.json({
        success: true,
        url: (result as any).secure_url,
        publicId: (result as any).public_id
      });
      
    } catch (error) {
      console.error('Error al subir imagen de grupo:', error);
      return NextResponse.json(
        { error: 'Error al procesar la imagen', details: (error as Error).message },
        { status: 500 }
      );
    }
  });
}
