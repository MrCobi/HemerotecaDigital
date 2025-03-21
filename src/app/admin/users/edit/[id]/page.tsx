"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button, buttonVariants } from "@/src/app/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/app/components/ui/select";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { CldImage } from "next-cloudinary";

// Definición del tipo de usuario adaptada al esquema actual
type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  username: string | null;
  createdAt: Date;
  updatedAt: Date;
  emailVerified: Date | null;
};

export default function EditUserPage({ params }: { params: { id: string } }) {
  const id = params.id;
  const router = useRouter();
  const [form, setForm] = useState({ 
    name: "", 
    username: "",
    email: "", 
    password: "", 
    role: ""
  });
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [preview, setPreview] = useState("/placeholders/user.png");
  const roles = [
    { value: "user", label: "Usuario" },
    { value: "editor", label: "Editor" },
    { value: "admin", label: "Administrador" },
  ];
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
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
          role: data.role 
        });
        setUserInfo(data);
        if (data.image) setPreview(data.image);
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Error al cargar los datos del usuario. Por favor, inténtalo de nuevo.");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (id) {
      fetchUser();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRoleChange = (value: string) => {
    setForm({ ...form, role: value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
        // Aquí podrías manejar la subida de la imagen
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    setIsSaving(true);
    
    try {
      const updateData = {
        ...form,
        // Si el password está vacío, no lo enviamos
        ...(form.password === "" && { password: undefined })
      };
      
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        setSuccessMessage("Usuario actualizado correctamente");
        setTimeout(() => {
          router.push("/admin/users");
        }, 1500);
      } else {
        const data = await res.json();
        setError(data.error || "Error al actualizar el usuario");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      setError("Ha ocurrido un error al actualizar el usuario");
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
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <CldImage
                    src={preview}
                    alt="Preview"
                    width={128}
                    height={128}
                    className="rounded-full object-cover border-4 border-primary/30"
                  />
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
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                        </svg>
                        Creado: {new Date(userInfo.createdAt).toLocaleDateString()}
                      </p>
                      <p className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                        Última actualización: {new Date(userInfo.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </>
                )}
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
                      <Label htmlFor="imageUpload">Imagen de perfil</Label>
                      <Input
                        id="imageUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="mt-1"
                      />
                    </div>

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
