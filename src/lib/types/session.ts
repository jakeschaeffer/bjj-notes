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

export type BeltLevel = "white" | "blue" | "purple" | "brown" | "black" | "unknown";

export interface SessionTechnique {
  id: ID;
  sessionId: ID;
  positionId: ID | null;
  techniqueId: ID;
  keyDetails: string[];
  notes: string;
}

export interface SessionPositionNote {
  id: ID;
  sessionId: ID;
  positionId: ID;
  keyDetails: string[];
  notes: string;
}

export interface RoundSubmission {
  id: ID;
  techniqueId: ID;
  positionId: ID | null;
}

export interface SparringRound {
  id: ID;
  partnerName: string | null;
  partnerBelt: BeltLevel | null;
  submissionsFor: RoundSubmission[];
  submissionsAgainst: RoundSubmission[];
  submissionsForCount: number;
  submissionsAgainstCount: number;
  dominantPositions: ID[];
  stuckPositions: ID[];
  notes: string;
}

export interface PartnerName {
  id: ID;
  name: string;
  roundCount: number;
  lastUsedAt: Timestamp;
}

export interface Partner {
  id: ID;
  name: string;
  belt: BeltLevel | null;
  notes: string;
  roundCount: number;
  lastRolledAt: Timestamp | null;
  createdAt: Timestamp;
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
  positionNotes: SessionPositionNote[];
  sparringRounds: SparringRound[];
  notes: string;
  insights: string[];
  goalsForNext: string[];
  legacySparring?: {
    rounds: number;
    subsAchieved: number;
    subsReceived: number;
    notes: string;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
