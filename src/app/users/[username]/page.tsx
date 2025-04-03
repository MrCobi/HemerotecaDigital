"use client";

import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { UserPrisma as User } from "@/src/interface/user"
import { Card } from "@/src/app/components/ui/card";
import {
  User2,
  Users,
  Activity,
  Heart,
  MessageSquare,
  Star,
  Minus,
  Plus,
  ExternalLink,
} from "lucide-react";
import { Source } from "@/src/interface/source";
import Link from "next/link";
import { Button } from "@/src/app/components/ui/button";
import { FollowButton } from "@/src/app/components/FollowButton";
import { API_ROUTES } from "@/src/config/api-routes";
import { CldImage } from 'next-cloudinary';

type Activity = {
  id: string;
  type:
  | "favorite_added"
  | "favorite_removed"
  | "comment"
  | "rating_added"
  | "rating_removed"
  | "follow"
  | "comment_reply"
  | "comment_deleted"
  | "unfollow"
  | "favorite";
  sourceName: string | null;
  targetName: string | null;
  targetId: string | null;
  targetType: string | null;
  details: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string | null;
    image: string | null;
  };
};

interface UserStats {
  followers: number;
  following: number;
  comments: number;
  activeDays: number;
}

export default function UserProfilePage() {
  const { username } = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userData, setUserData] = useState<{
    user: User & { stats: UserStats };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Source[]>([]);
  const [activity, setActivity] = useState<Activity[]>([]);
  const [privacy, setPrivacy] = useState({
    showFavorites: true,
    showActivity: true,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [isFollowing, setIsFollowing] = useState(false);
  const [isMutualFollow, setIsMutualFollow] = useState(false);

  // Verificación de autenticación
  useEffect(() => {
    // Si no está autenticado, redirigir a la página de inicio de sesión
    if (status === "unauthenticated") {
      router.push("/api/auth/signin");
      return;
    }

    // Verificar que el correo electrónico esté verificado
    if (status === "authenticated" && !session?.user?.emailVerified) {
      router.push("/auth/verification-pending");
      return;
    }
  }, [status, session, router]);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch(
          API_ROUTES.users.byUsername(username as string)
        );
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "User not found");

        setUserData({
          user: {
            ...data,
            stats: data.stats,
          },
        });
        const followStatusResponse = await fetch(
          API_ROUTES.users.followStatus([data.id]), // Array con el ID
          {
            headers: { Authorization: `Bearer ${session?.user?.id}` },
          }
        );
        const followStatus = await followStatusResponse.json();
        setIsFollowing(followStatus[data.id] || false);
        
        // Verificar si hay seguimiento mutuo
        const mutualResponse = await fetch('/api/relationships/mutual');
        if (mutualResponse.ok) {
          const mutualUsers = await mutualResponse.json();
          // Comprobar si el usuario actual está en la lista de seguidores mutuos
          setIsMutualFollow(mutualUsers.some((user: any) => user.id === data.id));
        }
        
        setFavorites(data.favorites || []);
        setActivity(data.activity || []);
        setPrivacy(
          data.privacySettings || {
            showFavorites: true,
            showActivity: true,
          }
        );
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [username, session?.user?.id]);

  // Mostrar pantalla de carga mientras se verifica la sesión
  if (status === "loading" || loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 dark:border-blue-400"></div>
      </div>
    );
  }

  if (!userData?.user) {
    return (
      <div className="container mx-auto p-4 text-center text-destructive">
        User not found
      </div>
    );
  }

  const { user } = userData;
  const displayedFavorites =
    favorites.length > 6 ? favorites.slice(0, 5) : favorites;
  const remainingCount = favorites.length > 6 ? favorites.length - 5 : 0;

  // Paginación para la actividad
  const _paginatedActivity = activity.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  const _totalPages = Math.ceil(activity.length / itemsPerPage);

  const PaginationControls = () => {
    const totalPages = Math.ceil(activity.length / itemsPerPage);

    return (
      totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          <Button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </Button>

          <span className="flex items-center px-4 text-sm">
            Página {currentPage} de {totalPages}
          </span>

          <Button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-200/20 dark:bg-blue-600/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {/* Profile Card */}
        <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0 overflow-hidden">
          <div className="p-6 sm:p-8 relative">
            <div className="flex flex-col items-center sm:flex-row sm:items-center gap-8">
              <div className="relative group">
                <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl transition-all duration-300 group-hover:scale-[1.03] z-10">
                  {user.image && (user.image.includes('cloudinary') || 
                  (!user.image.startsWith('/') && !user.image.startsWith('http'))) ? (
                    <CldImage
                      src={(() => {
                        // Extraer el public_id limpio, manejando diferentes formatos
                        let publicId = user.image;

                        // Si es una URL completa de Cloudinary
                        if (user.image.includes('cloudinary.com')) {
                          // Extraer el public_id eliminando la parte de la URL
                          // Buscamos 'hemeroteca_digital' como punto de referencia seguro
                          const match = user.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                          if (match && match[1]) {
                            publicId = `hemeroteca_digital/${match[1]}`;
                          } else {
                            // Si no encontramos el patrón específico, intentamos una extracción más general
                            publicId = user.image.replace(/.*\/v\d+\//, '').split('?')[0];
                          }
                        }

                        // Verificar que el ID no esté duplicado o anidado
                        if (publicId.includes('https://')) {
                          console.warn('ID público contiene URL completa en perfil:', publicId);
                          publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                        }

                        console.log('Public ID extraído en perfil de usuario:', publicId);
                        return publicId;
                      })()}
                      alt={user.name || "Avatar"}
                      width={200}
                      height={200}
                      crop="fill"
                      gravity="face"
                      className="object-cover w-full h-full"
                      priority
                      onError={(e) => {
                        console.error('Error cargando imagen en perfil de usuario:', user.image);
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  ) : (
                    <Image
                      src={user.image || "/images/AvatarPredeterminado.webp"}
                      alt={user.name || "Avatar"}
                      width={200}
                      height={200}
                      className="object-cover w-full h-full"
                      priority
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/images/AvatarPredeterminado.webp";
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left mt-6 sm:mt-0">
                <div className="space-y-6">
                  <div>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
                      {user.name}
                    </h1>
                    <p className="text-xl text-blue-600 dark:text-blue-400 font-medium mt-2">
                      @{user.username}
                    </p>
                    {user.bio && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                        {user.bio}
                      </p>
                    )}
                  </div>
                  {/* Botón de Seguir */}
                  {session?.user?.id !== user.id && (
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                      <FollowButton
                        targetUserId={user.id}
                        isFollowing={isFollowing}
                        onSuccess={async (newStatus, serverFollowerCount) => {
                          setIsFollowing(newStatus);
                          setUserData((prev) => {
                            if (!prev) return prev;
                            return {
                              ...prev,
                              user: {
                                ...prev.user,
                                stats: {
                                  ...prev.user.stats,
                                  followers:
                                    serverFollowerCount ??
                                    prev.user.stats.followers,
                                },
                              },
                            };
                          });
                          
                          // Actualizar estado de seguimiento mutuo al cambiar estado de follow
                          try {
                            // Si lo sigue, comprueba si el otro usuario también le sigue (para activar seguimiento mutuo)
                            if (newStatus) {
                              // Verificar si el otro usuario ya me seguía
                              // El endpoint espera que el usuario actual (session) sea el follower
                              // y queremos comprobar si el usuario del perfil (user) nos sigue
                              const checkMutualStatus = await fetch(`/api/relationships/mutual`);
                              const mutualUsers = await checkMutualStatus.json();
                              
                              // Comprobar si el usuario del perfil está entre los seguidores mutuos
                              setIsMutualFollow(mutualUsers.some((mutualUser: any) => mutualUser.id === user.id));
                            } else {
                              // Si deja de seguir, ya no hay seguimiento mutuo
                              setIsMutualFollow(false);
                            }
                          } catch (error) {
                            console.error("Error al comprobar estado de seguimiento mutuo:", error);
                          }
                        }}
                      />
                      
                      {/* Botón de Enviar Mensaje - Solo visible si hay seguimiento mutuo */}
                      {isMutualFollow && (
                        <Button
                          onClick={async () => {
                            // Verificar nuevamente si hay seguimiento mutuo antes de crear la conversación
                            try {
                              // Primero verificamos si hay seguimiento mutuo
                              const mutualResponse = await fetch('/api/relationships/mutual');
                              if (!mutualResponse.ok) {
                                throw new Error("Error al verificar seguimiento mutuo");
                              }
                              
                              const mutualUsers = await mutualResponse.json();
                              const isMutual = mutualUsers.some((mutualUser: any) => mutualUser.id === user.id);
                              
                              if (!isMutual) {
                                alert("Solo puedes enviar mensajes a usuarios que te siguen mutuamente");
                                return;
                              }
                              
                              // Si hay seguimiento mutuo, procedemos a crear la conversación
                              const createConvRes = await fetch('/api/messages/conversations', {
                                method: 'POST',
                                headers: {
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                  receiverId: user.id
                                })
                              });
                              
                              if (!createConvRes.ok) {
                                const errorData = await createConvRes.json();
                                throw new Error(errorData.error || "Error al iniciar conversación");
                              }
                              
                              const convData = await createConvRes.json();
                              console.log('Conversación creada o recuperada:', convData);
                              
                              // Redirigir a la página de mensajes con el ID de conversación
                              router.push(`/messages?convId=${convData.id}`);
                            } catch (error) {
                              console.error("Error al crear conversación:", error);
                              alert("Ha ocurrido un error al iniciar la conversación");
                            }
                          }}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 hover:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 ease-in-out transform hover:-translate-y-0.5"
                        >
                          <MessageSquare className="h-5 w-5" />
                          <span>Enviar mensaje</span>
                        </Button>
                      )}
                    </div>
                  )}
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto sm:mx-0">
                    <div className="relative group bg-gradient-to-br from-white/90 to-white/60 dark:from-gray-800/90 dark:to-gray-800/60 rounded-xl p-5 text-center backdrop-blur-sm border border-white/20 dark:border-gray-700/20 hover:border-white/40 dark:hover:border-gray-700/40 transition-all shadow-md hover:shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/30 dark:to-blue-800/20 mb-3 mx-auto">
                          <Users className="h-6 w-6 text-blue-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {user.stats.followers}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Seguidores
                        </p>
                      </div>
                    </div>

                    <div className="relative group bg-gradient-to-br from-white/90 to-white/60 dark:from-gray-800/90 dark:to-gray-800/60 rounded-xl p-5 text-center backdrop-blur-sm border border-white/20 dark:border-gray-700/20 hover:border-white/40 dark:hover:border-gray-700/40 transition-all shadow-md hover:shadow-lg">
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-100 to-green-50 dark:from-green-900/30 dark:to-green-800/20 mb-3 mx-auto">
                          <User2 className="h-6 w-6 text-green-500" />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {user.stats.following}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Siguiendo
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Favorites Section */}
        <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0 mt-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Heart className="h-6 w-6 mr-2 text-red-500" />
                Periódicos favoritos ({favorites.length})
              </h2>
              {favorites.length > 6 && (
                <Link
                  href={`/users/${user.username}/favorites`}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center"
                >
                  Ver todos <ExternalLink className="h-4 w-4 ml-1" />
                </Link>
              )}
            </div>

            {privacy.showFavorites ? (
              favorites.length === 0 ? (
                <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Heart className="h-16 w-16 mx-auto text-red-400/50 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {session?.user?.id === user.id 
                      ? "No tienes periódicos favoritos" 
                      : `${user.name || user.username} no tiene periódicos favoritos`}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedFavorites.map((source) => (
                    <Link
                      href={`/sources/${source.id}`}
                      key={source.id}
                      className="group"
                    >
                      <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300">
                            {source.name}
                          </h3>
                          <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          {source.category}
                        </p>
                      </div>
                    </Link>
                  ))}
                  {remainingCount > 0 && (
                    <Link
                      href={`/users/${user.username}/favorites`}
                      className="group"
                    >
                      <div className="p-5 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-lg h-full flex flex-col items-center justify-center transition-all duration-300 hover:shadow-xl hover:scale-[1.02] group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30">
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                          +{remainingCount}
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                          Ver todos los favoritos
                        </p>
                      </div>
                    </Link>
                  )}
                </div>
              )
            ) : (
              <div className="mt-8 text-center py-6 text-muted-foreground">
                <Heart className="h-8 w-8 mx-auto mb-2 text-red-500/50" />
                <p>Los periódicos favoritos son privados</p>
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0 mt-6">
          <div className="p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
              <Activity className="h-6 w-6 mr-2 text-blue-500" />
              Actividad reciente
            </h2>

            {privacy.showActivity ? (
              activity.length === 0 ? (
                <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <Activity className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No hay actividad reciente
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {activity
                      .slice(
                        (currentPage - 1) * itemsPerPage,
                        currentPage * itemsPerPage
                      )
                      .map((activity) => (
                        <div
                          key={activity.id}
                          className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {(activity.type === "favorite_added" || activity.type === "favorite") && (
                                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                              )}
                              {activity.type === "favorite_removed" && (
                                <Heart className="h-5 w-5 text-red-500" />
                              )}
                              {activity.type === "comment" && (
                                <MessageSquare className="h-5 w-5 text-green-500" />
                              )}
                              {activity.type === "rating_added" && (
                                <div className="relative flex items-center justify-center">
                                  <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                                  <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full w-3.5 h-3.5 flex items-center justify-center border border-yellow-500">
                                    <Plus className="h-2.5 w-2.5 text-yellow-500" />
                                  </div>
                                </div>
                              )}
                              {activity.type === "rating_removed" && (
                                <div className="relative flex items-center justify-center">
                                  <Star className="h-5 w-5 text-purple-500" />
                                  <div className="absolute -top-1 -right-1 bg-white dark:bg-gray-800 rounded-full w-3.5 h-3.5 flex items-center justify-center border border-purple-500">
                                    <Minus className="h-2.5 w-2.5 text-purple-500" />
                                  </div>
                                </div>
                              )}
                              {activity.type === "follow" && (
                                <User2 className="h-5 w-5 text-blue-500" />
                              )}
                              {activity.type === "comment_reply" && (
                                <MessageSquare className="h-5 w-5 text-green-500" />
                              )}
                              {activity.type === "comment_deleted" && (
                                <MessageSquare className="h-5 w-5 text-red-500" />
                              )}
                              {activity.type === "unfollow" && (
                                <User2 className="h-5 w-5 text-red-500" />
                              )}
                              {/* Fallback icon para tipos no reconocidos */}
                              {!["favorite_added", "favorite_removed", "comment", "rating_added",
                                "rating_removed", "follow", "comment_reply", "comment_deleted",
                                "unfollow", "favorite"].includes(activity.type) && (
                                  <Activity className="h-5 w-5 text-blue-500" />
                                )}
                            </div>
                            <div>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                {/* Verificamos si estamos viendo nuestro propio perfil o el de otro usuario */}
                                {session?.user?.id === user.id ? (
                                  // Actividad en primera persona (mi propio perfil)
                                  <>
                                    {activity.type === "favorite_added" &&
                                      `Agregaste ${activity.sourceName || "una fuente"} a favoritos.`}
                                    {activity.type === "favorite_removed" &&
                                      `Eliminaste ${activity.sourceName || "una fuente"} de favoritos.`}
                                    {activity.type === "comment" &&
                                      `Comentaste en ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "rating_added" &&
                                      `Valoraste ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "rating_removed" &&
                                      `Eliminaste la valoración de ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "follow" &&
                                      `Comenzaste a seguir a ${activity.targetName || "un usuario"}.`}
                                    {activity.type === "comment_reply" &&
                                      `Respondiste a un comentario en ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "comment_deleted" &&
                                      `Eliminaste un comentario en ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "unfollow" &&
                                      `Dejaste de seguir a ${activity.targetName || "un usuario"}.`}
                                    {activity.type === "favorite" &&
                                      `Marcaste como favorito a ${activity.sourceName || "una fuente"}.`}
                                  </>
                                ) : (
                                  // Actividad en tercera persona (perfil de otra persona)
                                  <>
                                    {activity.type === "favorite_added" &&
                                      `${user.name || user.username} agregó ${activity.sourceName || "una fuente"} a favoritos.`}
                                    {activity.type === "favorite_removed" &&
                                      `${user.name || user.username} eliminó ${activity.sourceName || "una fuente"} de favoritos.`}
                                    {activity.type === "comment" &&
                                      `${user.name || user.username} comentó en ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "rating_added" &&
                                      `${user.name || user.username} valoró ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "rating_removed" &&
                                      `${user.name || user.username} eliminó la valoración de ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "follow" &&
                                      `${user.name || user.username} comenzó a seguir a ${activity.targetName || "un usuario"}.`}
                                    {activity.type === "comment_reply" &&
                                      `${user.name || user.username} respondió a un comentario en ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "comment_deleted" &&
                                      `${user.name || user.username} eliminó un comentario en ${activity.sourceName || "una fuente"}.`}
                                    {activity.type === "unfollow" &&
                                      `${user.name || user.username} dejó de seguir a ${activity.targetName || "un usuario"}.`}
                                    {activity.type === "favorite" &&
                                      `${user.name || user.username} marcó como favorito a ${activity.sourceName || "una fuente"}.`}
                                  </>
                                )}
                                {/* Texto de fallback para tipos no reconocidos */}
                                {!["favorite_added", "favorite_removed", "comment", "rating_added",
                                  "rating_removed", "follow", "comment_reply", "comment_deleted",
                                  "unfollow", "favorite"].includes(activity.type) &&
                                  `Actividad: ${activity.type || "desconocida"} ${activity.sourceName ? `en ${activity.sourceName}` :
                                    activity.targetName ? `con ${activity.targetName}` : ""}`}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {activity.createdAt
                                  ? new Date(
                                    activity.createdAt
                                  ).toLocaleDateString("es-ES", {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                  : "Fecha no disponible"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                  <PaginationControls />
                </>
              )
            ) : (
              <div className="mt-8 text-center py-6 text-muted-foreground">
                <Activity className="h-8 w-8 mx-auto mb-2 text-blue-500/50" />
                <p>La actividad reciente es privada</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
