"use client";
import { useSession, signOut } from "next-auth/react";
import * as React from "react";
import Link from "next/link";
import { Menu } from "@mui/material";
import { CldImage } from 'next-cloudinary';
import Image from 'next/image';
import { motion } from "framer-motion";
import { useAnimationSettings } from '@/src/app/hooks/useAnimationSettings';
import { useRouter } from 'next/navigation';

const AuthButton = () => {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  // Obtener preferencias de animación
  const animationsEnabled = useAnimationSettings();
  
  // Para navegación
  const router = useRouter();
  
  // Definir variantes de animación
  const buttonVariants = {
    initial: { opacity: 0.9, scale: 0.98 },
    hover: animationsEnabled ? { opacity: 1, scale: 1.02 } : {},
    tap: animationsEnabled ? { scale: 0.98 } : {}
  };
  
  const arrowVariants = {
    initial: { rotate: 0 },
    open: animationsEnabled ? { rotate: 180 } : { rotate: 0 }
  };

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSignOut = async () => {
    // Cerrar el menú primero
    handleClose();
    
    try {
      // Usar la función de NextAuth directamente
      await signOut({ 
        redirect: true,
        callbackUrl: "/"
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Como plan B, redirigir manualmente si falla
      window.location.href = "/";
    }
  };

  if (session) {
    const isAdmin = session.user?.role === "admin";
    return (
      <div className="relative">
        <motion.button
          onClick={handleMenu}
          className="flex items-center gap-1 sm:gap-2 px-1.5 sm:px-3 py-1 sm:py-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white shadow-sm transition-colors duration-200"
          initial={buttonVariants.initial}
          whileHover={buttonVariants.hover}
          whileTap={buttonVariants.tap}
        >
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full overflow-hidden border-2 border-white/20">
              {session.user.image && (session.user.image.includes('cloudinary') || 
              (!session.user.image.startsWith('/') && !session.user.image.startsWith('http'))) ? (
                <CldImage
                  src={(() => {
                    let publicId = "";
                    
                    // Si la imagen es una URL de Cloudinary
                    if (session.user.image && session.user.image.includes('cloudinary.com')) {
                      // Verificar si la URL ya tiene el formato completo de Cloudinary
                      if (session.user.image.includes('res.cloudinary.com/dlg8j3g5k/image/upload/')) {
                        // Usar la URL completa directamente, no intentar construirla de nuevo
                        return session.user.image;
                      } else {
                        // Extraer el public_id eliminando la parte de la URL
                        // Buscamos 'hemeroteca_digital' como punto de referencia seguro
                        const match = session.user.image.match(/hemeroteca_digital\/(.*?)(?:\?|$)/);
                        if (match && match[1]) {
                          publicId = `hemeroteca_digital/${match[1]}`;
                        } else {
                          // Si no encontramos el patrón específico, intentamos una extracción más general
                          publicId = session.user.image.replace(/.*\/v\d+\//, '').split('?')[0];
                        }
                      }
                    }

                    // Verificar que el ID no esté duplicado o anidado
                    if (publicId.includes('https://') || publicId.includes('cloudinary.com')) {
                      console.warn('ID público contiene URL completa en AuthButton:', publicId);
                      publicId = publicId.replace(/.*\/v\d+\//, '').split('?')[0];
                    }

                    // Si después de todo el procesamiento, el publicId sigue teniendo la URL completa
                    if (publicId.includes('https://')) {
                      console.error('No se pudo extraer correctamente el publicId:', publicId);
                      return session.user.image; // Usar la URL original en este caso
                    }

                    console.log('Public ID extraído en AuthButton:', publicId);
                    return publicId;
                  })()}
                  alt={session.user?.name || "Usuario"}
                  width={48}
                  height={48}
                  crop="fill"
                  gravity="face"
                  quality="auto"
                  format="auto"
                  effects={[{ improve: true }, { sharpen: "100" }]}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Error cargando imagen en AuthButton:', session.user.image);
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              ) : (
                <Image
                  src={session.user.image || "/images/AvatarPredeterminado.webp"}
                  alt={session.user?.name || "Usuario"}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover rounded-full"
                  priority={true}
                  quality={90}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-xs sm:text-sm font-medium text-white truncate max-w-[80px] sm:max-w-none">
                {session.user?.name || "Usuario"}
              </span>
              <span className="hidden sm:block text-[10px] sm:text-xs text-gray-200 truncate sm:max-w-none">
                {session.user?.email || ""}
              </span>
            </div>
            <motion.svg
              className="w-3 h-3 sm:w-4 sm:h-4 text-gray-200 ml-0.5 sm:ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              variants={arrowVariants}
              initial="initial"
              animate={anchorEl ? "open" : "initial"}
              transition={{ duration: animationsEnabled ? 0.2 : 0 }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </motion.svg>
          </div>
        </motion.button>

        <Menu
          id="menu-appbar"
          anchorEl={anchorEl}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          keepMounted
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            className: "bg-white dark:bg-gray-800 shadow-lg rounded-lg mt-1 border border-gray-200 dark:border-gray-700"
          }}
          classes={{
            list: "py-1",
          }}
          sx={{
            "& .MuiMenu-paper": {
              maxWidth: "calc(100vw - 16px)",
              width: "auto",
              minWidth: "200px"
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg">
            <div className="menu-container py-1">
              <Link href="/api/auth/dashboard" passHref>
                <motion.div
                  className="px-4 py-3 flex items-center gap-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={() => {
                    handleClose();
                    router.push("/api/auth/dashboard");
                  }}
                  whileHover={animationsEnabled ? { x: 5 } : {}}
                  whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                >
                  <svg
                    className="w-5 h-5 text-blue-500 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">Mi Perfil</span>
                </motion.div>
              </Link>
              <Link href={session.user?.username ? `/users/${session.user.username}` : "#"} passHref>
                <motion.div
                  className="px-4 py-3 flex items-center gap-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={handleClose}
                  whileHover={animationsEnabled ? { x: 5 } : {}}
                  whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                >
                  <svg
                    className="w-5 h-5 text-blue-500 dark:text-blue-400"
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                  >
                    <path d="m1.5 13v1a.5.5 0 0 0 .3379.4731 18.9718 18.9718 0 0 0 6.1621 1.0269 18.9629 18.9629 0 0 0 6.1621-1.0269.5.5 0 0 0 .3379-.4731v-1a6.5083 6.5083 0 0 0 -4.461-6.1676 3.5 3.5 0 1 0 -4.078 0 6.5083 6.5083 0 0 0 -4.461 6.1676zm4-9a2.5 2.5 0 1 1 2.5 2.5 2.5026 2.5026 0 0 1 -2.5-2.5zm2.5 3.5a5.5066 5.5066 0 0 1 5.5 5.5v.6392a18.08 18.08 0 0 1 -11 0v-.6392a5.5066 5.5066 0 0 1 5.5-5.5z" />
                  </svg>
                  <span className="font-medium">Perfil Público</span>
                </motion.div>
              </Link>
              <Link href="/settings" passHref>
                <motion.div
                  className="px-4 py-3 flex items-center gap-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={handleClose}
                  whileHover={animationsEnabled ? { x: 5 } : {}}
                  whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                >
                  <svg
                    className="w-5 h-5 text-blue-500 dark:text-blue-400"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.5"
                      d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                    />
                  </svg>
                  <span className="font-medium">Configuración</span>
                </motion.div>
              </Link>
              <Link href="/appearance" passHref>
                <motion.div
                  className="px-4 py-3 flex items-center gap-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                  onClick={handleClose}
                  whileHover={animationsEnabled ? { x: 5 } : {}}
                  whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                >
                  <svg 
                    className="w-5 h-5 text-blue-500 dark:text-blue-400"
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="currentColor"
                  >
                    <path 
                      d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M12 2V4" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M12 20V22" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M4.93 4.93L6.34 6.34" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M17.66 17.66L19.07 19.07" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M2 12H4" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M20 12H22" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M6.34 17.66L4.93 19.07" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M19.07 4.93L17.66 6.34" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="font-medium">Apariencia</span>
                </motion.div>
              </Link>

              <div className="my-1 border-t border-gray-200 dark:border-gray-700"></div>
              {isAdmin && (
                <Link href="/admin/dashboard" passHref>
                  <motion.div
                    className="px-4 py-3 flex items-center gap-3 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={handleClose}
                    whileHover={animationsEnabled ? { x: 5 } : {}}
                    whileTap={animationsEnabled ? { scale: 0.98 } : {}}
                  >
                    <svg
                      className="w-5 h-5 text-blue-500 dark:text-blue-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M9 3H4a2 2 0 00-2 2v14a2 2 0 002 2h5m0-18h6a2 2 0 012 2v4M9 3v18m0 0h6a2 2 0 012-2V9m-8 12l6-6"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.5"
                        d="M19 9h-4m0 0V5m0 4l4-4"
                      />
                    </svg>
                    <span className="font-medium">Panel Admin</span>
                  </motion.div>
                </Link>
              )}
              <motion.div
                className="px-4 py-3 flex items-center gap-3 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleSignOut}
                whileHover={animationsEnabled ? { x: 5 } : {}}
                whileTap={animationsEnabled ? { scale: 0.98 } : {}}
              >
                <svg
                  className="w-5 h-5 text-red-500 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
                <span className="font-medium">Cerrar sesión</span>
              </motion.div>
            </div>
          </div>
        </Menu>
      </div>
    );
  }

  return (
    <div className="flex gap-1.5 sm:gap-3">
      <Link href="/api/auth/signin" passHref>
        <motion.button 
          className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 dark:bg-blue-700 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-colors"
          whileHover={animationsEnabled ? { scale: 1.05 } : {}}
          whileTap={animationsEnabled ? { scale: 0.95 } : {}}
        >
          Iniciar Sesión
        </motion.button>
      </Link>
      <Link href="/api/auth/signup" passHref>
        <motion.button 
          className="px-2 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-800 border border-blue-600 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 transition-colors"
          whileHover={animationsEnabled ? { scale: 1.05 } : {}}
          whileTap={animationsEnabled ? { scale: 0.95 } : {}}
        >
          Registrarse
        </motion.button>
      </Link>
    </div>
  );
};

export default AuthButton;
