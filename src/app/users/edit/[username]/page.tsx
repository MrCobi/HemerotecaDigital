"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { User } from "@/src/interface/user";
import { Button } from "@/src/app/components/ui/button";
import { Input } from "@/src/app/components/ui/input";
import { Label } from "@/src/app/components/ui/label";
import { Card } from "@/src/app/components/ui/card";
import {
  ArrowLeft,
  Camera,
  Loader2,
  User as UserIcon,
  CheckCircle2,
  Key,
  UserCircle2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { toast } from "sonner";
import Image from "next/image";
import { API_ROUTES } from "@/src/config/api-routes";
import { CldImage } from 'next-cloudinary';

export default function EditUserPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const params = useParams();
  const username = params.username as string;

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    image: "",
  });

  useEffect(() => {
    if (status === "loading") return;

    if (status === "unauthenticated" || !session?.user) {
      setError("Usuario no autenticado");
      setLoading(false);
      return;
    }

    if (session.user.username !== username) {
      setError("No tienes permisos para editar este perfil");
      setLoading(false);
      return;
    }

    if (status === "authenticated") {
      setUser(session.user as User);
      setFormData({
        name: session.user.name || "",
        username: session.user.username || "",
        password: "",
        image: session.user.image || "",
      });
      setLoading(false);
    }
  }, [session, status, username]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setFormData((prev) => ({
          ...prev,
          image: reader.result as string,
        }));
        toast.success("Imagen actualizada correctamente");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let imageUrl = formData.image;
      
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        const imageFormData = new FormData();
        const blob = await (await fetch(imageUrl)).blob();
        imageFormData.append('file', blob);
        
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: imageFormData,
        });
        
        if (!uploadResponse.ok) {
          throw new Error('Error al subir la imagen');
        }
        
        const uploadData = await uploadResponse.json();
        imageUrl = uploadData.public_id;
      }
      
      if (!user?.id) {
        throw new Error("No se pudo identificar al usuario");
      }
      
      const response = await fetch(API_ROUTES.users.crud.update(user.id), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: user.id,
          name: formData.name,
          username: formData.username,
          password: formData.password || undefined,
          image: imageUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al actualizar el perfil");
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          username: formData.username,
          image: imageUrl,
        },
      });

      toast.success("Perfil actualizado correctamente");
      router.push(`/users/${formData.username}`);
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
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex justify-center items-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
          <div className="mt-4">
            <Button asChild variant="outline">
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => router.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>

        <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0 p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Editar perfil
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Actualiza tu información personal
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Sección de imagen de perfil */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl transition-all duration-300">
                    {formData.image && (formData.image.includes('cloudinary') || 
                    (!formData.image.startsWith('/') && !formData.image.startsWith('http') && !formData.image.startsWith('data:'))) ? (
                      <CldImage
                        src={formData.image}
                        alt={user?.name || "Avatar"}
                        width={200}
                        height={200}
                        crop="fill"
                        gravity="face"
                        className="object-cover w-full h-full"
                        priority
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    ) : (
                      <Image
                        src={formData.image || "/images/AvatarPredeterminado.webp"}
                        alt={user?.name || "Avatar"}
                        width={200}
                        height={200}
                        className="object-cover w-full h-full"
                        priority
                        onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/images/AvatarPredeterminado.webp";
                        }}
                      />
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <input
                      type="file"
                      id="image"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      size="sm"
                      className="rounded-full"
                      onClick={() => document.getElementById("image")?.click()}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Cambiar foto
                    </Button>
                  </div>
                </div>
              </div>

              {/* Campos del formulario */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center">
                    <UserIcon className="h-4 w-4 mr-2" />
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Tu nombre completo"
                    className="border-gray-300 dark:border-gray-700"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="username" className="flex items-center">
                    <UserCircle2 className="h-4 w-4 mr-2" />
                    Nombre de usuario
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    placeholder="Nombre de usuario único"
                    className="border-gray-300 dark:border-gray-700"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center">
                    <Key className="h-4 w-4 mr-2" />
                    Contraseña (dejar en blanco para mantener la actual)
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="border-gray-300 dark:border-gray-700"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-center mt-6">
              <Button
                type="submit"
                className="w-full md:w-auto px-8"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Guardar cambios
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}