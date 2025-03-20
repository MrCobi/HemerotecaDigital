"use client";
import { useSession, signOut } from "next-auth/react";
import React from "react";
import Link from "next/link";
import { Menu } from "@mui/material";
import styled from "styled-components";
import { CldImage } from 'next-cloudinary';
import Image from 'next/image';

const AuthButton = () => {
  const { data: session } = useSession();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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
      <div style={{ position: "relative" }}>
        <button
          onClick={handleMenu}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full overflow-hidden">
              {session.user.image && (session.user.image.includes('cloudinary') || 
              (!session.user.image.startsWith('/') && !session.user.image.startsWith('http'))) ? (
                <CldImage
                  src={session.user.image}
                  alt={session.user?.name || "Usuario"}
                  width={48}
                  height={48}
                  crop="fill"
                  gravity="face"
                  className="w-full h-full object-cover"
                  onError={(e) => {
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
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = "/images/AvatarPredeterminado.webp";
                  }}
                />
              )}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-medium text-white">
                {session.user?.name || "Usuario"}
              </span>
              <span className="text-xs text-gray-200">
                {session.user?.email || ""}
              </span>
            </div>
            <svg
              className="w-4 h-4 text-gray-200 ml-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </button>

        <Menu
          className="custom-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          PaperProps={{
            style: {
              backgroundColor: "rgb(18, 35, 82)", // Color de fondo del menú
              padding: "0", // Elimina el padding predeterminado
              borderRadius: "5px", // Ajusta el borde redondeado
              boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.2)", // Sombra personalizada
            },
          }}
        >
          <StyledWrapper>
            <div className="input">
              <Link href="/api/auth/dashboard" passHref legacyBehavior>
                <button className="value" onClick={handleClose}>
                  <svg
                    viewBox="0 0 16 16"
                    xmlns="http://www.w3.org/2000/svg"
                    data-name="Layer 2"
                  >
                    <path
                      fill="#7D8590"
                      d="m1.5 13v1a.5.5 0 0 0 .3379.4731 18.9718 18.9718 0 0 0 6.1621 1.0269 18.9629 18.9629 0 0 0 6.1621-1.0269.5.5 0 0 0 .3379-.4731v-1a6.5083 6.5083 0 0 0 -4.461-6.1676 3.5 3.5 0 1 0 -4.078 0 6.5083 6.5083 0 0 0 -4.461 6.1676zm4-9a2.5 2.5 0 1 1 2.5 2.5 2.5026 2.5026 0 0 1 -2.5-2.5zm2.5 3.5a5.5066 5.5066 0 0 1 5.5 5.5v.6392a18.08 18.08 0 0 1 -11 0v-.6392a5.5066 5.5066 0 0 1 5.5-5.5z"
                    />
                  </svg>
                  Perfil Público
                </button>
              </Link>
              <Link href="/settings" passHref legacyBehavior>
                <button className="value" onClick={handleClose}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    stroke="#ffffff"
                  >
                    <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                    <g
                      id="SVGRepo_tracerCarrier"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    ></g>
                    <g id="SVGRepo_iconCarrier">
                      <path
                        d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M19.6224 10.3954L18.5247 7.7448L20 6L18 4L16.2647 5.48295L13.5578 4.36974L12.9353 2H10.981L10.3491 4.40113L7.70441 5.51596L6 4L4 6L5.45337 7.78885L4.3725 10.4463L2 11V13L4.40111 13.6555L5.51575 16.2997L4 18L6 20L7.79116 18.5403L10.397 19.6123L11 22H13L13.6045 19.6132L16.2551 18.5155L18 20L20 18L18.5159 16.2494L19.6139 13.598L22 13V11L19.6224 10.3954Z"
                        stroke="#ffffff"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  </svg>
                  Configuración
                </button>
              </Link>
              <Link href="/appearance" passHref legacyBehavior>
                <button className="value" onClick={handleClose}>
                  <svg 
                    width="18" 
                    height="18" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path 
                      d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M12 2V4" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M12 20V22" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M4.93 4.93L6.34 6.34" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M17.66 17.66L19.07 19.07" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M2 12H4" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M20 12H22" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M6.34 17.66L4.93 19.07" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                    <path 
                      d="M19.07 4.93L17.66 6.34" 
                      stroke="#ffffff" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                    />
                  </svg>
                  Apariencia
                </button>
              </Link>
              {isAdmin && (
                <Link href="/admin/users" passHref legacyBehavior>
                  <button className="value" onClick={handleClose}>
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      stroke="#ffffff"
                    >
                      <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                      <g
                        id="SVGRepo_tracerCarrier"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      ></g>
                      <g id="SVGRepo_iconCarrier">
                        {" "}
                        <path
                          d="M16 9L20 5V16H4V5L6 7M8 9L12 5L14 7M4 19H20"
                          stroke="#ffffff"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        ></path>{" "}
                      </g>
                    </svg>
                    Administración
                  </button>
                </Link>
              )}

              <button className="value" onClick={handleSignOut}>
                <svg
                  fill="#ffffff"
                  version="1.1"
                  id="Capa_1"
                  xmlns="http://www.w3.org/2000/svg"
                  xmlnsXlink="http://www.w3.org/1999/xlink"
                  viewBox="0 0 492.5 492.5"
                  xmlSpace="preserve"
                  stroke="#ffffff"
                >
                  <g id="SVGRepo_bgCarrier" strokeWidth="0"></g>
                  <g
                    id="SVGRepo_tracerCarrier"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  ></g>
                  <g id="SVGRepo_iconCarrier">
                    {" "}
                    <g>
                      {" "}
                      <path d="M184.646,0v21.72H99.704v433.358h31.403V53.123h53.539V492.5l208.15-37.422v-61.235V37.5L184.646,0z M222.938,263.129 c-6.997,0-12.67-7.381-12.67-16.486c0-9.104,5.673-16.485,12.67-16.485s12.67,7.381,12.67,16.485 C235.608,255.748,229.935,263.129,222.938,263.129z"></path>{" "}
                    </g>{" "}
                  </g>
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </StyledWrapper>
        </Menu>
      </div>
    );
  }

  return (
    <div className="contenedor-botones">
      <StyledWrapper>
        <Link href="/api/auth/signin" passHref legacyBehavior>
          <button className="boton-elegante">Iniciar Sesión</button>
        </Link>
        <Link href="/api/auth/signup" passHref legacyBehavior>
          <button className="boton-elegante">Registrarse</button>
        </Link>
      </StyledWrapper>
    </div>
  );
};

