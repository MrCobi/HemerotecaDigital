import { Source } from "./source";

export interface Favorite {
  id?: string;
  userId: string;
  sourceId: string;
  createdAt: Date;
  updatedAt?: Date;
  source?: Source;
}
