"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut, signIn } from "next-auth/react";
import Image from "next/image";
import { CldImage } from 'next-cloudinary';
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Loader2,
  User as UserIcon,
  CheckCircle2,
  Key,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { Textarea } from "@/src/app/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
import { User } from "@/src/interface/user";

// Extendimos el tipo de usuario para asegurarnos de que incluye bio
type ExtendedUser = User & {
  bio?: string | null;
};

export default function EditProfilePage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    newPassword: "",
    confirmPassword: "",
    bio: "",
    image: "",
    email: "",
  });
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user) {
      router.push("/api/auth/signin");
      return;
    }

    // Utilizamos el tipo extendido para acceder a bio sin errores
    const user = session.user as ExtendedUser;

    // Inicializar el formulario con los datos de la sesión
    setFormData({
      name: user.name || "",
      username: user.username || "",
      password: "",
      newPassword: "",
      confirmPassword: "",
      bio: user.bio || "",
      image: user.image || "",
      email: user.email || "",
    });

    if (user.image) {
      setPreview(user.image);
    }

    setLoading(false);
    
    // Realizar una solicitud adicional para obtener los datos completos del usuario
    const fetchUserDetails = async () => {
      try {
        const response = await fetch(`/api/users/${user.id}`);
        if (response.ok) {
          const userData = await response.json();
          
          // Actualizar el formulario con datos completos del usuario
          setFormData(prev => ({
            ...prev,
            bio: userData.bio || prev.bio || "",
            name: userData.name || prev.name || "",
            username: userData.username || prev.username || "",
            email: userData.email || prev.email || "",
          }));
        }
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
      }
    };
    
    fetchUserDetails();
  }, [session, status, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("La imagen no puede ser mayor a 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        setFormData((prev) => ({
          ...prev,
          image: reader.result as string,
        }));
        toast.success("Imagen seleccionada correctamente");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setSaving(true);

    try {
      // Validaciones básicas
      if (!formData.username || !formData.name) {
        setError("El nombre y el nombre de usuario son obligatorios");
        return;
      }

      // Validación específica para cambio de contraseña
      const isChangingPassword = formData.newPassword && formData.newPassword.trim() !== '';
      
      if (isChangingPassword) {
        // Verificar que se proporcionó la contraseña actual
        if (!formData.password || formData.password.trim() === '') {
          setError("Debes proporcionar tu contraseña actual para poder cambiarla");
          return;
        }
        
        // Verificar que la nueva contraseña y la confirmación coinciden
        if (formData.newPassword !== formData.confirmPassword) {
          setError("Las contraseñas no coinciden");
          return;
        }
        
        // Verificar que la contraseña actual es correcta mediante una solicitud al backend
        const verifyPasswordResponse = await fetch('/api/auth/verify-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: session?.user?.id,
            password: formData.password
          }),
        });
        
        if (!verifyPasswordResponse.ok) {
          const verifyData = await verifyPasswordResponse.json();
          setError(verifyData.error || "La contraseña actual es incorrecta");
          return;
        }
      }

      // Preparar datos para la actualización
      let imageUrl = preview;
      
      // Si hay una nueva imagen en formato base64, subirla
      if (formData.image && formData.image.startsWith('data:image/')) {
        const imageFormData = new FormData();
        const blob = await (await fetch(formData.image)).blob();
        imageFormData.append('file', blob);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Error al subir la imagen');
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.url || uploadData.secure_url || uploadData.public_id;
      }
      
      // Preparar datos para la API
      const updateData = {
        id: session?.user?.id,
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        image: imageUrl,
        email: formData.email, // Incluir el email actual del usuario
      };

      // Añadir contraseña solo si se ha proporcionado y validado
      if (isChangingPassword) {
        Object.assign(updateData, { 
          currentPassword: formData.password,
          newPassword: formData.newPassword 
        });
      }

      // Enviar solicitud a la API para actualizar el usuario
      const response = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el perfil");
      }

      // Actualizar la sesión usando el método update() de NextAuth
      await update({
        user: {
          name: formData.name,
          username: formData.username,
          bio: formData.bio,
          image: imageUrl,
        }
      });
      
      setSuccessMessage("Perfil actualizado correctamente");
      toast.success("Perfil actualizado correctamente. Redirigiendo al dashboard...");
      
      // Redirigir al dashboard después de un breve retraso
      setTimeout(() => {
        router.push('/api/auth/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error("Error en actualización:", error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Error al guardar los cambios";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Editar Perfil</h1>
          <p className="text-muted-foreground">Actualiza tu información personal</p>
        </div>
        <Button variant="outline" onClick={() => router.back()} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Volver
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="mb-6 bg-green-50 text-green-800 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800/30">
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="general" className="text-sm sm:text-base">Información General</TabsTrigger>
            <TabsTrigger value="security" className="text-sm sm:text-base">Contraseña</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Información del Perfil</CardTitle>
                <CardDescription>
                  Actualiza tu información personal y foto de perfil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6">
                  <div className="relative group">
                    <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center">
                      {preview ? (
                        <Image
                          src={preview}
                          alt="Imagen de perfil"
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <UserIcon className="h-16 w-16 text-gray-400" />
                      )}
                    </div>
                    <label
                      htmlFor="profileImage"
                      className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                    >
                      <Camera className="w-8 h-8 text-white" />
                      <span className="sr-only">Cambiar imagen</span>
                    </label>
                    <input
                      id="profileImage"
                      name="profileImage"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="sr-only"
                    />
                  </div>
                  
                  <div className="space-y-5 flex-1">
                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nombre</Label>
                        <Input
                          id="name"
                          name="name"
                          placeholder="Tu nombre"
                          value={formData.name}
                          onChange={handleChange}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="username">Nombre de usuario</Label>
                        <Input
                          id="username"
                          name="username"
                          placeholder="username"
                          value={formData.username}
                          onChange={handleChange}
                          required
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="tu.correo@example.com"
                        value={formData.email}
                        readOnly
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-xs text-muted-foreground">
                        El correo electrónico no se puede modificar.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="bio">Biografía</Label>
                      <Textarea
                        id="bio"
                        name="bio"
                        placeholder="Cuéntanos un poco sobre ti..."
                        value={formData.bio}
                        onChange={handleChange}
                        className="min-h-24"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Cambiar contraseña</CardTitle>
                <CardDescription>
                  Actualiza tu contraseña para mantener tu cuenta segura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña actual</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva contraseña</Label>
                    <Input
                      id="newPassword"
                      name="newPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.newPassword}
                      onChange={handleChange}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar nueva contraseña</Label>
                    <Input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  Deja estos campos en blanco si no deseas cambiar tu contraseña
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-8 flex justify-end">
          <Button
            type="submit"
            className="w-full sm:w-auto flex items-center justify-center gap-2"
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
