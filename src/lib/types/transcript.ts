import type { ID, Timestamp } from "./base";

export type TranscriptStatus = "pending" | "processing" | "completed" | "failed";
export type TranscriptSource = "audio_upload" | "voice_recording";

export interface Transcript {
  id: ID;
  userId: ID;
  sessionId: ID | null;
  source: TranscriptSource;
  audioUrl: string | null;
  rawText: string;
  status: TranscriptStatus;
  model: string | null;
  createdAt: Timestamp;
  processedAt: Timestamp | null;
}

export type ExtractionStatus = "draft" | "reviewed" | "applied";

export interface TranscriptExtraction {
  id: ID;
  transcriptId: ID;
  userId: ID;
  extractedPayload: Record<string, unknown>;
  confidence: number | null;
  status: ExtractionStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