const StyledWrapper = styled.div`
  .menu-appbar {
    background-color: #3b82f6;
  }

  .input {
    display: flex;
    flex-direction: column;
    width: 200px;
    background-color: rgb(18, 35, 82);
    justify-content: center;
    border-radius: 5px;
  }

  .value {
    background-color: transparent;
    border: none;
    padding: 10px;
    color: white;
    display: flex;
    position: relative;
    gap: 5px;
    cursor: pointer;
    border-radius: 4px;
  }

  .value:not(:active):hover,
  .value:focus {
    background-color: rgb(22, 48, 89);
  }

  .value:focus,
  .value:active {
    background-color: #1e40af;
    outline: none;
  }

  .value::before {
    content: "";
    position: absolute;
    top: 5px;
    left: -10px;
    width: 5px;
    height: 80%;
    background-color: #3b82f6;
    border-radius: 5px;
    opacity: 0;
  }

  .value:focus::before,
  .value:active::before {
    opacity: 1;
  }

  .value svg {
    width: 15px;
  }

  .input:hover > :not(.value:hover) {
    transition: 300ms;
    filter: blur(1px);
    transform: scale(0.95, 0.95);
  }

  .contenedor-botones {
    display: flex;
    text-align: center;
    white-space: nowrap;
  }

  .boton-elegante {
    display: inline-block;
    padding: 10px 20px;
    border: 2px solid #3b82f6;
    background-color: #1e3a8a;
    color: #ffffff;
    font-size: 1rem;
    cursor: pointer;
    border-radius: 20px;
    transition: all 0.4s ease;
    outline: none;
    position: relative;
    overflow: hidden;
    font-weight: bold;
    margin: 5px;
  }

  .boton-elegante::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle,
      rgba(255, 255, 255, 0.25) 0%,
      rgba(255, 255, 255, 0) 70%
    );
    transform: scale(0);
    transition: transform 0.5s ease;
  }

  .boton-elegante:hover::after {
    transform: scale(4);
  }

  .boton-elegante:hover {
    border-color: #2563eb;
    background: #1e40af;
  }
`;

export default AuthButton;
