import { auth } from "@/auth";
import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from 'bcryptjs';
import { Role } from "@prisma/client";
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
async function processImageUrl(imageUrl: string, userId: string): Promise<string> {
  // Verificar si la imagen ya es una URL de Cloudinary y evitar duplicación
  if (imageUrl && imageUrl.includes('cloudinary.com')) {
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
  if (imageUrl && imageUrl.startsWith('data:image')) {
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
      const uniqueId = `user_profile/admin_update_user_${userId}_${timestamp}`;
      
      // Subir a Cloudinary
      const result: CloudinaryUploadResult = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            public_id: uniqueId,
            folder: 'hemeroteca_digital',
            resource_type: 'image',
          },
          (error, result) => {
            if (error) {
              console.error('Error al subir imagen a Cloudinary:', error);
              reject(error);
            } else if (result) {
              console.log('Imagen de usuario subida con éxito a Cloudinary');
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
      throw error;
    }
  }
  
  return imageUrl;
}

// GET: Obtener detalles de un usuario por ID
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            comments: true,
            ratings: true,
            favoriteSources: true,
            sentMessages: true,
            receivedMessages: true,
            accounts: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    return NextResponse.json(
      { error: "Error al obtener los datos del usuario" },
      { status: 500 }
    );
  }
}

// PATCH: Actualizar información de un usuario
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;
    const body = await req.json();
    
    console.log("Administrador actualizando usuario:", userId);
    console.log("Datos recibidos:", JSON.stringify(body));

    // Validar que el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Preparar datos para actualización
    const updateData: {
      name: string;
      username: string;
      email: string;
      image?: string;
      role: Role;
      bio?: string;
      showActivity?: boolean;
      showFavorites?: boolean;
      password?: string;
    } = {
      name: body.name,
      username: body.username,
      email: body.email,
      role: body.role as Role,
      bio: body.bio,
    };
    
    // Campos opcionales
    if (body.showActivity !== undefined) {
      updateData.showActivity = body.showActivity;
    }
    
    if (body.showFavorites !== undefined) {
      updateData.showFavorites = body.showFavorites;
    }

    // Procesar imagen
    if (body.image) {
      updateData.image = await processImageUrl(body.image, userId);
    }

    // Manejar cambio de contraseña si se proporciona (los admins pueden cambiar sin verificar la actual)
    if (body.newPassword || body.password) {
      // Usar cualquiera de los dos (para compatibilidad)
      const newPasswordValue = body.newPassword || body.password;
      
      if (newPasswordValue.length < 6 || newPasswordValue.length > 32) {
        return NextResponse.json(
          { error: "La contraseña debe tener entre 6 y 32 caracteres" },
          { status: 400 }
        );
      }
      
      console.log("Administrador cambiando contraseña para el usuario:", userId);
      updateData.password = await bcrypt.hash(newPasswordValue, 10);
      console.log("Hash de contraseña generado correctamente");
    }

    // Verificar si el email ya existe (si se está actualizando)
    if (updateData.email && updateData.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: updateData.email },
      });

      if (emailExists) {
        return NextResponse.json(
          { error: "El correo electrónico ya está en uso" },
          { status: 400 }
        );
      }
    }

    // Verificar si el username ya existe (si se está actualizando)
    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameExists = await prisma.user.findUnique({
        where: { username: updateData.username },
      });

      if (usernameExists) {
        return NextResponse.json(
          { error: "El nombre de usuario ya está en uso" },
          { status: 400 }
        );
      }
    }

    // Actualizar el usuario
    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          image: true, 
          bio: true,
          role: true,
          createdAt: true,
          showActivity: true,
          showFavorites: true,
        }
      });
      
      if (updateData.password) {
        console.log("Contraseña actualizada por el administrador para el usuario:", userId);
      }

      return NextResponse.json(updatedUser);
    } catch (updateError) {
      console.error("Error al actualizar usuario:", updateError);
      
      // Manejar error de duplicación
      if (typeof updateError === 'object' && updateError !== null && 'code' in updateError && updateError.code === 'P2002') {
        return NextResponse.json(
          { error: "El email o username ya está en uso" },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: "Error al actualizar usuario" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }
    
    return NextResponse.json(
      { error: "Error al actualizar el usuario" },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un usuario y todos sus datos asociados
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
  }

  try {
    const { id: userId } = await params;

    // Verificar que el usuario existe
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Eliminar todas las entidades relacionadas con el usuario
    await prisma.$transaction([
      // Eliminar comentarios
      prisma.comment.deleteMany({ where: { userId } }),
      
      // Eliminar valoraciones
      prisma.rating.deleteMany({ where: { userId } }),
      
      // Eliminar fuentes favoritas
      prisma.favoriteSource.deleteMany({ where: { userId } }),
      
      // Eliminar mensajes enviados y recibidos
      prisma.directMessage.deleteMany({ 
        where: { OR: [{ senderId: userId }, { receiverId: userId }] } 
      }),
      
      // Eliminar cuentas asociadas (OAuth)
      prisma.account.deleteMany({ where: { userId } }),
      
      // Eliminar tokens de verificación
      prisma.verificationToken.deleteMany({ where: { identifier: user.email } }),
      
      // Finalmente, eliminar el usuario
      prisma.user.delete({ where: { id: userId } })
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    return NextResponse.json(
      { error: "Error al eliminar el usuario" },
      { status: 500 }
    );
  }
}
