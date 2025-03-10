// next-auth.d.ts
import { DefaultSession } from "next-auth";
import "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    emailVerified?: Date | null;
    role: string;
    username?: string | null;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      username?: string | null;
      createdAt?: string; // Asegúrate de que el tipo sea correcto
      favoriteSourceIds?: string[];
    } & DefaultSession["user"];
  }
}