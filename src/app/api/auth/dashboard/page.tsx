"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CldImage } from "next-cloudinary";
import Link from "next/link";
import { Source } from "@/src/interface/source";
import { Button } from "@/src/app/components/ui/button";
import { Card } from "@/src/app/components/ui/card";
import { API_ROUTES } from "@/src/config/api-routes";
import {
  LogOut,
  ChevronRight,
  Mail,
  User2,
  Activity,
  Newspaper,
  Settings,
  Home,
  Star,
  ExternalLink,
  Menu,
  Calendar,
  MessageSquare,
  Plus,
  Minus,
  Heart,
  UserPlus,
  UserCheck,
} from "lucide-react";
import LoadingSpinner from "@/src/app/components/ui/LoadingSpinner";
import Image from "next/image";

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isOpen, setIsOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const [favoriteSources, setFavoriteSources] = useState<Source[]>([]);
  const [commentCount, setCommentCount] = useState(0);
  const [activeDays, setActiveDays] = useState(0);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalActivities, setTotalActivities] = useState(0);
  const itemsPerPage = 5;

  const displayedFavorites =
    favoriteSources.length > 6 ? favoriteSources.slice(0, 5) : favoriteSources;

  const remainingCount =
    favoriteSources.length > 6 ? favoriteSources.length - 5 : 0;

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

  useEffect(() => {
    const loadFavorites = async () => {
      if (session?.user?.id) {
        try {
          const favoritesResponse = await fetch(API_ROUTES.favorites.list);
          const favoritesData = await favoritesResponse.json();
          const favoriteIds = favoritesData.favoriteIds;

          const detailsResponse = await fetch(API_ROUTES.sources.details, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ sourceIds: favoriteIds }),
          });

          if (!detailsResponse.ok) {
            throw new Error("Error al obtener detalles de los periódicos");
          }

          const detailsData = await detailsResponse.json();
          setFavoriteSources(detailsData.sources || []);
        } catch (error) {
          console.error("Error al cargar favoritos:", error);
        }
      }
    };
    loadFavorites();
  }, [session]);

  useEffect(() => {
    const loadCommentCount = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(
            API_ROUTES.comments.userCount(session.user.id)
          );
          const data = await response.json();
          setCommentCount(data.count);
        } catch (error) {
          console.error("Error cargando conteo de comentarios:", error);
        }
      }
    };
    loadCommentCount();
  }, [session]);

  useEffect(() => {
    const calculateActiveDays = () => {
      if (!session?.user?.createdAt) return;

      const creationDate = new Date(session.user.createdAt);
      const today = new Date();

      const startDate = Date.UTC(
        creationDate.getFullYear(),
        creationDate.getMonth(),
        creationDate.getDate()
      );

      const endDate = Date.UTC(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      const timeDiff = endDate - startDate;
      const dayDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));

      setActiveDays(dayDiff);
    };

    calculateActiveDays();
  }, [session?.user?.createdAt]);

  useEffect(() => {
    const loadRecentActivity = async () => {
      if (session?.user?.id) {
        try {
          const response = await fetch(
            API_ROUTES.activities.user(session.user.id, currentPage, itemsPerPage)
          );
          const data = await response.json();

          if (!response.ok) {
            throw new Error(data.error || "Error en la solicitud");
          }

          if (data.success) {
            setRecentActivity(data.data.activities);
            setTotalActivities(data.data.total);
          }
        } catch (error) {
          console.error("Error al cargar actividad:", error);
          setRecentActivity([]);
        }
      }
    };
    loadRecentActivity();
  }, [session?.user?.id, currentPage]);

  useEffect(() => {
    if (session?.user?.id) {
      // Obtener el número de seguidores
      fetch(API_ROUTES.relationships.followers(session.user.id, 1, 1))
        .then((response) => response.json())
        .then((data) => {
          // La estructura correcta muestra que el total está en pagination.total
          setFollowersCount(data.pagination?.total || 0);
        })
        .catch((error) =>
          console.error("Error al cargar el conteo de seguidores:", error)
        );

      // Obtener el número de seguidos
      fetch(API_ROUTES.relationships.following(session.user.id, 1, 1))
        .then((response) => response.json())
        .then((data) => {
          // La estructura correcta muestra que el total está en pagination.total
          setFollowingCount(data.pagination?.total || 0);
        })
        .catch((error) =>
          console.error("Error al cargar el conteo de seguidos:", error)
        );
    }
  }, [session]);

  const PaginationControls = () => {
    // Limitar a un máximo de 5 páginas
    const maxTotalItems = 5 * itemsPerPage;
    const effectiveTotalItems = Math.min(totalActivities, maxTotalItems);
    const totalPages = Math.ceil(effectiveTotalItems / itemsPerPage);

    return (
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
    );
  };

  if (status === "loading") {
    return <LoadingSpinner />;
  }

  if (status === "unauthenticated") {
    router.push("/api/auth/signin");
    return null;
  }

  // Eliminar verificaciones redundantes de session
  const { user } = session!;

  const menuItems = [
    {
      icon: Home,
      label: "Información General",
      href: "/api/auth/dashboard",
      active: true,
    },
    {
      icon: Settings,
      label: "Editar perfil",
      href: `/users/edit/${user.username}`,
      active: false,
    },
    {
      icon: Newspaper,
      label: "Mis Periódicos favoritos",
      href: "/favorites",
      active: false,
    },
  ];

  const stats = [
    {
      icon: UserPlus,
      label: "Seguidores",
      value: followersCount,
      color: "text-blue-500",
      path: `/users/${user.username}/followers`,
    },
    {
      icon: UserCheck,
      label: "Seguidos",
      value: followingCount,
      color: "text-green-500",
      path: `/users/${user.username}/following`,
    },
    {
      icon: MessageSquare,
      label: "Comentarios",
      value: commentCount,
      color: "text-purple-500",
      path: `/users/${user.username}/comments`,
    },
    {
      icon: Calendar,
      label: "Días activo",
      value: activeDays || 0,
      color: "text-yellow-500",
      path: undefined,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-gray-900 dark:via-blue-900/30 dark:to-blue-800/20">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-300/20 dark:bg-blue-500/10 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-blue-200/20 dark:bg-blue-600/10 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative">
        {/* Mobile Header */}
        <div className="lg:hidden flex items-center justify-between mb-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="relative w-10 h-10">
              <Image
                src="/images/default_periodico.jpg"
                alt="Logo"
                width={40}
                height={40}
                className="rounded-lg object-cover"
                priority
              />
            </div>
            <span className="text-xl font-semibold text-blue-900 dark:text-white">
              Hemeroteca
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-blue-800 dark:text-blue-200"
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-all duration-300 ${
            mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className={`absolute right-0 top-0 h-full w-72 bg-white dark:bg-gray-900 shadow-xl transform transition-transform duration-300 ease-out ${
              mobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-3">
                  <div className="relative group">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl transition-all duration-300 group-hover:scale-[1.03] z-10">
                      {user?.image && user?.image.includes('cloudinary') ? (
                        // Si la imagen tiene un formato de Cloudinary público (URL completa)
                        <CldImage
                          src={user.image}
                          alt={user?.name || "Avatar"}
                          width={48}
                          height={48}
                          crop="fill"
                          gravity="face"
                          className="object-cover"
                          priority
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      ) : user?.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
                        // Si la imagen es un public_id de Cloudinary (sin https:// o /)
                        <CldImage
                          src={user.image}
                          alt={user?.name || "Avatar"}
                          width={48}
                          height={48}
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
                          src={user?.image || "/images/AvatarPredeterminado.webp"}
                          alt={user?.name || "Avatar"}
                          width={48}
                          height={48}
                          className="object-cover"
                          priority
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>  ) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {user?.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      @{user?.username}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-500"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>

              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                      item.active
                        ? "bg-blue-600 text-white"
                        : "text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                    }`}
                  >
                    <item.icon className="h-5 w-5 mr-3" />
                    <span>{item.label}</span>
                  </Link>
                ))}

                <Button
                  className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signOut({ redirect: false }).then(() =>
                      router.push("/signin")
                    );
                  }}
                >
                  <LogOut className="h-5 w-5" />
                  Cerrar sesión
                </Button>
              </nav>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar */}
          <aside
            className={`hidden lg:block transition-all duration-300 ${
              isOpen ? "w-64" : "w-20"
            } bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg rounded-2xl p-4 shadow-lg sticky top-6 h-[calc(100vh-3rem)]`}
          >
            <div className="flex items-center justify-between mb-8">
              <Link
                href="/"
                className={`flex items-center ${!isOpen && "justify-center"}`}
              >
                <div className="relative w-10 h-10">
                  <Image
                    src="/images/default_periodico.jpg"
                    alt="Logo"
                    width={40}
                    height={40}
                    className="rounded-lg object-cover"
                    priority
                  />
                </div>
                {isOpen && (
                  <span className="ml-3 text-xl font-semibold text-blue-900 dark:text-white">
                    Hemeroteca
                  </span>
                )}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(!isOpen)}
                className="text-gray-600 dark:text-gray-300"
              >
                <ChevronRight
                  className={`h-5 w-5 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </div>

            <nav className="flex flex-col h-[calc(100%-8rem)] space-y-2">
              {menuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center px-4 py-3 rounded-xl transition-all ${
                    item.active
                      ? "bg-blue-600 text-white"
                      : "text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  } ${!isOpen ? "justify-center" : ""}`}
                >
                  <item.icon className="h-5 w-5" />
                  {isOpen && <span className="ml-3">{item.label}</span>}
                </Link>
              ))}

              <Button
                className={`mt-auto ${
                  isOpen ? "w-full" : ""
                } bg-red-600 hover:bg-red-700 text-white`}
                onClick={() =>
                  signOut({ redirect: false }).then(() =>
                    router.push("/signin")
                  )
                }
              >
                <LogOut className="h-5 w-5" />
                {isOpen && <span className="ml-2">Cerrar sesión</span>}
              </Button>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-6">
            {/* Profile Card */}
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0 overflow-hidden">
              <div className="p-6 sm:p-8 relative">
                <div className="flex flex-col items-center sm:flex-row sm:items-center gap-8">
                  <div className="relative group">
                    <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-full overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl transition-all duration-300 group-hover:scale-[1.03] z-10">
                      {user?.image && user?.image.includes('cloudinary') ? (
                        // Si la imagen tiene un formato de Cloudinary público (URL completa)
                        <CldImage
                          src={user.image}
                          alt={user?.name || "Avatar"}
                          width={192}
                          height={192}
                          crop="fill"
                          gravity="face"
                          className="object-cover w-full h-full"
                          priority
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      ) : user?.image && !user.image.startsWith('/') && !user.image.startsWith('http') ? (
                        // Si la imagen es un public_id de Cloudinary (sin https:// o /)
                        <CldImage
                          src={user.image}
                          alt={user?.name || "Avatar"}
                          width={192}
                          height={192}
                          crop="fill"
                          gravity="face"
                          className="object-cover w-full h-full"
                          onError={(e: React.SyntheticEvent<HTMLImageElement, Event>) => {
                            const target = e.target as HTMLImageElement;
                            target.src = "/images/AvatarPredeterminado.webp";
                          }}
                        />
                      ) : (
                        // Para imágenes locales o fallback
                        <Image
                          src={user?.image || "/images/AvatarPredeterminado.webp"}
                          alt={user?.name || "Avatar"}
                          width={192}
                          height={192}
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
                          {user?.name || "Nombre del usuario"}
                        </h1>
                        <p className="text-xl text-blue-600 dark:text-blue-400 font-medium mt-2">
                          @{user?.username || "username"}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex items-center justify-center sm:justify-start p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/50 shadow-sm hover:shadow transition-shadow">
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-800/50 mr-3">
                            <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
                              Email
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 font-medium truncate max-w-[200px] sm:max-w-[250px]">
                              {user?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-center sm:justify-start p-3 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl backdrop-blur-sm border border-blue-100/50 dark:border-blue-800/50 shadow-sm hover:shadow transition-shadow">
                          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-800/50 mr-3">
                            <User2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-xs text-blue-600/70 dark:text-blue-400/70 font-medium">
                              Rol
                            </p>
                            <p className="text-gray-700 dark:text-gray-300 font-medium">
                              {user?.role || "Usuario"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Button
                          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg transition-all duration-300 hover:scale-[1.02]"
                          onClick={() => router.push(`/users/edit/${user.username}`)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Editar perfil
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-12">
                  {stats.map((stat, index) => (
                    <Link
                      key={index}
                      href={stat.path || "#"} // Asegurar un fallback para stats sin path
                      className="relative group bg-gradient-to-br from-white/90 to-white/60 dark:from-gray-800/90 dark:to-gray-800/60 rounded-xl p-5 text-center backdrop-blur-sm border border-white/20 dark:border-gray-700/20 hover:border-white/40 dark:hover:border-gray-700/40 transition-all shadow-md hover:shadow-lg cursor-pointer"
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                      <div className="relative">
                        <div
                          className={`inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-${
                            stat.color.split("-")[1]
                          }-100 to-${stat.color.split("-")[1]}-50 dark:from-${
                            stat.color.split("-")[1]
                          }-900/30 dark:to-${
                            stat.color.split("-")[1]
                          }-800/20 mb-3 mx-auto`}
                        >
                          <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stat.value}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {stat.label}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>

            {/* Favorites Section */}
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white flex items-center">
                    <Heart className="h-6 w-6 mr-2 text-red-500" />
                    Periódicos favoritos ({favoriteSources.length})
                  </h2>
                  <Link
                    href="/favorites"
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors flex items-center"
                  >
                    Ver todos <ExternalLink className="h-4 w-4 ml-1" />
                  </Link>
                </div>

                {favoriteSources.length === 0 ? (
                  <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <Newspaper className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      No tienes periódicos favoritos
                    </p>
                    <Button
                      className="bg-blue-600 hover:bg-blue-700 text-white transition-transform hover:scale-105"
                      onClick={() => router.push("/sources")}
                    >
                      Explorar periódicos
                    </Button>
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
                            {source.language === "es"
                              ? "Español"
                              : source.language === "en"
                              ? "Inglés"
                              : source.language}
                          </p>
                        </div>
                      </Link>
                    ))}
                    {remainingCount > 0 && (
                      <Link href="/favorites" className="group">
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
                )}
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-lg shadow-xl border-0">
              <div className="p-6">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
                  <Activity className="h-6 w-6 mr-2 text-blue-500" />
                  Actividad reciente
                </h2>

                {recentActivity.length === 0 ? (
                  <div className="text-center py-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <MessageSquare className="h-16 w-16 mx-auto text-blue-400 mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">
                      No hay actividad reciente
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {recentActivity.map((activity) => (
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
                                {activity.type === "favorite_added" &&
                                  `Agregaste ${
                                    activity.sourceName || "una fuente"
                                  } a favoritos.`}
                                {activity.type === "favorite_removed" &&
                                  `Eliminaste ${
                                    activity.sourceName || "una fuente"
                                  } de favoritos.`}
                                {activity.type === "comment" &&
                                  `Comentaste en ${
                                    activity.sourceName || "una fuente"
                                  }.`}
                                {activity.type === "rating_added" &&
                                  `Valoraste ${
                                    activity.sourceName || "una fuente"
                                  }.`}
                                {activity.type === "rating_removed" &&
                                  `Eliminaste la valoración de ${
                                    activity.sourceName || "una fuente"
                                  }.`}
                                {activity.type === "follow" &&
                                  `Comenzaste a seguir a ${
                                    activity.user.name || "un usuario"
                                  }.`}
                                {activity.type === "comment_reply" &&
                                  `Respondiste a un comentario en ${
                                    activity.sourceName || "una fuente"
                                  }.`}
                                {activity.type === "comment_deleted" &&
                                  `Eliminaste un comentario en ${
                                    activity.sourceName || "una fuente"
                                  }.`}
                                {activity.type === "unfollow" &&
                                  `Dejaste de seguir a ${
                                    activity.user.name || "un usuario"
                                  }.`}
                                {activity.type === "favorite" &&
                                  `Marcaste como favorito a ${
                                    activity.sourceName || "una fuente"
                                  }.`}
                                {/* Texto de fallback para tipos no reconocidos */}
                                {!["favorite_added", "favorite_removed", "comment", "rating_added", 
                                   "rating_removed", "follow", "comment_reply", "comment_deleted", 
                                   "unfollow", "favorite"].includes(activity.type) &&
                                   `Actividad: ${activity.type || "desconocida"} ${
                                     activity.sourceName ? `en ${activity.sourceName}` : 
                                     activity.user.name ? `con ${activity.user.name}` : 
                                     ""
                                   }`}
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
                )}
              </div>
            </Card>
          </main>
        </div>
      </div>
    </div>
  );
}
