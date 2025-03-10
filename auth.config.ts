// src/auth.config.ts
import bcryptjs from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "./lib/zod";
import prisma from "./lib/db";
import { Role } from "@prisma/client";

export const authOptions: NextAuthConfig = {
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
              role: true,
              username: true,
              password: true,
              emailVerified: true
            }
          });

          if (!user) throw new Error("Usuario no encontrado");
          if (!user.password) throw new Error("Cuenta registrada con otro método");
          // if (!user.emailVerified) throw new Error("Email no verificado");

          const isValid = await bcryptjs.compare(
            parsed.data.password,
            user.password
          );

          if (!isValid) throw new Error("Contraseña incorrecta");

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            username: user.username || undefined
          };

        } catch (error) {
          console.error("Error en autenticación:", error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: "/login",
    error: "/auth/error"
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 días
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Solo incluir datos esenciales
        token.id = user.id;
        token.role = user.role;
        token.basePermissions = {
          isAdmin: user.role === "admin",
          isVerified: !!user.emailVerified
        };
      }
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        user: {
          ...session.user,
          id: token.id as string,
          role: token.role as Role,
          permissions: token.basePermissions
        }
      };
    }
  }
};

export default authOptions;