"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Image from "next/image";

// Definición del tipo de usuario adaptada al esquema actual
type User = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: "ADMIN" | "EDITOR" | "USER";
  createdAt: Date;
  updatedAt: Date;
  emailVerified: Date | null;
};

export default function EditUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const [form, setForm] = useState({ 
    name: "", 
    email: "", 
    password: "", 
    role: "USER" as "ADMIN" | "EDITOR" | "USER"
  });
  const [userInfo, setUserInfo] = useState<User | null>(null);
  const [preview, setPreview] = useState("/placeholders/user.png");
  const roles = [
    { value: "USER", label: "Usuario" },
    { value: "EDITOR", label: "Editor" },
    { value: "ADMIN", label: "Administrador" },
  ];
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function fetchUser() {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/users/${id}`);
        if (res.ok) {
          const data = await res.json();
          setForm({ 
            name: data.name || "", 
            email: data.email, 
            password: "", 
            role: data.role 
          });
          setUserInfo(data);
          if (data.image) setPreview(data.image);
        } else {
          setError("No se pudo cargar la información del usuario");
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        setError("Error al cargar los datos del usuario");
      } finally {
        setIsLoading(false);
      }
    }
    
    if (id) {
      fetchUser();
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
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
    
    try {
      const updateData = {
        ...form,
        // Si el password está vacío, no lo enviamos
        ...(form.password === "" && { password: undefined })
      };
      
      const res = await fetch(`/api/users/${id}`, {
        method: "PUT",
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
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
          >
            Volver
          </button>
        </div>

        <div className="bg-card rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            {/* Panel lateral izquierdo */}
            <div className="md:w-1/3 bg-primary/10 p-8">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <Image
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
                      ID: {userInfo.id}
                    </p>
                    <div className="space-y-2 text-left text-sm">
                      <p className="flex items-center">
                        <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
                        </svg>
                        Creado: {new Date(userInfo.createdAt).toLocaleDateString()}
                      </p>
                      {userInfo.updatedAt && (
                        <p className="flex items-center">
                          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                          </svg>
                          Última actualización: {new Date(userInfo.updatedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Formulario lado derecho */}
            <div className="md:w-2/3 p-8">
              {error && (
                <div className="mb-4 p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-destructive text-sm">{error}</p>
                </div>
              )}
              
              {successMessage && (
                <div className="mb-4 p-4 bg-green-500/10 border border-green-500 rounded-lg">
                  <p className="text-green-500 text-sm">{successMessage}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Imagen de perfil
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-sm text-muted-foreground
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-primary/10 file:text-primary
                        hover:file:bg-primary/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nombre completo
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Nueva Contraseña (Opcional)
                    </label>
                    <input
                      type="password"
                      name="password"
                      value={form.password}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                      placeholder="Dejar en blanco para mantener la actual"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Rol
                    </label>
                    <select
                      name="role"
                      value={form.role}
                      onChange={handleChange}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg text-foreground focus:outline-none focus:border-primary"
                    >
                      {roles.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => router.back()}
                    className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}