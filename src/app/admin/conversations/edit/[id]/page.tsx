"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ChevronLeft, Users, Loader2, Upload, Check, X, MessageSquare } from "lucide-react";
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

interface ConversationParticipant {
  userId: string;
  isAdmin: boolean;
  user: User;
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
  participants?: ConversationParticipant[];
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

  const _handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormValues(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRemoveImage = () => {
    setFormValues(prev => ({
      ...prev,
      imageUrl: ""
    }));
    setPreview("");
    setFile(null);
    toast.info("Imagen eliminada");
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

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-700 p-4 rounded">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <svg className="h-5 w-5 text-red-400 dark:text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-6">
          <Button
            variant="ghost"
            className="flex items-center text-primary hover:text-primary/80"
            onClick={() => router.push('/admin/conversations')}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver a conversaciones
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
      <div className="mb-4 sm:mb-6">
        <Button
          variant="ghost"
          className="flex items-center text-primary hover:text-primary/80 -ml-3"
          onClick={() => router.push(`/admin/conversations/view/${conversationId}`)}
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver a la conversación
        </Button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-card shadow rounded-xl overflow-hidden">
            <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-border">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Editar conversación
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {conversation?.isGroup ? 'Grupo' : 'Conversación individual'}
              </p>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 sm:p-6">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium">
                    Nombre de la conversación
                  </Label>
                  <Input
                    id="name"
                    placeholder="Nombre de la conversación"
                    value={formValues.name}
                    onChange={(e) => setFormValues({ ...formValues, name: e.target.value })}
                    className="mt-1"
                    disabled={conversation?.isGroup === false}
                  />
                  {conversation?.isGroup === false && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Las conversaciones individuales no tienen un nombre editables.
                    </p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="description" className="text-sm font-medium">
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Descripción de la conversación (opcional)"
                    value={formValues.description}
                    onChange={(e) => setFormValues({ ...formValues, description: e.target.value })}
                    className="mt-1 resize-none"
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Imagen</Label>
                  <div className="mt-1 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-4">
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted relative">
                      {(preview || formValues.imageUrl) ? (
                        <>
                          <Image
                            src={preview || formValues.imageUrl}
                            alt="Vista previa"
                            width={96}
                            height={96}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white flex items-center justify-center shadow"
                            onClick={handleRemoveImage}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </>
                      ) : conversation?.isGroup ? (
                        <div className="flex items-center justify-center h-full w-full bg-primary text-primary-foreground">
                          <Users className="h-8 w-8" />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full w-full bg-muted">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-10 w-10 text-muted-foreground opacity-30"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    
                    <div className="w-full">
                      <div className="flex items-center justify-center sm:justify-start">
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer rounded-md px-3 py-2 text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 flex items-center"
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Subir imagen
                          <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                        </label>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-2">
                        Formatos soportados: JPG, PNG, GIF. Máximo 5MB.
                      </p>
                      
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="mt-2">
                          <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary transition-all duration-300 ease-in-out"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 text-center">
                            Subiendo: {uploadProgress}%
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-4 border-t border-border">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="flex-1"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Guardar cambios
                      </>
                    )}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/admin/conversations/view/${conversationId}`)}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
        
        <div className="bg-card shadow rounded-xl overflow-hidden">
          <div className="px-4 sm:px-6 pt-6 pb-4 border-b border-border">
            <h2 className="text-lg font-medium text-foreground">Vista previa</h2>
          </div>
          
          <div className="p-4 sm:p-6">
            <div className="mx-auto w-full max-w-[240px]">
              <div className="relative mx-auto mb-4 rounded-full overflow-hidden h-[120px] w-[120px] shadow-md border-2 border-white">
                {(preview || formValues.imageUrl) ? (
                  <Image
                    src={preview || formValues.imageUrl}
                    alt="Vista previa"
                    width={120}
                    height={120}
                    className="h-full w-full object-cover"
                  />
                ) : conversation?.isGroup ? (
                  <div className="h-full w-full flex items-center justify-center bg-primary text-primary-foreground">
                    <Users className="h-12 w-12" />
                  </div>
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-muted">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-muted-foreground opacity-30"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <h3 className="text-lg font-medium text-foreground mb-1">
                  {formValues.name || conversation?.name || (conversation?.isGroup ? "Grupo sin nombre" : "Conversación individual")}
                </h3>
                
                <p className="text-sm text-muted-foreground">
                  {formValues.description || conversation?.description || "Sin descripción"}
                </p>
                
                <div className="mt-3">
                  <Badge
                    variant="outline"
                    className={
                      conversation?.isGroup
                        ? "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                        : "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-900/30 dark:text-gray-300 dark:border-gray-800"
                    }
                  >
                    {conversation?.isGroup ? (
                      <>
                        <Users className="h-3 w-3 mr-1" />
                        Grupo
                      </>
                    ) : (
                      <>
                        <MessageSquare className="h-3 w-3 mr-1" />
                        Individual
                      </>
                    )}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Información adicional</h3>
              <dl className="grid grid-cols-1 gap-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ID:</dt>
                  <dd className="font-mono text-xs">{conversationId || "..."}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Creado:</dt>
                  <dd>{conversation?.createdAt ? new Date(conversation.createdAt).toLocaleDateString() : "..."}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Participantes:</dt>
                  <dd>{conversation?.participants?.length || "..."}</dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
