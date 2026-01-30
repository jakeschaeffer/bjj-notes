import Fuse from "fuse.js";

import { buildTaxonomyIndex } from "@/lib/taxonomy";
import type { Position, Technique } from "@/lib/types";

export type TaxonomyIndex = ReturnType<typeof buildTaxonomyIndex>;

export type MatchResult<T> = {
  item: T;
  score: number;
};

export type PositionMatch = MatchResult<Position> | null;
export type TechniqueMatch = MatchResult<Technique> | null;

const POSITION_MATCH_THRESHOLD = 0.5;
const TECHNIQUE_MATCH_THRESHOLD = 0.5;

export function createPositionMatcher(index: TaxonomyIndex) {
  const positions = index.positions.map((position) => ({
    position,
    name: position.name,
    slug: position.slug,
    searchLabel: `${position.name} ${index.getFullPath(position.id)}`.toLowerCase(),
  }));

  const fuse = new Fuse(positions, {
    keys: [
      { name: "name", weight: 1 },
      { name: "slug", weight: 0.5 },
      { name: "searchLabel", weight: 0.7 },
    ],
    threshold: POSITION_MATCH_THRESHOLD,
    includeScore: true,
  });

  return function matchPosition(name: string): PositionMatch {
    if (!name.trim()) {
      return null;
    }

    const results = fuse.search(name);
    if (results.length === 0 || results[0].score === undefined) {
      return null;
    }

    const best = results[0];
    if (best.score === undefined || best.score > POSITION_MATCH_THRESHOLD) {
      return null;
    }

    return {
      item: best.item.position,
      score: 1 - best.score,
    };
  };
}

export function createTechniqueMatcher(index: TaxonomyIndex) {
  const techniques = index.techniques.map((technique) => ({
    technique,
    name: technique.name,
    aliases: technique.aliases ?? [],
    searchLabel: `${technique.name} ${(technique.aliases ?? []).join(" ")} ${index.getFullPath(technique.positionFromId)}`.toLowerCase(),
  }));

  const fuse = new Fuse(techniques, {
    keys: [
      { name: "name", weight: 1 },
      { name: "aliases", weight: 0.8 },
      { name: "searchLabel", weight: 0.6 },
    ],
    threshold: TECHNIQUE_MATCH_THRESHOLD,
    includeScore: true,
  });

  return function matchTechnique(
    name: string,
    positionId?: string | null,
  ): TechniqueMatch {
    if (!name.trim()) {
      return null;
    }

    const results = fuse.search(name);
    if (results.length === 0) {
      return null;
    }

    // If we have a position, prefer techniques from that position
    if (positionId) {
      const positionMatch = results.find(
        (r) =>
          r.item.technique.positionFromId === positionId &&
          r.score !== undefined &&
          r.score <= TECHNIQUE_MATCH_THRESHOLD,
      );
      if (positionMatch && positionMatch.score !== undefined) {
        return {
          item: positionMatch.item.technique,
          score: 1 - positionMatch.score,
        };
      }
    }

    const best = results[0];
    if (best.score === undefined || best.score > TECHNIQUE_MATCH_THRESHOLD) {
      return null;
    }

    return {
      item: best.item.technique,
      score: 1 - best.score,
    };
  };
}

export type ExtractedTechnique = {
  positionName: string;
  techniqueName: string;
  notes: string;
  keyDetails: string[];
};

export type ExtractedPositionNote = {
  positionName: string;
  notes: string;
  keyDetails: string[];
};

export type ExtractedSparringRound = {
  partnerName: string;
  partnerBelt: string;
  submissionsFor: string[];
  submissionsAgainst: string[];
  dominantPositions: string[];
  stuckPositions: string[];
  notes: string;
};

export type ExtractedSession = {
  date: string;
  giOrNogi: string;
  sessionType: string;
  techniques: ExtractedTechnique[];
  positionNotes: ExtractedPositionNote[];
};

