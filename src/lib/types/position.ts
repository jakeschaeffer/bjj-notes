import type { ID } from "./base";

export type Perspective = "top" | "bottom" | "neutral";

export interface Position {
  id: ID;
  name: string;
  slug: string;
  parentId: ID | null;
  path: string[];
  perspective: Perspective;
  giApplicable: boolean;
  nogiApplicable: boolean;
}
