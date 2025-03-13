import { User } from "./user";

export interface Session {
  user?: User;
  expires: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  redirectUrl?: string;
  error?: string;
}
