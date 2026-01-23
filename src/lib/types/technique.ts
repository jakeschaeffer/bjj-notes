import type { ID } from "./base";

export type TechniqueCategory =
  | "submission"
  | "sweep"
  | "pass"
  | "escape"
  | "takedown"
  | "transition"
  | "guard-retention"
  | "control";

export type SubmissionType =
  | "choke"
  | "armlock"
  | "shoulder-lock"
  | "wristlock"
  | "leglock"
  | "spine-lock"
  | "compression";

export interface Technique {
  id: ID;
  name: string;
  category: TechniqueCategory;
  positionFromId: ID;
  positionToId?: ID | null;
  submissionType: SubmissionType | null;
  giApplicable: boolean;
  nogiApplicable: boolean;
  aliases: string[];
  keyDetails?: string[];
  isCustom?: boolean;
}
