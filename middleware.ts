// middleware.ts
import { NextResponse } from 'next/server';
import NextAuth from "next-auth";
import authConfig from "./auth.config";

const { auth: middleware } = NextAuth(authConfig);

// Definición de rutas
const publicRoutes = new Set([
  "/",
  "/login",
  "/signup",
  "/acceso-denegado",
  "/api/auth/(.*)", // Rutas de autenticación
  "/api/public/(.*)" // APIs públicas
]);

const adminRoutes = new Set([
  "/admin(.*)", // Todas las subrutas de admin
  "/api/admin(.*)" // APIs de administración
]);

const authRoutes = new Set(["/login", "/signup"]);

export default middleware(async (req) => {
  const { nextUrl, auth } = req;
  const pathname = nextUrl.pathname;
  const isLoggedIn = !!auth?.user;
  const isAdmin = auth?.user?.role === "admin";

  // 1. Verificar rutas públicas
  if (publicRoutes.has(pathname)) {
    // Si el usuario está autenticado y accede a la página de presentación (/), redirigir a /home
    if (isLoggedIn && pathname === "/") {
      return NextResponse.redirect(new URL("/home", nextUrl));
    }
    return NextResponse.next();
  }

  // 2. Redirigir usuarios no autenticados
  if (!isLoggedIn) {
    const signInUrl = new URL("/login", nextUrl);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // 3. Verificar rutas de administrador
  if (Array.from(adminRoutes).some(route => new RegExp(route).test(pathname))) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/acceso-denegado", nextUrl));
    }
    return NextResponse.next();
  }

  // 4. Redirigir usuarios autenticados que visiten rutas de auth
  if (authRoutes.has(pathname)) {
    return NextResponse.redirect(new URL("/home", nextUrl)); // Redirigir a /home en lugar de /
  }

  // Permitir acceso a otras rutas protegidas
  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)"], // Aplica a todas las rutas excepto archivos estáticos y rutas de Next.js
};