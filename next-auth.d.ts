// types/next-auth.d.ts
import { DefaultSession, DefaultUser } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    emailVerified?: Date | null;
    role: Role;
    username?: string | null;
    createdAt: Date;
    favoriteSourceIds?: string[];
    accessToken?: string;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      username?: string | null;
      createdAt?: Date;
      favoriteSourceIds?: string[];
      accessToken?: string;
    } & DefaultSession["user"];
  }

  interface JWT {
    id?: string;
    role?: Role;
    username?: string | null;
    createdAt?: Date;
    favoriteSourceIds?: string[];
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    username?: string | null;
    createdAt?: Date;
    favoriteSourceIds?: string[];
    accessToken?: string;
  }
}