import type { BeltLevel, RoundSubmission, Partner } from "@/lib/types";

export type DraftRound = {
  id: string;
  partnerName: string;
  partnerBelt: BeltLevel | null;
  submissionsFor: RoundSubmission[];
  submissionsAgainst: RoundSubmission[];
  submissionsForCount: number;
  submissionsAgainstCount: number;
  dominantPositions: string[];
  stuckPositions: string[];
  notes: string;
  notesExpanded: boolean;
};

export type BeltOption = {
  value: BeltLevel;
  label: string;
  dotClass: string;
};

export const beltOptions: BeltOption[] = [
  { value: "white", label: "White belt", dotClass: "bg-slate-50 border-slate-300" },
  { value: "blue", label: "Blue belt", dotClass: "bg-blue-500 border-blue-600" },
  { value: "purple", label: "Purple belt", dotClass: "bg-purple-500 border-purple-600" },
  { value: "brown", label: "Brown belt", dotClass: "bg-amber-700 border-amber-800" },
  { value: "black", label: "Black belt", dotClass: "bg-zinc-900 border-zinc-950" },
  { value: "unknown", label: "Unknown", dotClass: "bg-zinc-200 border-zinc-300" },
];

export function getBeltOption(belt: BeltLevel | null): BeltOption | undefined {
  return belt ? beltOptions.find((option) => option.value === belt) : undefined;
}

export function createDraftRound(): DraftRound {
  const { createId } = require("@/lib/utils");
  return {
    id: createId(),
    partnerName: "",
    partnerBelt: null,
    submissionsFor: [],
    submissionsAgainst: [],
    submissionsForCount: 0,
    submissionsAgainstCount: 0,
    dominantPositions: [],
    stuckPositions: [],
    notes: "",
    notesExpanded: false,
  };
}
