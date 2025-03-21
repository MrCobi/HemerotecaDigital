export interface ActivityHistory {
    id: string;
    type: string;
    createdAt: Date;
    userId: string;
    sourceName: string | null;
    sourceId: string | null;
    targetName: string | null;
    targetId: string | null;
    targetType: string | null;
    details: string | null;
  }