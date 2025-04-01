"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { ChevronLeft, Users, Loader2, Upload, Check, X } from "lucide-react";
import { Badge } from "@/src/app/components/ui/badge";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Textarea } from "@/src/app/components/ui/textarea";
import { toast } from "sonner";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface Conversation {
  id: string;
  name: string | null;
  description: string | null;
  isGroup: boolean;
  image: string | null;
  imageUrl?: string | null;
  createdAt: string;
  lastMessageAt: string;
  creatorId?: string;
  creator?: User;
  isDirectConversation?: boolean;
  isGroupConversation?: boolean;
}

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default function EditConversationPage({ params }: PageProps) {
  const router = useRouter();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [formValues, setFormValues] = useState({
    name: "",
    description: "",
    isGroup: false,
    imageUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.type.startsWith('image/')) {
        toast.error('Solo se permiten archivos de imagen');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      toast.info('Imagen seleccionada. Guarde para aplicar los cambios.');
    }
  }, []);

  const uploadFile = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "conversation_images");

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
            const fullUrl = response.url || `https://res.cloudinary.com/${cloudName}/image/upload/${response.public_id}`;
            resolve(fullUrl);
          } else {
            reject(new Error(xhr.statusText || "Error al subir el archivo"));
          }
        }
      };

      xhr.open("POST", "/api/upload");
      xhr.send(formData);
    });
  }, []);

  useEffect(() => {
    async function getParamId() {
      try {
        const parameters = await params;
        setConversationId(parameters.id);
      } catch (err) {
        console.error("Error al obtener ID de parámetros:", err);
        setError("Error al cargar la página");
        setLoading(false);
      }
    }
    
    getParamId();
  }, [params]);

  useEffect(() => {
    if (!conversationId) return;
    
    async function loadConversation() {
      try {
        const sessionRes = await fetch('/api/auth/session');
        const sessionData = await sessionRes.json();
        
        if (!sessionData.user) {
          router.push('/auth/signin');
          return;
        }
        
        const response = await fetch(`/api/admin/conversations/${conversationId}`);
        
        if (!response.ok) {
          throw new Error(`Error al cargar la conversación: ${response.status}`);
        }
        
        const data = await response.json();
        
        const isDirectConversation = data.id.startsWith("conv_");
        const isGroupConversation = data.id.startsWith("group_");
        
        if (data.imageUrl) {
          setPreview(data.imageUrl);
        }
        
        setConversation({
          ...data,
          isDirectConversation,
          isGroupConversation
        });
        
        setFormValues({
          name: data.name || "",
          description: data.description || "",
          isGroup: isGroupConversation || false,
          imageUrl: data.imageUrl || "",
        });
        
        setLoading(false);
      } catch (err) {
        console.error("Error al cargar conversación:", err);
        setError("Error al cargar los datos de la conversación");
        setLoading(false);
      }
    }
    
    loadConversation();
  }, [conversationId, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const _handleSwitchChange = (checked: boolean) => {
    if (conversation?.isGroupConversation && !checked) {
      toast.error("No se puede cambiar el tipo de un grupo existente");
      return;
    }
    
    setFormValues(prev => ({
      ...prev,
      isGroup: checked
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!conversationId) return;
    
    setSubmitting(true);
    
    try {
      const dataToSubmit = {
        name: formValues.name,
        description: formValues.description || "",
        // Solo incluimos image si el formulario tiene una URL de imagen
        ...(formValues.imageUrl ? { imageUrl: formValues.imageUrl } : {}),
        // Incluir isGroup con un valor por defecto
        isGroup: false,
      };
      
      // Variable no utilizada, añadimos prefijo para evitar advertencia
      let _imageUrlToUse = formValues.imageUrl;
      
      if (file && conversation?.isGroupConversation) {
        try {
          setUploadProgress(0);
          const uploadedUrl = await uploadFile(file);
          _imageUrlToUse = uploadedUrl;
          dataToSubmit.imageUrl = uploadedUrl;
        } catch (error) {
          console.error("Error al subir la imagen:", error);
          toast.error("Error al subir la imagen. Los demás cambios se guardarán.");
        }
      }
      
      if (conversation?.isDirectConversation) {
        dataToSubmit.isGroup = false;
      }
      
      if (conversation?.isGroupConversation) {
        dataToSubmit.isGroup = true;
      }
      
      const response = await fetch(`/api/admin/conversations/${conversationId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSubmit),
      });
      
      if (!response.ok) {
        throw new Error(`Error al actualizar conversación: ${response.status}`);
      }
      
      toast.success('Conversación actualizada correctamente');
      router.push(`/admin/conversations/view/${conversationId}`);
    } catch (err) {
      console.error("Error al actualizar conversación:", err);
      toast.error("Error al guardar los cambios");
    } finally {
      setSubmitting(false);
    }
  };

  const renderImage = () => {
    const defaultUserImage = "/images/AvatarPredeterminado.webp";
    const defaultGroupImage = "/images/AvatarPredeterminado.webp";
    
    const isGroup = formValues.isGroup;
    const imageUrl = preview || formValues.imageUrl;
    const alt = formValues.name || (isGroup ? "Grupo" : "Conversación");
    
    return (
      <div className="h-16 w-16 sm:h-24 sm:w-24 overflow-hidden rounded-full flex items-center justify-center bg-gray-100 border-2 border-white dark:border-gray-800 shadow-md relative">
        {imageUrl ? (
          <>
            {conversation?.isGroupConversation && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 flex items-center justify-center transition-opacity">
                <label 
                  htmlFor="imageUpload" 
                  className="w-full h-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100"
                >
                  <Upload className="h-6 w-6 text-white" />
                </label>
                <input 
                  type="file" 
                  id="imageUpload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={conversation?.isDirectConversation || submitting}
                />
              </div>
            )}
            
            {imageUrl.includes('cloudinary') ? (
              <CldImage
                src={imageUrl}
                alt={alt}
                width={96}
                height={96}
                crop="fill"
                gravity="auto"
                className="h-full w-full object-cover rounded-full"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = isGroup ? defaultGroupImage : defaultUserImage;
                }}
              />
            ) : (
              <Image
                src={imageUrl}
                alt={alt}
                width={96}
                height={96}
                className="h-full w-full object-cover rounded-full"
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  const target = e.target as HTMLImageElement;
                  target.src = isGroup ? defaultGroupImage : defaultUserImage;
                }}
              />
            )}
          </>
        ) : isGroup ? (
          <div className="h-full w-full flex items-center justify-center bg-primary text-white relative">
            <Users className="h-8 w-8" />
            {conversation?.isGroupConversation && (
              <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-40 flex items-center justify-center transition-opacity">
                <label 
                  htmlFor="imageUpload" 
                  className="w-full h-full flex items-center justify-center cursor-pointer opacity-0 hover:opacity-100"
                >
                  <Upload className="h-6 w-6 text-white" />
                </label>
                <input 
                  type="file" 
                  id="imageUpload" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                  disabled={conversation?.isDirectConversation || submitting}
                />
              </div>
            )}
          </div>
        ) : (
          <Image
            src={defaultUserImage}
            alt="Avatar predeterminado"
            width={96}
            height={96}
            className="h-full w-full object-cover rounded-full"
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
        <p className="text-muted-foreground">Cargando conversación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <X className="h-12 w-12 text-red-500 mb-2" />
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground text-center">{error}</p>
        <Button onClick={() => router.push('/admin/conversations')} className="mt-4">
          Volver a conversaciones
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6 max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                {conversation?.isDirectConversation 
                  ? "Ver Conversación" 
                  : "Editar Grupo"}
              </h1>
              <p className="text-muted-foreground text-sm">
                {conversation?.isDirectConversation 
                  ? "Información de la conversación directa" 
                  : "Actualiza la información del grupo"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => router.push(`/admin/conversations/view/${conversationId}`)}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              form="edit-form"
              disabled={submitting}
              className="flex items-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Guardar cambios
                </>
              )}
            </Button>
          </div>
        </div>
        
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <form id="edit-form" onSubmit={handleSubmit}>
            <div className="p-6 border-b border-border bg-muted/30">
              <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {renderImage()}
                
                <div className="flex-1 space-y-4 w-full">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      {conversation?.isDirectConversation 
                        ? "Nombre de la conversación directa" 
                        : "Nombre del grupo"}
                    </Label>
                    <Input
                      id="name"
                      name="name"
                      value={formValues.name}
                      onChange={handleChange}
                      placeholder={conversation?.isDirectConversation 
                        ? "Nombre de la conversación 1:1" 
                        : "Nombre del grupo"}
                      maxLength={100}
                      className="max-w-md"
                      disabled={conversation?.isDirectConversation}
                      readOnly={conversation?.isDirectConversation}
                    />
                    {conversation?.isDirectConversation && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Los nombres de conversaciones directas (1:1) no se pueden editar.
                      </p>
                    )}
                  </div>
                  
                  {conversation?.isGroupConversation && uploadProgress > 0 && uploadProgress < 100 && (
                    <div className="space-y-2">
                      <Label>Subiendo imagen</Label>
                      <div className="w-full bg-muted rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-muted-foreground">{uploadProgress}% completado</p>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-2">
                    {conversation?.isDirectConversation ? (
                      <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">
                        Conversación directa (1:1)
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-primary/10">
                        Grupo
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-2 max-w-2xl">
                <Label htmlFor="description">
                  {conversation?.isDirectConversation 
                    ? "Nota sobre la conversación (opcional)" 
                    : "Descripción del grupo (opcional)"}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formValues.description}
                  onChange={handleChange}
                  placeholder={conversation?.isDirectConversation 
                    ? "Añade una nota sobre esta conversación"
                    : "Describe el propósito de este grupo"}
                  rows={4}
                />
              </div>
              
              {conversation?.isGroupConversation && (
                <div className="mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/admin/conversations/participants/${conversationId}`)}
                    className="flex items-center"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Administrar participantes
                  </Button>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
