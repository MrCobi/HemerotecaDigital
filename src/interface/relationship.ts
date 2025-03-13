import { User } from "./user";

export interface Follow {
  id: string;
  followerId: string;
  followingId: string;
  createdAt: Date;
  updatedAt: Date;
  follower?: FollowerUser;
  following?: User;
}

export interface FollowerUser {
  id: string;
  name?: string | null;
  username?: string | null;
  image?: string | null;
  bio?: string | null;
  role: string;
}

export interface FollowerResponse {
  id: string;
  name?: string | null;
  username?: string | null;
  image?: string | null;
  bio?: string | null;
  role: string;
  followingSince: Date;
}
