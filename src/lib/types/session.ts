import type { DateString, ID, Timestamp } from "./base";

export type SessionType =
  | "regular-class"
  | "open-mat"
  | "private"
  | "competition"
  | "seminar"
  | "drilling-only";

export type GiNoGi = "gi" | "nogi" | "both";

export type ConfidenceLevel = 1 | 2 | 3 | 4 | 5;

export interface SessionTechnique {
  id: ID;
  sessionId: ID;
  techniqueId: ID | null;
  techniqueNameOverride: string | null;
  positionId: ID | null;
  positionNameOverride: string | null;
  wasNew: boolean;
  confidence: ConfidenceLevel;
  notes: string;
  keyDetailsLearned: string[];
}

export interface Session {
  id: ID;
  userId: ID;
  date: DateString;
  sessionType: SessionType;
  giOrNogi: GiNoGi;
  durationMinutes: number | null;
  energyLevel: ConfidenceLevel | null;
  techniques: SessionTechnique[];
  notes: string;
  insights: string[];
  goalsForNext: string[];
  sparringRounds: number;
  subsAchieved: number;
  subsReceived: number;
  sparringNotes: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
