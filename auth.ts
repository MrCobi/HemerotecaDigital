// @/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";
import type { Role } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/zod";
import jwt from "jsonwebtoken";
import { isProduction } from "@/lib/environment";

// Adaptador personalizado para manejar correctamente emailVerified
const customAdapter = {
  ...PrismaAdapter(prisma),
  createUser: async (data: any) => {
    // Asegurar que emailVerified esté establecido si viene de un proveedor OAuth
    if (data.email && !data.emailVerified) {
      data.emailVerified = new Date();
    }
    
    // Generar una contraseña temporal aleatoria para usuarios OAuth
    if (!data.password) {
      // Generar una contraseña temporal compleja
      const tempPassword = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
      
      // Hash de la contraseña temporal
      const bcrypt = require('bcryptjs');
      data.password = await bcrypt.hash(tempPassword, 10);
      
      // Guardar que este usuario necesita establecer una contraseña
      // Establecer explícitamente a true para evitar valores nulos/indefinidos
      data.needsPasswordChange = true;
      console.log("Usuario OAuth creado con needsPasswordChange = true");
    } else {
      // En el caso de un registro directo, no necesita cambiar contraseña
      data.needsPasswordChange = false;
      console.log("Usuario normal creado con needsPasswordChange = false");
    }
    
    // Llamar al adaptador original
    return await prisma.user.create({
      data
    });
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: customAdapter as any,
  trustHost: true,
  secret: process.env.AUTH_SECRET, // Asegúrate de tener esto en tu .env
  pages: {
    signIn: "/api/auth/signin",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile"
        }
      },
      profile(profile) {
        // Generar username a partir del email o nombre
        const username = profile.email
          ? profile.email.split('@')[0] + Math.floor(Math.random() * 1000).toString()
          : (profile.name || 'user') + Math.floor(Math.random() * 1000).toString();
        
        return {
          id: profile.sub,
          name: profile.name || profile.given_name + ' ' + profile.family_name,
          email: profile.email,
          image: profile.picture,
          // Agregar campos adicionales que tu modelo User requiere
          role: "user",
          emailVerified: new Date(), // Marcar como verificado automáticamente
          username: username.toLowerCase().replace(/[^a-z0-9]/g, ''), // Username sin caracteres especiales
        };
      }
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" },
        autoVerified: { label: "Auto Verified", type: "text" }
      },
      authorize: async (credentials) => {
        try {
          // Verificar si es un inicio de sesión automático después de la verificación
          if (credentials?.autoVerified === "true" && credentials?.email) {
            const email = credentials.email as string;
            console.log("Auto-verification login attempt for:", email);
            
            // Buscar el usuario por email sin validar contraseña
            const verifiedUser = await prisma.user.findUnique({
              where: { email: email.toLowerCase() },
              select: {
                id: true,
                email: true,
                name: true,
                bio: true,
                role: true,
                username: true,
                image: true,
                createdAt: true,
                emailVerified: true,
                favoriteSources: { select: { sourceId: true } }
              }
            });
            
            // Verificar que el usuario existe y tiene email verificado
            if (verifiedUser && verifiedUser.emailVerified) {
              console.log("Auto-verification login successful");
              
              // Generar accessToken
              const accessToken = jwt.sign(
                { 
                  userId: verifiedUser.id,
                  role: verifiedUser.role,
                  username: verifiedUser.username
                },
                process.env.AUTH_SECRET!,
                { expiresIn: '1h' }
              );
              
              return {
                id: verifiedUser.id,
                email: verifiedUser.email,
                name: verifiedUser.name,
                role: verifiedUser.role,
                username: verifiedUser.username,
                image: verifiedUser.image,
                createdAt: verifiedUser.createdAt,
                emailVerified: verifiedUser.emailVerified,
                favoriteSourceIds: verifiedUser.favoriteSources.map(fs => fs.sourceId),
                accessToken
              };
            } else {
              console.error("Auto-verification login failed: user not found or not verified");
              return null;
            }
          }
          
          // Flujo de inicio de sesión normal
          const parsed = loginSchema.safeParse(credentials);
          if (!parsed.success) throw new Error("Datos inválidos");

          const user = await prisma.user.findUnique({
            where: { email: parsed.data.email.toLowerCase() },
            select: {
              id: true,
              email: true,
              name: true,
              bio: true,
              role: true,
              username: true,
              password: true,
              image: true,
              createdAt: true,
              emailVerified: true,
              favoriteSources: { select: { sourceId: true } }
            }
          });

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(parsed.data.password, user.password);
          if (!isValid) return null;

          // Verificar si el correo está verificado en producción
          if (isProduction() && !user.emailVerified) {
            throw new Error("email_not_verified");
          }

          // Generar accessToken
          const accessToken = jwt.sign(
            { 
              userId: user.id,
              role: user.role,
              username: user.username
            }, // Añadir más claims necesarios
            process.env.AUTH_SECRET!,
            { expiresIn: '1h' }
          );

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            username: user.username,
            image: user.image,
            createdAt: user.createdAt,
            emailVerified: user.emailVerified,
            favoriteSourceIds: user.favoriteSources.map(fs => fs.sourceId),
            accessToken // Añadir el token aquí
          };
        } catch (error) {
          if (error instanceof Error && error.message === 'email_not_verified') {
            throw new Error("email_not_verified");
          }
          return null;
        }
      }
    })
  ],
  callbacks: {
    async signIn({ account, profile, user }) {
      // Para usuarios que se autentican con Google
      if (account?.provider === "google") {
        // Si el correo está verificado en Google, procedemos con la autenticación
        if (profile?.email_verified) {
          try {
            // Si el usuario no existe, NextAuth + PrismaAdapter lo crearán automáticamente
            if (user && profile?.email) {
              // Buscar si existe un usuario con este email
              const existingUser = await prisma.user.findUnique({
                where: { email: profile.email.toLowerCase() }
              });
              
              // Si el usuario ya existe, asegúrate de que tenga email verificado
              if (existingUser) {
                if (!existingUser.emailVerified) {
                  await prisma.user.update({
                    where: { id: existingUser.id },
                    data: { emailVerified: new Date() }
                  });
                }
              }
              // Si no existe, el adapter se encargará de crearlo
            }
          } catch (error) {
            // Registra el error pero permite continuar la autenticación
            console.error('Error procesando OAuth de Google:', error);
          }
          return true;
        }
      }
      
      return true; // Para otros providers, seguimos el flujo normal
    },
    async jwt({ token, user, account, trigger, session }) {
      // Actualización inicial cuando el usuario hace login
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.name = user.name;
        token.email = user.email;
        token.image = user.image;
        token.createdAt = user.createdAt;
        token.emailVerified = (user as any).emailVerified;
        
        // Si tenemos información de la cuenta, guardar el proveedor
        if (account) {
          token.provider = account.provider;
          console.log(`JWT: Usuario logueado con proveedor ${account.provider}`);
        }
        
        // Asegurar que needsPasswordChange siempre tenga un valor booleano
        // Importante: convertir explícitamente a booleano para evitar nulos/undefined
        token.needsPasswordChange = (user as any).needsPasswordChange === true;
        console.log(`JWT: Estableciendo needsPasswordChange = ${token.needsPasswordChange} para ${user.email}`);
        
        token.favoriteSourceIds = (user as any).favoriteSourceIds;
        token.accessToken = (user as any).accessToken;
        token.bio = (user as any).bio;
        
        // Agregar información sobre el estado de la contraseña 
        // (solo si hay o no contraseña, no su valor)
        if ((user as any).password) {
          token.hasPassword = true;
        } else {
          token.hasPassword = false;
        }
      }

      // Si se está actualizando la sesión manualmente con el método update()
      if (trigger === "update" && session) {
        console.log("Actualizando sesión desde trigger update:", session);
        
        // Actualizar los campos del token con los datos del nuevo session
        if (session.user) {
          // Capturar el antiguo valor de needsPasswordChange antes de la actualización
          const oldNeedsPasswordChange = token.needsPasswordChange;
          
          Object.assign(token, {
            name: session.user.name,
            username: session.user.username,
            image: session.user.image,
            bio: session.user.bio,
            // Actualizar needsPasswordChange si está presente en la actualización
            ...(session.user.needsPasswordChange !== undefined && {
              needsPasswordChange: session.user.needsPasswordChange
            }),
            // No actualizamos email ni otros campos sensibles
          });
          
          // Registrar cambios en needsPasswordChange para debugging
          if (oldNeedsPasswordChange !== token.needsPasswordChange) {
            console.log(`JWT: Valor de needsPasswordChange cambiado de ${oldNeedsPasswordChange} a ${token.needsPasswordChange}`);
          }
        }
      }
      
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          name: token.name as string | null,
          role: token.role as Role,
          username: token.username as string | null,
          email: token.email as string | null,
          image: token.image as string | null,
          bio: token.bio as string | null,
          createdAt: token.createdAt as Date,
          emailVerified: token.emailVerified as Date | null,
          needsPasswordChange: token.needsPasswordChange as boolean | undefined,
          favoriteSourceIds: token.favoriteSourceIds as string[] | undefined
        },
        accessToken: token.accessToken as string
      };
    }
  }
});