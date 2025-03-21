"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Badge } from "@/src/app/components/ui/badge";
import { User, Settings, Clock, Mail, CalendarDays, Shield, Hash, MessageCircle, Star, BookMarked, Send, Inbox, UserCheck } from "lucide-react";
import { CldImage } from "next-cloudinary";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

type UserData = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  username: string | null;
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  _count: {
    comments: number;
    ratings: number;
    favoriteSources: number;
    sentMessages: number;
    receivedMessages: number;
    accounts: number;
  };
};

const roleBadgeStyles = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  editor: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  user: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
};

export default function UserViewPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function getParamId() {
      try {
        const parameters = await params;
        setId(parameters.id);
      } catch (err) {
        console.error("Error al obtener ID de parámetros:", err);
        setError("Error al cargar la página");
        setLoading(false);
      }
    }
    
    getParamId();
  }, [params]);

  useEffect(() => {
    if (!id) return;
    
    async function fetchUser() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/users/${id}`);
        
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/api/auth/signin");
            return;
          }
          
          if (res.status === 403) {
            router.push("/acceso-denegado");
            return;
          }
          
          throw new Error(`Error: ${res.status}`);
        }
        
        const userData = await res.json();
        setUser(userData);
      } catch (err) {
        console.error("Error fetching user:", err);
        setError("Error al cargar los datos del usuario");
      } finally {
        setLoading(false);
      }
    }
    
    fetchUser();
  }, [id, router]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Usuario no encontrado</h2>
          <p className="text-muted-foreground">El usuario que estás buscando no existe o ha sido eliminado.</p>
          <button 
            onClick={() => router.push("/admin/users")}
            className="mt-4 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md"
          >
            Volver a usuarios
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-foreground">Perfil de Usuario</h1>
          <div className="flex space-x-2">
            <Link
              href="/admin/users"
              className="px-4 py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md transition-colors"
            >
              Volver
            </Link>
            <Link
              href={`/admin/users/edit/${user.id}`}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
            >
              Editar Usuario
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          <div className="md:flex">
            {/* Panel lateral izquierdo */}
            <div className="md:w-1/3 bg-primary/10 p-6">
              <div className="text-center">
                <div className="relative w-32 h-32 mx-auto mb-4">
                  <CldImage
                    src={user.image || "/placeholders/user.png"}
                    alt={user.name || "Usuario"}
                    width={128}
                    height={128}
                    className="rounded-full object-cover border-4 border-primary/30"
                  />
                  <Badge className={`absolute bottom-0 right-0 ${
                    roleBadgeStyles[user.role as keyof typeof roleBadgeStyles] || roleBadgeStyles.user
                  }`}>
                    {user.role === "admin" ? "Administrador" : 
                     user.role === "editor" ? "Editor" : "Usuario"}
                  </Badge>
                </div>
                <h2 className="text-xl font-semibold mb-1">{user.name}</h2>
                <p className="text-sm text-muted-foreground mb-4">@{user.username || user.id.substring(0, 8)}</p>
                
                <div className="space-y-3 text-left text-sm">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>{user.email}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <CalendarDays className="w-4 h-4 mr-2 text-muted-foreground" />
                    <span>Registrado {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: es })}</span>
                  </div>
                  
                  {user.emailVerified && (
                    <div className="flex items-center">
                      <UserCheck className="w-4 h-4 mr-2 text-green-500" />
                      <span className="text-green-500">Email verificado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="md:w-2/3 p-6">
              <Tabs defaultValue="activity">
                <TabsList className="mb-4">
                  <TabsTrigger value="activity" className="data-[state=active]:bg-primary/10">
                    <Clock className="w-4 h-4 mr-2" />
                    Actividad
                  </TabsTrigger>
                  <TabsTrigger value="details" className="data-[state=active]:bg-primary/10">
                    <User className="w-4 h-4 mr-2" />
                    Detalles
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10">
                    <Settings className="w-4 h-4 mr-2" />
                    Configuración
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="activity" className="space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Estadísticas de actividad</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30 mr-3">
                          <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Comentarios</p>
                          <p className="font-medium">{user._count.comments}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 mr-3">
                          <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Valoraciones</p>
                          <p className="font-medium">{user._count.ratings}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-indigo-100 dark:bg-indigo-900/30 mr-3">
                          <BookMarked className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fuentes favoritas</p>
                          <p className="font-medium">{user._count.favoriteSources}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center">
                        <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30 mr-3">
                          <Inbox className="w-4 h-4 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mensajes recibidos</p>
                          <p className="font-medium">{user._count.receivedMessages}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="details">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle>Información detallada</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">ID</p>
                          <p className="font-medium break-all">{user.id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre</p>
                          <p className="font-medium">{user.name || "No establecido"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Nombre de usuario</p>
                          <p className="font-medium">{user.username || "No establecido"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Email</p>
                          <p className="font-medium">{user.email}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Rol</p>
                          <p className="font-medium capitalize">{user.role}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Verificado</p>
                          <p className="font-medium">{user.emailVerified ? "Sí" : "No"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Fecha de creación</p>
                          <p className="font-medium">{new Date(user.createdAt).toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Última actualización</p>
                          <p className="font-medium">{new Date(user.updatedAt).toLocaleString()}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Opciones de administración</CardTitle>
                      <CardDescription>Gestionar cuenta y permisos del usuario</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <Link
                          href={`/admin/users/edit/${user.id}`}
                          className="flex items-center p-3 rounded-lg border border-input hover:bg-muted/50 transition-colors"
                        >
                          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30 mr-3">
                            <Settings className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          </div>
                          <div>
                            <p className="font-medium">Editar perfil</p>
                            <p className="text-sm text-muted-foreground">Modificar datos y preferencias</p>
                          </div>
                        </Link>
                        
                        <button 
                          className="flex items-center p-3 rounded-lg border border-input hover:bg-destructive/10 transition-colors text-left"
                        >
                          <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 mr-3">
                            <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                          </div>
                          <div>
                            <p className="font-medium">Restablecer contraseña</p>
                            <p className="text-sm text-muted-foreground">Enviar email para resetear contraseña</p>
                          </div>
                        </button>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between border-t pt-4">
                      <button
                        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                        // onClick={handleDeleteUser}
                      >
                        Eliminar usuario
                      </button>
                      <button
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                      >
                        Guardar cambios
                      </button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