export type ExtractionPayload = {
  session: ExtractedSession;
  sparringRounds: ExtractedSparringRound[];
};

export type MatchedTechnique = {
  id: string;
  positionName: string;
  positionMatch: PositionMatch;
  techniqueName: string;
  techniqueMatch: TechniqueMatch;
  notes: string;
  keyDetails: string[];
};

export type MatchedPositionNote = {
  id: string;
  positionName: string;
  positionMatch: PositionMatch;
  notes: string;
  keyDetails: string[];
};

export type MatchedSubmission = {
  name: string;
  techniqueMatch: TechniqueMatch;
};

export type MatchedSparringRound = {
  id: string;
  partnerName: string;
  partnerBelt: string;
  submissionsFor: MatchedSubmission[];
  submissionsAgainst: MatchedSubmission[];
  dominantPositions: string[];
  stuckPositions: string[];
  notes: string;
};

export type MatchedExtraction = {
  session: {
    date: string;
    giOrNogi: "gi" | "nogi" | "both" | null;
    sessionType: string;
    techniques: MatchedTechnique[];
    positionNotes: MatchedPositionNote[];
  };
  sparringRounds: MatchedSparringRound[];
};

function parseGiOrNogi(value: string): "gi" | "nogi" | "both" | null {
  const normalized = value.toLowerCase().trim();
  if (normalized === "gi") return "gi";
  if (normalized === "nogi" || normalized === "no-gi" || normalized === "no gi") return "nogi";
  if (normalized === "both") return "both";
  return null;
}

let idCounter = 0;
function createMatchId() {
  idCounter += 1;
  return `match-${idCounter}-${Date.now()}`;
}

export function matchExtraction(
  payload: ExtractionPayload,
  index: TaxonomyIndex,
): MatchedExtraction {
  const matchPosition = createPositionMatcher(index);
  const matchTechnique = createTechniqueMatcher(index);

  const matchedTechniques: MatchedTechnique[] = (payload.session.techniques ?? []).map(
    (tech) => {
      const positionMatch = matchPosition(tech.positionName);
      const techniqueMatch = matchTechnique(
        tech.techniqueName,
        positionMatch?.item.id,
      );

      return {
        id: createMatchId(),
        positionName: tech.positionName,
        positionMatch,
        techniqueName: tech.techniqueName,
        techniqueMatch,
        notes: tech.notes,
        keyDetails: tech.keyDetails,
      };
    },
  );

  const matchedPositionNotes: MatchedPositionNote[] = (payload.session.positionNotes ?? []).map(
    (note) => {
      const positionMatch = matchPosition(note.positionName);

      return {
        id: createMatchId(),
        positionName: note.positionName,
        positionMatch,
        notes: note.notes,
        keyDetails: note.keyDetails,
      };
    },
  );

  const matchedRounds: MatchedSparringRound[] = (payload.sparringRounds ?? []).map(
    (round) => {
      const submissionsFor: MatchedSubmission[] = (round.submissionsFor ?? []).map(
        (name) => ({
          name,
          techniqueMatch: matchTechnique(name),
        }),
      );

      const submissionsAgainst: MatchedSubmission[] = (round.submissionsAgainst ?? []).map(
        (name) => ({
          name,
          techniqueMatch: matchTechnique(name),
        }),
      );

      return {
        id: createMatchId(),
        partnerName: round.partnerName,
        partnerBelt: round.partnerBelt,
        submissionsFor,
        submissionsAgainst,
        dominantPositions: round.dominantPositions ?? [],
        stuckPositions: round.stuckPositions ?? [],
        notes: round.notes,
      };
    },
  );

  return {
    session: {
      date: payload.session.date,
      giOrNogi: parseGiOrNogi(payload.session.giOrNogi),
      sessionType: payload.session.sessionType,
      techniques: matchedTechniques,
      positionNotes: matchedPositionNotes,
    },
    sparringRounds: matchedRounds,
  };
}
