// src/types/next-auth.d.ts
import { DefaultSession } from "next-auth";
import { Role } from "@prisma/client";

declare module "next-auth" {
  interface User {
    id: string;
    role: Role;
    username?: string | null;
    createdAt?: Date;
    favoriteSourceIds?: string[];
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      username?: string | null;
      createdAt?: Date;
      favoriteSourceIds?: string[];
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    username?: string | null;
    createdAt?: Date;
    favoriteSourceIds?: string[];
  }
}