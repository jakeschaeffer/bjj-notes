export const EXTRACTION_SCHEMA_NAME = "BjjTranscriptExtraction";

export const EXTRACTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["session", "sparringRounds"],
  properties: {
    session: {
      type: "object",
      additionalProperties: false,
      required: ["date", "giOrNogi", "sessionType", "techniques", "positionNotes"],
      properties: {
        date: { type: "string" },
        giOrNogi: { type: "string" },
        sessionType: { type: "string" },
        techniques: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["positionName", "techniqueName", "notes", "keyDetails"],
            properties: {
              positionName: { type: "string" },
              techniqueName: { type: "string" },
              notes: { type: "string" },
              keyDetails: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
        positionNotes: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["positionName", "notes", "keyDetails"],
            properties: {
              positionName: { type: "string" },
              notes: { type: "string" },
              keyDetails: {
                type: "array",
                items: { type: "string" },
              },
            },
          },
        },
      },
    },
    sparringRounds: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "partnerName",
          "partnerBelt",
          "submissionsFor",
          "submissionsAgainst",
          "dominantPositions",
          "stuckPositions",
          "notes",
        ],
        properties: {
          partnerName: { type: "string" },
          partnerBelt: { type: "string" },
          submissionsFor: { type: "array", items: { type: "string" } },
          submissionsAgainst: { type: "array", items: { type: "string" } },
          dominantPositions: { type: "array", items: { type: "string" } },
          stuckPositions: { type: "array", items: { type: "string" } },
          notes: { type: "string" },
        },
      },
    },
  },
} as const;

export function buildExtractionRequest(rawText: string, model: string) {
  const today = new Date().toISOString().slice(0, 10);

  return {
    model,
    temperature: 0.2,
    text: {
      format: {
        type: "json_schema",
        name: EXTRACTION_SCHEMA_NAME,
        strict: true,
        schema: EXTRACTION_SCHEMA,
      },
    },
    input: [
      {
        role: "system",
        content: `Extract structured BJJ session and sparring details. Return empty arrays or omit fields if not mentioned. Today's date is ${today}. If a specific date is not mentioned, use today's date. For relative dates like "today", "yesterday", "last Tuesday", calculate the actual date.`,
      },
      { role: "user", content: rawText },
    ],
  };
}
