"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { User} from "@/src/interface/user";
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
  Mail,
  Key,
  UserCircle2,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { toast } from "sonner";
import Image from "next/image";

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
    if (status === "loading") return; // Esperar a que termine la carga

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

    // Solo inicializar cuando la sesión esté disponible
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
  }, [session, status, username]); // Añade status a las dependencias

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
    setError("");
    setSaving(true);

    try {
      const response = await fetch(`/api/users/${session?.user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          password: formData.password || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Error actualizando usuario");
      }

      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name,
          username: formData.username,
          image: formData.image,
        },
      });

      toast.success("Perfil actualizado correctamente");
      router.push("/dashboard");
    } catch (error: unknown) {
      setError("Error al guardar los cambios");
      toast.error(
        error instanceof Error
          ? error.message
          : "Error desconocido al actualizar el perfil"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent dark:border-blue-400"></div>
          <p className="mt-4 text-blue-800 dark:text-blue-300 font-medium">
            Cargando perfil...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20 p-8 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        <Link
          href="/api/auth/dashboard"
          className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors mb-8"
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Volver al dashboard
        </Link>

        <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0">
          <div className="p-6 sm:p-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8 flex items-center">
              <UserCircle2 className="h-8 w-8 mr-3 text-blue-600 dark:text-blue-400" />
              Editar Perfil
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Profile Image Section */}
              <div className="flex flex-col items-center space-y-4">
                <div className="relative group">
                  <div className="relative w-48 h-48 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl transition-all duration-300">
                    <Image
                      src={
                        formData.image || "/images/AvatarPredeterminado.webp"
                      }
                      alt={user?.name || "Avatar"}
                      layout="fill"
                      className="object-cover"
                      priority
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
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
                      variant="secondary"
                      size="sm"
                      onClick={() => document.getElementById("image")?.click()}
                      className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-lg"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Cambiar foto
                    </Button>
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label
                    htmlFor="name"
                    className="text-gray-700 dark:text-gray-300 flex items-center"
                  >
                    <UserIcon className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    Nombre completo
                  </Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="Tu nombre completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label
                    htmlFor="username"
                    className="text-gray-700 dark:text-gray-300 flex items-center"
                  >
                    <Mail className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    Nombre de usuario
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="@username"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label
                    htmlFor="password"
                    className="text-gray-700 dark:text-gray-300 flex items-center"
                  >
                    <Key className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                    Nueva contraseña
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400"
                    placeholder="Dejar en blanco para mantener la actual"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-6">
                <Button
                  type="submit"
                  disabled={saving}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]"
                >
                  {saving ? (
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                  )}
                  {saving ? "Guardando cambios..." : "Guardar cambios"}
                </Button>
              </div>
            </form>
          </div>
        </Card>
      </div>
    </div>
  );
}
