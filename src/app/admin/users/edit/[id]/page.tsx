"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { CldImage } from "next-cloudinary";
import { Button, buttonVariants } from "@/src/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/app/components/ui/select";
import { Loader2, ArrowLeft, Save, ImageIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { toast } from "sonner";

// Definición del tipo de usuario adaptada al esquema actual
type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  username: string | null;
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  bio: string | null;
  showActivity: boolean;
  showFavorites: boolean;
};

export default function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "",
    bio: "",
    showActivity: true,
    showFavorites: true
  });
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const roles = [
    { value: "user", label: "Usuario" },
    { value: "editor", label: "Editor" },
    { value: "admin", label: "Administrador" },
  ];
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Manejador de cambio de archivo
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Verificar que sea un archivo de imagen
      if (!selectedFile.type.startsWith('image/')) {
        setUploadError('Solo se permiten archivos de imagen');
        toast.error('Solo se permiten archivos de imagen');
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
      setUploadError(null);
      toast.info('Imagen seleccionada. Guarde para aplicar los cambios.');
    }
  }, []);

  // Función para subir archivo
  const uploadFile = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("file", file);

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
            // Construir la URL completa a partir del public_id
            const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'demo';
            const fullUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${response.url}`;
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

  // Obtener el ID de los parámetros (que ahora son una Promise)
  useEffect(() => {
    async function getParamId() {
      try {
        const parameters = await params;
        setId(parameters.id);
      } catch (err) {
        console.error("Error al obtener ID de parámetros:", err);
        setError("Error al cargar la página");
        setIsLoading(false);
      }
    }

    getParamId();
  }, [params]);

  useEffect(() => {
    if (!id) return;

    async function fetchUser() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/admin/users/${id}`);

        if (!res.ok) {
          throw new Error(`Error: ${res.status}`);
        }

        const data = await res.json();
        setForm({
          name: data.name || "",
          username: data.username || "",
          email: data.email,
          password: "",
          role: data.role,
          bio: data.bio || "",
          showActivity: data.showActivity !== undefined ? data.showActivity : true,
          showFavorites: data.showFavorites !== undefined ? data.showFavorites : true
        });
        setUserInfo(data);
        if (data.image) {
          setPreview(data.image);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Error al cargar los datos del usuario. Por favor, inténtalo de nuevo.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchUser();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setForm({ ...form, role: value });
  };

  const handleToggleChange = (name: string, value: boolean) => {
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSaving(true);

    try {
      // Validar campos requeridos
      if (!form.name || !form.email || !form.username) {
        setError("Los campos Nombre, Email y Nombre de usuario son obligatorios");
        setIsSaving(false);
        return;
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        setError("El formato del email es inválido");
        setIsSaving(false);
        return;
      }

      // Validar longitud de contraseña si se está cambiando
      if (form.password && (form.password.length < 6 || form.password.length > 32)) {
        setError("La contraseña debe tener entre 6 y 32 caracteres");
        setIsSaving(false);
        return;
      }
      
      let imageUrl = null;
      
      // Si hay un archivo nuevo, subirlo
      if (file) {
        try {
          imageUrl = await uploadFile(file);
        } catch (uploadError) {
          console.error("Error al subir imagen:", uploadError);
          toast.error("Error al subir la imagen. Intentando guardar sin imagen.");
        }
      } else if (preview) {
        // Mantener la imagen actual si existe y no hay un nuevo archivo
        imageUrl = preview;
      }
      
      const updateData = {
        ...form,
        // Para contraseñas, solo enviamos newPassword si hay contraseña
        ...(form.password === "" ? { password: undefined } : { newPassword: form.password }),
        // Incluir la URL de la imagen
        image: imageUrl
      };

      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setSuccessMessage("Usuario actualizado correctamente");
        toast.success("Usuario actualizado con éxito");
        setTimeout(() => {
          router.push("/admin/users");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Error al actualizar el usuario");
        toast.error(data.error || "Error al actualizar el usuario");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setError("Ha ocurrido un error al actualizar el usuario");
      toast.error("Ha ocurrido un error al actualizar el usuario");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Editar Usuario</h1>
          <Button
            type="button"
            className={`flex items-center gap-2 ${buttonVariants({ variant: "outline" })}`}
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
            Volver
          </Button>
        </div>

        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          <div className="md:flex">
            {/* Panel lateral izquierdo */}
            <div className="md:w-1/3 bg-primary/10 p-6">
              <div className="text-center">
                <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-md">
                  {preview ? (
                    <Image
                      src={preview}
                      alt="Vista previa"
                      fill
                      className="object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : userInfo?.image && userInfo.image.includes('cloudinary') ? (
                    <CldImage
                      src={userInfo.image}
                      alt={userInfo.name || "Avatar"}
                      width={128}
                      height={128}
                      crop="fill"
                      gravity="face"
                      className="object-cover"
                      priority
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : userInfo?.image && !userInfo.image.startsWith('/') && !userInfo.image.startsWith('http') ? (
                    <CldImage
                      src={userInfo.image}
                      alt={userInfo.name || "Avatar"}
                      width={128}
                      height={128}
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
                      src={userInfo?.image || "/images/AvatarPredeterminado.webp"}
                      alt="Avatar"
                      fill
                      className="object-cover"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  )}
                </div>
                {userInfo && (
                  <>
                    <h2 className="text-xl font-semibold mb-2">{userInfo.name}</h2>
                    <p className="text-muted-foreground text-sm mb-4">
                      ID: {userInfo.id.substring(0, 8)}...
                    </p>
                    <div className="space-y-2 text-left text-sm">
                      <p className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
                        </svg>
                        Creado: {new Date(userInfo.createdAt).toLocaleDateString()}
                      </p>
                      <p className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Última actualización: {new Date(userInfo.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <div className="mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="flex flex-col items-center space-y-3">
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                    
                    {uploadProgress > 0 && (
                      <div className="bg-primary/10 text-primary p-2 rounded-md">
                        Subiendo imagen... {uploadProgress}%
                      </div>
                    )}
                    {uploadError && (
                      <div className="bg-destructive/10 text-destructive p-2 rounded-md">
                        {uploadError}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Imagen recomendada: cuadrada, mínimo 200x200px. Formatos aceptados: JPG, PNG.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Formulario lado derecho */}
            <div className="md:w-2/3 p-6">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="mb-4 border-green-500 text-green-500">
                  <AlertDescription>{successMessage}</AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Información personal</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="name">Nombre completo</Label>
                      <Input
                        id="name"
                        type="text"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label htmlFor="username">Nombre de usuario</Label>
                      <Input
                        id="username"
                        type="text"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">Correo electrónico</Label>
                      <Input
                        id="email"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        className="mt-1"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="bio">Biografía</Label>
                      <Input
                        id="bio"
                        type="text"
                        name="bio"
                        value={form.bio}
                        onChange={handleChange}
                        className="mt-1"
                        placeholder="Biografía del usuario (opcional)"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showActivity"
                        checked={form.showActivity}
                        onChange={(e) => handleToggleChange("showActivity", e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="showActivity">Mostrar actividad públicamente</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="showFavorites"
                        checked={form.showFavorites}
                        onChange={(e) => handleToggleChange("showFavorites", e.target.checked)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <Label htmlFor="showFavorites">Mostrar favoritos públicamente</Label>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Seguridad y permisos</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="password">Nueva Contraseña (Opcional)</Label>
                      <Input
                        id="password"
                        type="password"
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        className="mt-1"
                        placeholder="Dejar en blanco para mantener la actual"
                      />
                    </div>

                    <div>
                      <Label htmlFor="role">Rol</Label>
                      <Select
                        value={form.role}
                        onValueChange={handleRoleChange}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Seleccionar rol" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-4 pt-4">
                    <Button
                      type="button"
                      className={buttonVariants({ variant: "outline" })}
                      onClick={() => router.back()}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      {isSaving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
