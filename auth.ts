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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
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
          response_type: "code"
        }
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
      // Para usuarios que se autentican con Google, marcarlos automáticamente como verificados
      if (account?.provider === "google") {
        // Si el correo está verificado en Google, lo consideramos verificado en nuestra app
        if (profile?.email_verified) {
          // Si es la primera vez que el usuario inicia sesión con Google
          if (user) {
            await prisma.user.update({
              where: { id: user.id },
              data: { emailVerified: new Date() }
            });
          }
          return true;
        }
      }
      
      return true; // Para otros providers, seguimos el flujo normal
    },
    async jwt({ token, user, trigger, session }) {
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
        token.favoriteSourceIds = (user as any).favoriteSourceIds;
        token.accessToken = (user as any).accessToken;
        token.bio = (user as any).bio;
      }

      // Si se está actualizando la sesión manualmente con el método update()
      if (trigger === "update" && session) {
        console.log("Actualizando sesión desde trigger update:", session);
        
        // Actualizar los campos del token con los datos del nuevo session
        if (session.user) {
          Object.assign(token, {
            name: session.user.name,
            username: session.user.username,
            image: session.user.image,
            bio: session.user.bio,
            // No actualizamos email ni campos sensibles
          });
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
          favoriteSourceIds: token.favoriteSourceIds as string[] | undefined
        },
        accessToken: token.accessToken as string
      };
    }
  }
});