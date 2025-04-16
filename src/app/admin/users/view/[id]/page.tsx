"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { es } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/app/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/src/app/components/ui/card";
import { Badge } from "@/src/app/components/ui/badge";
import { 
  User, Settings, Clock, Mail, CalendarDays, Shield, MessageCircle, 
  Star, BookMarked, Inbox, UserCheck, AlertCircle, Loader2, AlertTriangle
} from "lucide-react";
import { CldImage } from "next-cloudinary";
import Image from "next/image";
import { Alert, AlertDescription } from "@/src/app/components/ui/alert";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/src/app/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/src/app/components/ui/alert-dialog";
import { toast } from "sonner";
import { buttonVariants } from "@/src/app/components/ui/button";

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
  bio: string | null;
  showActivity: boolean;
  showFavorites: boolean;
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
  user: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
};

export default function UserViewPage({ params }: PageProps) {
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [resetPasswordStatus, setResetPasswordStatus] = useState<{
    loading: boolean;
    success: boolean;
    error: string;
  }>({
    loading: false,
    success: false,
    error: "",
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

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

  const handleResetPassword = async () => {
    if (!user || !user.id) return;
    
    setResetPasswordStatus({
      loading: true,
      success: false,
      error: "",
    });
    
    try {
      const response = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setResetPasswordStatus({
          loading: false,
          success: true,
          error: "",
        });
        
        // Limpiar el mensaje de éxito después de 5 segundos
        setTimeout(() => {
          setResetPasswordStatus(prev => ({
            ...prev,
            success: false
          }));
        }, 5000);
      } else {
        setResetPasswordStatus({
          loading: false,
          success: false,
          error: data.error || "Ha ocurrido un error al enviar el correo",
        });
      }
    } catch (error) {
      console.error("Error al solicitar reseteo de contraseña:", error);
      setResetPasswordStatus({
        loading: false,
        success: false,
        error: "Error de conexión al servidor",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!user || !user.id) return;
    
    setIsDeleting(true);
    
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error desconocido');
      }
      
      toast.success("Usuario eliminado correctamente");
      
      // Redireccionar a la lista de usuarios
      router.push('/admin/users');
    } catch (error) {
      console.error("Error al eliminar usuario:", error);
      toast.error("Error al eliminar el usuario");
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 overflow-x-hidden">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-2xl font-bold text-foreground">Perfil de Usuario</h1>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/users"
              className="px-3 py-2 text-sm sm:px-4 sm:py-2 bg-muted hover:bg-muted/80 text-foreground rounded-md"
            >
              Volver
            </Link>
            <Link
              href={`/admin/users/edit/${user.id}`}
              className="px-3 py-2 text-sm sm:px-4 sm:py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md"
            >
              Editar Usuario
            </Link>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-md overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            {/* Panel lateral izquierdo */}
            <div className="w-full lg:w-1/3 bg-primary/10 p-4 sm:p-6">
              <div className="text-center">
                <div className="relative w-24 h-24 mx-auto sm:w-32 sm:h-32 mb-4">
                  {user.image && user.image.includes('cloudinary') ? (
                    <CldImage
                      src={user.image}
                      alt={user.name || "Avatar"}
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
                  ) : user.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
                    <CldImage
                      src={user.image}
                      alt={user.name || "Avatar"}
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
                    <Image
                      src={user.image || "/images/AvatarPredeterminado.webp"}
                      alt={user.name || "Avatar"}
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
                
                {/* Rol de usuario como elemento separado debajo de la imagen */}
                <div className="text-center -mt-2 mb-3">
                  <Badge className={`${
                    roleBadgeStyles[user.role as keyof typeof roleBadgeStyles] || roleBadgeStyles.user
                  }`}>
                    {user.role === "admin" ? "Admin" : "Usuario"}
                  </Badge>
                </div>
                
                <h2 className="text-lg sm:text-xl font-semibold mb-1">{user.name}</h2>
                <div className="inline-block bg-primary/10 px-3 py-1 rounded-full text-xs sm:text-sm text-muted-foreground mb-4">
                  @{user.username || user.id.substring(0, 8)}
                </div>
                
                <div className="space-y-3 text-left text-xs sm:text-sm">
                  <div className="flex items-center">
                    <Mail className="w-4 h-4 min-w-4 mr-2 text-muted-foreground" />
                    <span className="truncate">{user.email}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <CalendarDays className="w-4 h-4 min-w-4 mr-2 text-muted-foreground" />
                    <span>Registrado {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: es })}</span>
                  </div>
                  
                  {user.emailVerified && (
                    <div className="flex items-center">
                      <UserCheck className="w-4 h-4 min-w-4 mr-2 text-green-500" />
                      <span className="text-green-500">Email verificado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contenido principal */}
            <div className="w-full lg:w-2/3 p-4 sm:p-6">
              {/* Vista para escritorio y tablet: Pestañas */}
              <div className="hidden md:block">
                <Tabs defaultValue="activity" className="w-full">
                  <div className="overflow-hidden">
                    <TabsList className="mb-4 w-full flex flex-wrap justify-start gap-1 lg:gap-0.5">
                      <TabsTrigger value="activity" className="data-[state=active]:bg-primary/10 text-xs sm:text-sm px-2 flex-grow max-w-[130px] lg:max-w-[110px] xl:max-w-none">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="whitespace-nowrap">Actividad</span>
                      </TabsTrigger>
                      <TabsTrigger value="details" className="data-[state=active]:bg-primary/10 text-xs sm:text-sm px-2 flex-grow max-w-[130px] lg:max-w-[110px] xl:max-w-none">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="whitespace-nowrap">Detalles</span>
                      </TabsTrigger>
                      <TabsTrigger value="settings" className="data-[state=active]:bg-primary/10 text-xs sm:text-sm px-2 flex-grow max-w-[130px] lg:max-w-[110px] xl:max-w-none">
                        <Settings className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 flex-shrink-0" />
                        <span className="whitespace-nowrap">Configuración</span>
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  
                  <TabsContent value="activity" className="space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle>Estadísticas de actividad</CardTitle>
                      </CardHeader>
                      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                          <div>
                            <p className="text-sm text-muted-foreground">Biografía</p>
                            <p className="font-medium">{user.bio || "No establecida"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Mostrar actividad</p>
                            <p className="font-medium">{user.showActivity ? "Sí" : "No"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Mostrar favoritos</p>
                            <p className="font-medium">{user.showFavorites ? "Sí" : "No"}</p>
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
                            onClick={handleResetPassword}
                            disabled={resetPasswordStatus.loading}
                          >
                            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 mr-3">
                              {resetPasswordStatus.loading ? (
                                <Loader2 className="w-4 h-4 text-red-600 dark:text-red-400 animate-spin" />
                              ) : (
                                <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                              )}
                            </div>
                            <div>
                              <p className="font-medium">Restablecer contraseña</p>
                              <p className="text-sm text-muted-foreground">Enviar email para resetear contraseña</p>
                            </div>
                          </button>
                          
                          {resetPasswordStatus.success && (
                            <Alert className="mt-4 border-green-500 text-green-500">
                              <AlertDescription>
                                Se ha enviado un correo con instrucciones para restablecer la contraseña.
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {resetPasswordStatus.error && (
                            <Alert variant="destructive" className="mt-4">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              <AlertDescription>
                                {resetPasswordStatus.error}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                      <CardFooter className="flex justify-end border-t pt-4">
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <button
                              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                            >
                              Eliminar usuario
                            </button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-destructive" />
                                Eliminar usuario
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                ¿Estás seguro de que deseas eliminar al usuario <span className="font-semibold">{user?.name || user?.username || user?.id}</span>?
                              </AlertDialogDescription>
                              <p className="text-destructive font-medium text-sm mt-2">
                                Esta acción no se puede deshacer y eliminará toda la información asociada a este usuario.
                              </p>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                  e.preventDefault();
                                  handleDeleteUser();
                                }}
                                disabled={isDeleting}
                                className={buttonVariants({ variant: "destructive" })}
                              >
                                {isDeleting ? (
                                  <span className="animate-pulse">Eliminando...</span>
                                ) : (
                                  "Eliminar usuario"
                                )}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Vista móvil: Accordion desplegable */}
              <div className="md:hidden">
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="activity" className="border-0">
                    <AccordionTrigger className="flex items-center p-3 bg-primary/5 rounded-lg">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2" />
                        <span>Actividad</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="mt-2 border-0 shadow-none">
                        <CardHeader className="pb-2">
                          <CardTitle>Estadísticas de actividad</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="details" className="border-0">
                    <AccordionTrigger className="flex items-center p-3 bg-primary/5 rounded-lg mt-2">
                      <div className="flex items-center">
                        <User className="w-4 h-4 mr-2" />
                        <span>Detalles</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="mt-2 border-0 shadow-none">
                        <CardHeader className="pb-2">
                          <CardTitle>Información detallada</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                            <div>
                              <p className="text-sm text-muted-foreground">Biografía</p>
                              <p className="font-medium">{user.bio || "No establecida"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Mostrar actividad</p>
                              <p className="font-medium">{user.showActivity ? "Sí" : "No"}</p>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground">Mostrar favoritos</p>
                              <p className="font-medium">{user.showFavorites ? "Sí" : "No"}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="settings" className="border-0">
                    <AccordionTrigger className="flex items-center p-3 bg-primary/5 rounded-lg mt-2">
                      <div className="flex items-center">
                        <Settings className="w-4 h-4 mr-2" />
                        <span>Configuración</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Card className="mt-2 border-0 shadow-none">
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
                              onClick={handleResetPassword}
                              disabled={resetPasswordStatus.loading}
                            >
                              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30 mr-3">
                                {resetPasswordStatus.loading ? (
                                  <Loader2 className="w-4 h-4 text-red-600 dark:text-red-400 animate-spin" />
                                ) : (
                                  <Shield className="w-4 h-4 text-red-600 dark:text-red-400" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium">Restablecer contraseña</p>
                                <p className="text-sm text-muted-foreground">Enviar email para resetear contraseña</p>
                              </div>
                            </button>
                            
                            {resetPasswordStatus.success && (
                              <Alert className="mt-4 border-green-500 text-green-500">
                                <AlertDescription>
                                  Se ha enviado un correo con instrucciones para restablecer la contraseña.
                                </AlertDescription>
                              </Alert>
                            )}
                            
                            {resetPasswordStatus.error && (
                              <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4 mr-2" />
                                <AlertDescription>
                                  {resetPasswordStatus.error}
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex justify-end border-t pt-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <button
                                className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 transition-colors"
                              >
                                Eliminar usuario
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Eliminar usuario
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ¿Estás seguro de que deseas eliminar al usuario <span className="font-semibold">{user?.name || user?.username || user?.id}</span>?
                                </AlertDialogDescription>
                                <p className="text-destructive font-medium text-sm mt-2">
                                  Esta acción no se puede deshacer y eliminará toda la información asociada a este usuario.
                                </p>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                    e.preventDefault();
                                    handleDeleteUser();
                                  }}
                                  disabled={isDeleting}
                                  className={buttonVariants({ variant: "destructive" })}
                                >
                                  {isDeleting ? (
                                    <span className="animate-pulse">Eliminando...</span>
                                  ) : (
                                    "Eliminar usuario"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </CardFooter>
                      </Card>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
