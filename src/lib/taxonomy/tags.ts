export const COMMON_TAGS = [
  "grip",
  "posture",
  "base",
  "timing",
  "hip angle",
  "underhook",
  "overhook",
  "frames",
  "weight distribution",
  "head position",
  "knee position",
  "elbow position",
  "pressure",
  "off-balance",
  "control",
  "setup",
];

export function normalizeTag(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
