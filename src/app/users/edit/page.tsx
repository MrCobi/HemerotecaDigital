"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import Image from "next/image";
import { CldImage } from 'next-cloudinary';
import { toast } from "sonner";
import {
  ArrowLeft,
  Camera,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from "lucide-react";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/src/app/components/ui/card";
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
    showFavorites: false,
    showActivity: false,
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
      showFavorites: false,
      showActivity: false,
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

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccessMessage("");
    
    try {
      // Validar campos requeridos
      if (!formData.name || !formData.username) {
        setError("Los campos Nombre y Nombre de usuario son obligatorios");
        setSaving(false);
        return;
      }

      // Validar que el nombre de usuario sea válido (solo letras, números y guiones bajos)
      const usernameRegex = /^[a-zA-Z0-9_]+$/;
      if (!usernameRegex.test(formData.username)) {
        setError("El nombre de usuario solo puede contener letras, números y guiones bajos (_)");
        setSaving(false);
        return;
      }

      // Validar que las contraseñas coincidan si se intenta cambiar
      if (formData.newPassword && formData.newPassword !== formData.confirmPassword) {
        setError("Las contraseñas no coinciden");
        setSaving(false);
        return;
      }
      
      // Validar longitud de contraseña
      if (formData.newPassword && (formData.newPassword.length < 6 || formData.newPassword.length > 32)) {
        setError("La contraseña debe tener entre 6 y 32 caracteres");
        setSaving(false);
        return;
      }
      
      const isChangingPassword = Boolean(formData.newPassword && formData.password);
      
      // Si se está cambiando la contraseña, verificar la contraseña actual
      if (isChangingPassword) {
        console.log("Verificando contraseña actual antes de actualizar");
        const verifyResponse = await fetch("/api/auth/verify-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: formData.password, userId: session?.user?.id }),
        });
        
        const verifyData = await verifyResponse.json();
        
        if (!verifyResponse.ok) {
          console.error("Error al verificar contraseña:", verifyData.error);
          setError(verifyData.error || "No se ha podido verificar la contraseña actual");
          setSaving(false);
          return;
        }
        
        if (!verifyData.success) {
          console.error("Contraseña actual incorrecta");
          setError("La contraseña actual es incorrecta");
          setSaving(false);
          return;
        }
        
        console.log("Contraseña verificada correctamente");
      }
      
      // Preparar datos a actualizar
      const formDataToUpdate: {
        name: string;
        username: string;
        bio: string | null;
        image: string | null;
        currentPassword?: string;
        newPassword?: string;
      } = {
        name: formData.name,
        username: formData.username,
        bio: formData.bio,
        image: formData.image,
      };
      
      // Solo incluir contraseñas si se están cambiando
      if (isChangingPassword) {
        // Cambiamos los nombres para asegurar compatibilidad con el endpoint
        formDataToUpdate.currentPassword = formData.password;
        formDataToUpdate.newPassword = formData.newPassword;
        console.log("Enviando datos de cambio de contraseña:", { 
          currentPassword: "***", 
          newPassword: "***" 
        });
      }
      
      console.log("Enviando solicitud de actualización para el usuario:", session?.user?.id);
      console.log("Datos a actualizar:", formDataToUpdate);
      
      const updateResponse = await fetch(`/api/users/${session?.user?.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formDataToUpdate),
      });
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error("Error response from server:", errorText);
        
        let errorMessage = "Error al actualizar perfil";
        try {
          if (errorText) {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.error || errorMessage;
          }
        } catch (e) {
          console.error("Error parsing error response:", e);
        }
        
        setError(errorMessage);
        setSaving(false);
        return;
      }
      
      const responseData = await updateResponse.json();
      console.log("Perfil actualizado exitosamente:", responseData);
      
      // Actualizar la sesión si es necesario
      if (isChangingPassword) {
        console.log("Contraseña actualizada, se requerirá iniciar sesión nuevamente");
        setSuccessMessage("Perfil actualizado correctamente. Se te redirigirá al inicio de sesión en unos segundos...");
        
        // Esperar un momento y luego cerrar la sesión
        setTimeout(() => {
          signOut({ callbackUrl: '/api/auth/signin' });
        }, 3000);
      } else {
        setSuccessMessage("Perfil actualizado correctamente");
        
        // Actualizar datos del formulario con la respuesta
        setFormData(prev => ({
          ...prev,
          name: responseData.name || prev.name,
          username: responseData.username || prev.username,
          bio: responseData.bio || prev.bio,
          image: responseData.image || prev.image,
          password: "",
          newPassword: "",
          confirmPassword: "",
        }));
        
        // Actualizar la sesión
        update();
      }
    } catch (error) {
      console.error("Error en la actualización de perfil:", error);
      setError("Ha ocurrido un error al actualizar el perfil");
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pt-10 pb-20">
      <div className="container max-w-4xl mx-auto px-4">
        <Link
          href="/api/auth/dashboard"
          className="text-primary inline-flex items-center mb-6 transition-all hover:text-primary/80"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver al Dashboard
        </Link>

        <h1 className="text-3xl font-bold mb-8 text-center text-gray-800 dark:text-white">
          Editar Perfil
        </h1>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {successMessage && (
          <Alert variant="default" className="mb-6 bg-green-50 border-green-500 text-green-700 dark:bg-green-900/50 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <Card className="shadow-md border-gray-200 dark:border-gray-800">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center justify-between">
                <div className="text-center sm:text-left mb-4 sm:mb-0">
                  <CardTitle className="text-gray-800 dark:text-white">
                    Tu información personal
                  </CardTitle>
                  <CardDescription className="text-gray-500 dark:text-gray-400">
                    Actualiza tus datos y personaliza tu perfil
                  </CardDescription>
                </div>
                
                <div className="text-center relative">
                  <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-md mb-2">
                    {preview ? (
                      <Image
                        src={preview}
                        alt="Perfil"
                        fill
                        className="object-cover"
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    ) : formData.image && formData.image.includes('cloudinary') ? (
                      <CldImage
                        src={formData.image}
                        alt={formData.name || "Avatar"}
                        width={96}
                        height={96}
                        crop="fill"
                        gravity="face"
                        className="object-cover"
                        priority
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    ) : formData.image && !formData.image.startsWith('/') && !formData.image.startsWith('http') ? (
                      <CldImage
                        src={formData.image}
                        alt={formData.name || "Avatar"}
                        width={96}
                        height={96}
                        crop="fill"
                        gravity="face"
                        className="object-cover"
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    ) : (
                      <Image
                        src={formData.image || "/images/AvatarPredeterminado.webp"}
                        alt={formData.name || "Avatar"}
                        width={96}
                        height={96}
                        className="object-cover"
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    )}
                  </div>
                  <label htmlFor="image-upload" className="cursor-pointer flex justify-center">
                    <div className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 shadow-lg transform translate-x-3 translate-y-3">
                      <Camera className="w-4 h-4" />
                    </div>
                    <input 
                      id="image-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden"
                      onChange={handleImageChange}
                    />
                  </label>
                  <p className="text-xs text-gray-500 mt-2">
                    Haz clic en el icono para cambiar tu foto
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 p-6">
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-8">
                  <TabsTrigger value="general" className="text-sm sm:text-base">Información General</TabsTrigger>
                  <TabsTrigger value="security" className="text-sm sm:text-base">Contraseña</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general">
                  <div className="space-y-5">
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
                </TabsContent>
                
                <TabsContent value="security">
                  <div className="space-y-5">
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
                  </div>
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
            </CardContent>
          </form>
        </Card>
      </div>
    </div>
  );
}
