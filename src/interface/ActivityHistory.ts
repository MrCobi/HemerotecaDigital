export interface ActivityHistory {
    id: string;
    type: string;
    createdAt: Date;
    userId: string;
    userName: string | null;
    sourceName: string | null;
  }
  