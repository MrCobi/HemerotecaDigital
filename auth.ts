// @/auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/db";
import type { Role } from "@prisma/client";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/zod";
import jwt from "jsonwebtoken";
import { isProduction } from "@/lib/environment";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as any,
  trustHost: true,
  secret: process.env.AUTH_SECRET, // Asegúrate de tener esto en tu .env
  pages: {
    signIn: "/login",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Contraseña", type: "password" }
      },
      authorize: async (credentials) => {
        try {
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
    async jwt({ token, user }) {
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
        token.accessToken = (user as any).accessToken; // Añadir esta línea
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
          createdAt: token.createdAt as Date,
          emailVerified: token.emailVerified as Date | null,
          favoriteSourceIds: token.favoriteSourceIds as string[] | undefined
        },
        accessToken: token.accessToken as string // Añadir esta línea
      };
    }
  }
});