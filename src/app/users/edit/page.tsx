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
import { Card, CardContent, CardHeader } from "@/src/app/components/ui/card";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { Textarea } from "@/src/app/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
import { User } from "@/src/interface/user";
import { updatePrivacySettings, getUserPrivacySettings } from "@/lib/api";
import type { PrivacySettings } from "@/lib/api";

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
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>({
    showFavorites: false,
    showActivity: false,
  });

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

    // Cargar la configuración de privacidad del usuario
    const loadPrivacySettings = async () => {
      try {
        const settings = await getUserPrivacySettings();
        setPrivacySettings(settings);
        setFormData(prev => ({
          ...prev,
          showFavorites: settings.showFavorites,
          showActivity: settings.showActivity
        }));
      } catch (error) {
        console.error("Error al cargar configuración de privacidad:", error);
      }
    };

    loadPrivacySettings();
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

  const handlePrivacyChange = async (field: keyof PrivacySettings, value: boolean) => {
    const newSettings = {
      ...privacySettings,
      [field]: value
    };
    
    setPrivacySettings(newSettings);
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    try {
      await updatePrivacySettings(newSettings);
      toast.success("Configuración de privacidad actualizada");
    } catch (error) {
      console.error("Error al actualizar la configuración de privacidad:", error);
      toast.error("Error al actualizar la configuración de privacidad");
      
      // Revertir cambios en caso de error
      setPrivacySettings({...privacySettings});
      setFormData(prev => ({
        ...prev,
        [field]: !value
      }));
    }
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

  const handleLogout = () => {
    signOut({ callbackUrl: '/api/auth/signin' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-200/20 dark:bg-blue-400/5 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-100/20 dark:bg-blue-500/5 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {loading ? (
          <div className="flex justify-center items-center min-h-[80vh]">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
        ) : (
          <div className="max-w-4xl mx-auto transition-all duration-300 animate-fadeIn">
            <div className="mb-8 text-center">
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
                Editar Perfil
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
                Personaliza tu información y preferencias
              </p>
              <div className="h-1 w-20 bg-blue-600 dark:bg-blue-500 mx-auto mt-6"></div>
            </div>

            <Card className="shadow-lg backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border-blue-100 dark:border-gray-700 overflow-hidden mb-8">
              <CardHeader className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
                <div className="flex justify-between items-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push("/profile")}
                    className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al perfil
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="mb-8 flex flex-col sm:flex-row items-center sm:items-start gap-8">
                  <div className="relative group">
                    <div className="relative h-36 w-36 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-md hover:shadow-xl transition-all duration-300">
                      {preview ? (
                        <Image
                          src={preview}
                          alt="Previsualización"
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 144px"
                        />
                      ) : formData.image && formData.image.includes('cloudinary') ? (
                        // Si la imagen tiene un formato de Cloudinary público (URL completa)
                        <CldImage
                          src={formData.image}
                          alt={formData.name || "Avatar"}
                          width={144}
                          height={144}
                          crop="fill"
                          gravity="face"
                          className="object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      ) : formData.image && !formData.image.startsWith('/') && !formData.image.startsWith('http') ? (
                        // Si la imagen es un public_id de Cloudinary (sin https:// o /)
                        <CldImage
                          src={formData.image}
                          alt={formData.name || "Avatar"}
                          width={144}
                          height={144}
                          crop="fill"
                          gravity="face"
                          className="object-cover"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      ) : (
                        // Para imágenes locales o fallback
                        <Image
                          src={formData.image || "/images/AvatarPredeterminado.webp"}
                          alt={formData.name || "Avatar"}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 144px"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      )}
                    </div>
                    <label
                      htmlFor="profile-image"
                      className="absolute -bottom-2 -right-2 h-10 w-10 rounded-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 text-white flex items-center justify-center cursor-pointer shadow-lg transform transition-transform duration-300 hover:scale-110"
                    >
                      <Camera className="w-5 h-5" />
                    </label>
                    <input
                      type="file"
                      id="profile-image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </div>

                  <div className="w-full">
                    {error && (
                      <Alert variant="destructive" className="mb-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="ml-2">{error}</AlertDescription>
                      </Alert>
                    )}
                    {successMessage && (
                      <Alert className="mb-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300">
                        <CheckCircle2 className="h-4 w-4" />
                        <AlertDescription className="ml-2">{successMessage}</AlertDescription>
                      </Alert>
                    )}
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <Tabs defaultValue="info" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 mb-4 bg-gray-100 dark:bg-gray-700/50">
                          <TabsTrigger
                            value="info"
                            className="py-2.5 flex items-center justify-center data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500"
                          >
                            Información
                          </TabsTrigger>
                          <TabsTrigger
                            value="security"
                            className="py-2.5 flex items-center justify-center data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500"
                          >
                            Seguridad
                          </TabsTrigger>
                          <TabsTrigger
                            value="privacy"
                            className="py-2.5 flex items-center justify-center data-[state=active]:bg-white dark:data-[state=active]:bg-gray-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500"
                          >
                            Privacidad
                          </TabsTrigger>
                        </TabsList>

                        <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg">
                          <TabsContent value="info" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="name" className="text-gray-700 dark:text-gray-300">Nombre</Label>
                                <Input
                                  id="name"
                                  name="name"
                                  value={formData.name}
                                  onChange={handleChange}
                                  placeholder="Tu nombre completo"
                                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="username" className="text-gray-700 dark:text-gray-300">Nombre de usuario</Label>
                                <Input
                                  id="username"
                                  name="username"
                                  value={formData.username}
                                  onChange={handleChange}
                                  placeholder="username"
                                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Correo electrónico</Label>
                              <Input
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="email@ejemplo.com"
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                                disabled
                              />
                              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No puedes cambiar tu correo electrónico</p>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="bio" className="text-gray-700 dark:text-gray-300">Biografía</Label>
                              <Textarea
                                id="bio"
                                name="bio"
                                value={formData.bio}
                                onChange={handleChange}
                                placeholder="Cuéntanos sobre ti..."
                                className="min-h-[120px] dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                              />
                            </div>
                          </TabsContent>

                          <TabsContent value="security" className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Contraseña actual</Label>
                              <Input
                                id="password"
                                name="password"
                                type="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="••••••••"
                                className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                              />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="newPassword" className="text-gray-700 dark:text-gray-300">Nueva contraseña</Label>
                                <Input
                                  id="newPassword"
                                  name="newPassword"
                                  type="password"
                                  value={formData.newPassword}
                                  onChange={handleChange}
                                  placeholder="••••••••"
                                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300">Confirmar nueva contraseña</Label>
                                <Input
                                  id="confirmPassword"
                                  name="confirmPassword"
                                  type="password"
                                  value={formData.confirmPassword}
                                  onChange={handleChange}
                                  placeholder="••••••••"
                                  className="dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder:text-gray-400"
                                />
                              </div>
                            </div>
                          </TabsContent>

                          <TabsContent value="privacy" className="space-y-4">
                            <div className="space-y-4">
                              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mostrar favoritos</h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Permitir que otros usuarios vean tus fuentes favoritas</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="showFavorites"
                                    checked={privacySettings.showFavorites}
                                    onChange={() => handlePrivacyChange("showFavorites", !privacySettings.showFavorites)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                                <div>
                                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mostrar actividad</h3>
                                  <p className="text-sm text-gray-500 dark:text-gray-400">Mostrar tu actividad reciente en tu perfil</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                  <input
                                    type="checkbox"
                                    name="showActivity"
                                    checked={privacySettings.showActivity}
                                    onChange={() => handlePrivacyChange("showActivity", !privacySettings.showActivity)}
                                    className="sr-only peer"
                                  />
                                  <div className="w-11 h-6 bg-gray-200 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                              </div>
                            </div>
                          </TabsContent>
                        </div>
                      </Tabs>

                      <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                        <Button
                          type="submit"
                          disabled={saving}
                          className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500"
                        >
                          {saving ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Guardando...
                            </>
                          ) : (
                            <>
                              <Save className="mr-2 h-4 w-4" />
                              Guardar cambios
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mt-12">
              <Link href="/profile" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
                <Button variant="outline" className="border-gray-200 dark:border-gray-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Volver al perfil
                </Button>
              </Link>
              
              <Button
                variant="destructive"
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
                disabled={saving}
              >
                Cerrar sesión
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
