import type { ID, Timestamp } from "./base";

export interface UserTag {
  id: ID;
  tag: string;
  usageCount: number;
  createdAt: Timestamp;
  lastUsedAt: Timestamp;
}

export interface TechniqueProgress {
  id: ID;
  techniqueId: ID;
  firstSeenAt: Timestamp;
  lastDrilledAt: Timestamp;
  timesDrilled: number;
}
