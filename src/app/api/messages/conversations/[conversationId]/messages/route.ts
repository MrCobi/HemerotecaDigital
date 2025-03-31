import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import prisma from "@/lib/db";
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

type MessageType = 'text' | 'voice';

// Para forzar que la ruta sea dinámica
export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
): Promise<NextResponse> {
  try {
    // Extraer el ID de la conversación de los parámetros dinámicos
    const { conversationId } = await params;
    console.log(`Procesando mensaje para conversación: ${conversationId}`);

    const session = await auth();
    if (!session || !session.user || !session.user.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    
    // Obtener usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { 
        email: session.user.email 
      }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar participación en la conversación
    // Buscar conversaciones con prefijos conv_ o group_
    const conversation = await prisma.conversation.findFirst({
      where: { 
        OR: [
          { id: conversationId.replace(/^(conv_|group_)/, '') },
          { id: conversationId }
        ]
      },
      include: { participants: true }
    });

    if (!conversation) {
      console.log(`Conversación no encontrada: ${conversationId}`);
      return NextResponse.json({ error: 'Conversación no encontrada' }, { status: 404 });
    }

    const isParticipant = conversation.participants.some(
      p => p.userId === currentUser.id
    );

    if (!isParticipant) {
      console.log(`Usuario ${currentUser.id} no es participante de la conversación`);
      return NextResponse.json({ error: 'No es participante de esta conversación' }, { status: 403 });
    }

    // Procesar datos de formulario
    let messageText = '';
    let messageType: MessageType = 'text';
    let mediaUrl: string | null = null;

    // Clonar la solicitud para poder leerla múltiples veces
    const requestClone = request.clone();

    // Intentar procesar como FormData primero
    try {
      const formData = await request.formData();
      messageText = formData.get('message')?.toString() || '';
      const audioFile = formData.get('audio') as File | null;
      
      if (audioFile) {
        messageType = 'voice';
        const generateId = () => crypto.randomBytes(16).toString('hex');
        const fileName = `${Date.now()}_${generateId()}.${audioFile.name.split('.').pop() || 'webm'}`;
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'audio');
        
        // Asegurar que existe el directorio
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        const filePath = path.join(uploadsDir, fileName);
        
        // Guardar archivo
        const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
        fs.writeFileSync(filePath, audioBuffer);
        
        mediaUrl = `/uploads/audio/${fileName}`;
        console.log(`Audio guardado en: ${mediaUrl}`);
      }
    } catch (error) {
      // Si falla FormData, intentar con JSON
      try {
        const jsonBody = await requestClone.json();
        messageText = jsonBody.content || '';
        messageType = jsonBody.messageType || 'text';
      } catch (jsonError) {
        console.error('Error procesando el cuerpo del mensaje:', {
          formDataError: error instanceof Error ? error.message : 'Error desconocido',
          jsonError: jsonError instanceof Error ? jsonError.message : 'Error desconocido'
        });
        return NextResponse.json({ 
          error: 'Formato de mensaje inválido', 
          details: {
            formDataError: error instanceof Error ? error.message : 'Error desconocido',
            jsonError: jsonError instanceof Error ? jsonError.message : 'Error desconocido'
          }
        }, { status: 400 });
      }
    }

    // Crear el mensaje
    const newMessage = await prisma.directMessage.create({
      data: {
        content: messageText,
        mediaUrl,
        messageType,
        conversation: {
          connect: { id: conversation.id }
        },
        sender: {
          connect: { id: currentUser.id }
        }
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true
          }
        }
      }
    });

    console.log(`Mensaje creado con ID: ${newMessage.id}`);

    // Notificar al socket server
    const notifySocket = async () => {
      try {
        const webhookUrl = process.env.SOCKET_WEBHOOK_URL || 'http://localhost:3001/webhook/new-message';
        console.log(`Notificando al socket en: ${webhookUrl}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(webhookUrl, {
            method: 'POST',
            signal: controller.signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: newMessage,
              conversationId: conversation.id,
              senderId: currentUser.id
            })
          });
          
          clearTimeout(timeoutId);

          if (!response.ok) {
            console.warn(`Advertencia: No se pudo notificar al socket. Código de estado: ${response.status}`);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          
          console.warn('Error al notificar al socket server:', {
            message: fetchError instanceof Error ? fetchError.message : 'Error desconocido',
            name: fetchError instanceof Error ? fetchError.name : 'Unknown Error',
            code: fetchError instanceof Error && 'code' in fetchError ? fetchError.code : null
          });
        }
      } catch (error) {
        console.error('Error inesperado al intentar notificar al socket server:', error);
      }
    };

    // No esperamos a que se complete la notificación del socket
    notifySocket();

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('ERROR_MESSAGES_POST:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
