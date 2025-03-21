"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/src/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/app/components/ui/select";
import { Loader2, ArrowLeft, Save, UserPlus } from "lucide-react";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { CldUploadWidget } from "next-cloudinary";
import Image from "next/image";
import { SignUpSchema } from "@/lib/zod";
import { z } from "zod";
import { CldImage } from "next-cloudinary";

// Esquema extendido para incluir el rol para administradores
const AdminUserSchema = SignUpSchema.extend({
  role: z.enum(["user", "admin"])
});

type AdminUserFormData = z.infer<typeof AdminUserSchema>;

export default function CreateUserPage() {
  const router = useRouter();
  const [form, setForm] = useState<AdminUserFormData>({ 
    name: "", 
    username: "",
    email: "", 
    password: "", 
    role: "user",
    image: "",
    bio: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const roles = [
    { value: "user", label: "Usuario" },
    { value: "admin", label: "Administrador" },
  ];
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear field-specific error when user edits the field
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const handleRoleChange = (value: string) => {
    if (value === "user" || value === "admin") {
      setForm({ ...form, role: value as "user" | "admin" });
    }
  };

  const validateForm = () => {
    try {
      // Si se ha subido una imagen, usar esa URL en lugar de la predeterminada
      const formDataToValidate = {
        ...form,
        image: imageUrl || form.image
      };
      
      // Validar con Zod
      AdminUserSchema.parse(formDataToValidate);
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccessMessage("");
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Preparar los datos del usuario
      const userData = {
        name: form.name,
        username: form.username,
        email: form.email,
        password: form.password, 
        image: imageUrl || "",
        bio: form.bio || null,
        role: form.role
      };
      
      const res = await fetch(`/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(userData),
      });

      if (res.ok) {
        setSuccessMessage("Usuario creado correctamente");
        setTimeout(() => {
          router.push("/admin/users");
        }, 1500);
      } else {
        const data = await res.json();
        
        if (data.error.includes("nombre de usuario")) {
          setErrors({ username: "El nombre de usuario ya está en uso" });
        } else if (data.error.includes("correo electrónico")) {
          setErrors({ email: "El correo electrónico ya está registrado" });
        } else {
          setErrors({ form: data.error || "Error al crear el usuario" });
        }
      }
    } catch (error) {
      console.error("Error creating user:", error);
      setErrors({ form: "Ha ocurrido un error al crear el usuario" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Crear Nuevo Usuario</h1>
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
                <div className="relative w-32 h-32 mx-auto mb-4">
                  {imageUrl && imageUrl.includes('cloudinary') ? (
                    // Si la imagen tiene un formato de Cloudinary público (URL completa)
                    <CldImage
                      src={imageUrl}
                      alt="Preview"
                      width={128}
                      height={128}
                      crop="fill"
                      gravity="face"
                      className="rounded-full object-cover border-4 border-primary/30"
                      priority
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : imageUrl && !imageUrl.startsWith('/') && !imageUrl.startsWith('http') ? (
                    // Si la imagen es un public_id de Cloudinary (sin https:// o /)
                    <CldImage
                      src={imageUrl}
                      alt="Preview"
                      width={128}
                      height={128}
                      crop="fill"
                      gravity="face"
                      className="rounded-full object-cover border-4 border-primary/30"
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : (
                    // Para imágenes locales o fallback
                    <Image
                      src="/images/AvatarPredeterminado.webp"
                      alt="Imagen de perfil predeterminada"
                      width={128}
                      height={128}
                      className="rounded-full object-cover border-4 border-primary/30"
                      priority
                      onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  )}
                </div>
                <div className="mb-6">
                  <CldUploadWidget
                    uploadPreset="hemeroteca_users"
                    onSuccess={(result: any) => {
                      setImageUrl(result.info.secure_url);
                    }}
                  >
                    {({ open }) => (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => open()}
                        className="w-full"
                      >
                        Subir Imagen
                      </Button>
                    )}
                  </CldUploadWidget>
                </div>
                <div className="text-sm text-muted-foreground">
                  <p>La imagen de perfil es opcional.</p>
                  <p>Formatos aceptados: JPG, PNG.</p>
                </div>
              </div>
            </div>

            {/* Panel de formulario */}
            <div className="md:w-2/3 p-6">
              {errors.form && (
                <Alert className="mb-6 border-destructive bg-destructive/10">
                  <AlertDescription className="text-destructive">
                    {errors.form}
                  </AlertDescription>
                </Alert>
              )}

              {successMessage && (
                <Alert className="mb-6 border-green-500 bg-green-50">
                  <AlertDescription className="text-green-700">
                    {successMessage}
                  </AlertDescription>
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre <span className="text-red-500">*</span></Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="Nombre completo"
                      required
                      className={errors.name ? "border-red-500" : ""}
                    />
                    {errors.name && (
                      <p className="text-xs text-red-500 mt-1">{errors.name}</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="username">Nombre de usuario <span className="text-red-500">*</span></Label>
                    <Input
                      id="username"
                      name="username"
                      value={form.username}
                      onChange={handleChange}
                      placeholder="Nombre de usuario (solo letras, números y _)"
                      required
                      className={errors.username ? "border-red-500" : ""}
                    />
                    {errors.username && (
                      <p className="text-xs text-red-500 mt-1">{errors.username}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Correo electrónico <span className="text-red-500">*</span></Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      placeholder="correo@ejemplo.com"
                      required
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-xs text-red-500 mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Contraseña <span className="text-red-500">*</span></Label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className={errors.password ? "border-red-500" : ""}
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500 mt-1">{errors.password}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Rol <span className="text-red-500">*</span></Label>
                    <Select
                      value={form.role}
                      onValueChange={handleRoleChange}
                    >
                      <SelectTrigger id="role" className="w-full">
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Biografía</Label>
                    <Input
                      id="bio"
                      name="bio"
                      value={form.bio || ""}
                      onChange={handleChange}
                      placeholder="Breve descripción (opcional)"
                      className={errors.bio ? "border-red-500" : ""}
                    />
                    {errors.bio && (
                      <p className="text-xs text-red-500 mt-1">{errors.bio}</p>
                    )}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button type="submit" disabled={isLoading} className="gap-2">
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    {isLoading ? "Guardando..." : "Crear Usuario"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
