// middleware.ts
import { NextResponse } from 'next/server';
import NextAuth from "next-auth";
import authConfig from "./auth.config";

// Usar configuración de NextAuth con verificación estricta de token
const { auth: middleware } = NextAuth({
  ...authConfig,
  // Asegurar que se verifique el token correctamente
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30 minutos
  },
  // Aumentar seguridad
  jwt: {
    maxAge: 30 * 60, // 30 minutos
  },
  // Confiar en hosts de desarrollo
  trustHost: process.env.NODE_ENV === 'development'
});

// Definición de rutas
const publicRoutes = new Set([
  "/",                     // Página principal
  "/api/auth/signin",      // Página de inicio de sesión en la ruta actual
  "/api/auth/signup",      // Página de registro en la ruta actual
  "/acceso-denegado",      // Página de acceso denegado
  "/api/auth/(.*)",        // Rutas de autenticación (callbacks, etc.)
  "/api/public/(.*)",      // APIs públicas
  "/auth/verify-email",    // Página de verificación de correo
  "/auth/verify-success",  // Página de éxito de verificación
  "/auth/verify-error",    // Página de error de verificación
  "/auth/verification-pending",  // Página de verificación pendiente
  "/auth/resend-verification",    // Página para reenviar verificación
  "/auth/reset-password",  // Página de restablecimiento de contraseña
  "/auth/reset-password/(.*)",  // Subrutas de restablecimiento de contraseña
  "/api/articles",         // API pública de artículos
  "/api/categories"       // API pública de categorías
]);

const adminRoutes = new Set([
  "/admin(.*)",            // Todas las subrutas de admin
  "/api/admin(.*)"         // APIs de administración
]);

const authRoutes = new Set([
  "/api/auth/signin", 
  "/api/auth/signup"
]);

// Rutas que no requieren verificación de email pero sí autenticación
const unverifiedAllowedRoutes = new Set([
  "/auth/verification-pending",
  "/auth/resend-verification",
  "/api/auth/resend-verification"
]);

export default middleware(async (req) => {
  const { nextUrl, auth } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!auth?.user;
  const isAdmin = auth?.user?.role === "admin";
  const isEmailVerified = !!auth?.user?.emailVerified;

  // Forzar verificación de cookie de sesión en cada solicitud
  // Bypass de caché para rutas protegidas
  const headers = new Headers(req.headers);
  headers.set('x-middleware-cache', 'no-cache');
  
  // 1. Verificar rutas públicas
  if (publicRoutes.has(pathname) || Array.from(publicRoutes).some(route => new RegExp(`^${route}$`).test(pathname))) {
    // Si el usuario está autenticado y accede a la página de presentación (/), redirigir a /home
    if (isLoggedIn && pathname === "/") {
      return NextResponse.redirect(new URL("/home", nextUrl));
    }
    return NextResponse.next({
      headers: headers
    });
  }

  // 2. Manejar rutas API - Bloquear todas excepto las públicas ya verificadas anteriormente
  if (pathname.startsWith('/api/')) {
    if (!isLoggedIn) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "No autenticado. Debe iniciar sesión para acceder a esta API."
        }),
        { 
          status: 401,
          headers: { 
            'content-type': 'application/json',
            'cache-control': 'no-store, max-age=0' 
          }
        }
      );
    }
    
    // Verificar si el correo electrónico está verificado para APIs protegidas
    if (!isEmailVerified && !unverifiedAllowedRoutes.has(pathname) && 
        !Array.from(unverifiedAllowedRoutes).some(route => new RegExp(`^${route}$`).test(pathname))) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          message: "Cuenta no verificada. Por favor, verifique su correo electrónico."
        }),
        { 
          status: 403,
          headers: { 
            'content-type': 'application/json',
            'cache-control': 'no-store, max-age=0' 
          }
        }
      );
    }
  }

  // 3. Redirigir usuarios no autenticados a páginas normales
  if (!isLoggedIn) {
    // Para depuración
    console.log("Usuario no autenticado intentando acceder a:", pathname);
    
    // Guardamos la URL a la que intentaba acceder para redirigir después de iniciar sesión
    const signInUrl = new URL("/api/auth/signin", nextUrl);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 4. Verificar si el correo electrónico está verificado
  if (!isEmailVerified && !unverifiedAllowedRoutes.has(pathname) && 
      !Array.from(unverifiedAllowedRoutes).some(route => new RegExp(`^${route}$`).test(pathname))) {
    console.log("Usuario no verificado intentando acceder a:", pathname);
    return NextResponse.redirect(new URL("/auth/verification-pending", nextUrl));
  }

  // 5. Verificar rutas de administrador
  if (Array.from(adminRoutes).some(route => new RegExp(route).test(pathname))) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/acceso-denegado", nextUrl));
    }
    return NextResponse.next({
      headers: headers
    });
  }

  // 6. Redirigir usuarios autenticados que visiten rutas de auth
  if (authRoutes.has(pathname)) {
    return NextResponse.redirect(new URL("/home", nextUrl));
  }

  // Permitir acceso a otras rutas protegidas
  return NextResponse.next({
    headers: headers
  });
});

export const config = {
  matcher: [
    // Excluir archivos estáticos y rutas de Next.js
    "/((?!.*\\..*|_next).*)",
    // Incluir explícitamente todas las rutas API
    "/api/:path*"
  ],
};