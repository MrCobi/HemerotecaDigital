import { NextResponse, NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Lista explícita de rutas públicas que siempre están permitidas
  const publicPaths = [
    '/api/auth/signin',
    '/api/auth/signup',
    '/api/auth/callback',
    '/acceso-denegado',
    '/auth/verify-email',
    '/auth/verify-success',
    '/auth/verify-error',
    '/auth/verification-pending',
    '/auth/resend-verification',
    '/auth/reset-password',
  ];
  
  // Lista de patrones que deberían ser públicos
  const publicPatterns = [
    /^\/api\/auth\/.*/,         // Rutas API de autenticación
    /^\/_next\/.*/,             // Archivos Next.js
    /^\/(favicon\.ico|robots\.txt|sitemap\.xml)$/,  // Archivos estáticos comunes
    /^\/auth\/reset-password\/.*/,  // Reset de contraseña
  ];
  
  // Comprueba si la ruta actual es pública
  const isPublicPath = publicPaths.includes(pathname) || 
                       publicPatterns.some(pattern => pattern.test(pathname));
  
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Para rutas no públicas, verificar el token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });
  
  // Si no hay token, redirigir a inicio de sesión
  if (!token) {
    const url = new URL('/api/auth/signin', request.url);
    url.searchParams.set('callbackUrl', encodeURI(request.url));
    return NextResponse.redirect(url);
  }
  
  // Verificar si el email está verificado para rutas que lo requieran
  const isEmailVerified = token.emailVerified ? true : false;
  const unverifiedAllowedPaths = [
    '/auth/verification-pending',
    '/auth/resend-verification',
    '/api/auth/resend-verification'
  ];
  
  if (!isEmailVerified && !unverifiedAllowedPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/auth/verification-pending', request.url));
  }
  
  // Verificar acceso a áreas admin
  const isAdmin = token.role === "admin";
  if (pathname.startsWith('/admin') && !isAdmin) {
    return NextResponse.redirect(new URL('/acceso-denegado', request.url));
  }
  
  return NextResponse.next();
}

export const config = {
  // Este matcher capturará todas las rutas, excepto los archivos estáticos y recursos de Next.js
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
};