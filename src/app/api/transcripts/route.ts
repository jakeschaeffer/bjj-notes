import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getSupabaseAdmin } from "@/db/supabase/admin";

export const runtime = "nodejs";

const AUDIO_BUCKET = "session-audio";
const TRANSCRIBE_MODEL = "whisper-1";
const EXTRACT_MODEL = "gpt-4o-mini";

type ExtractionPayload = {
  session?: {
    date?: string;
    giOrNogi?: "gi" | "nogi" | "both";
    sessionType?: string;
    techniques?: Array<{
      positionName?: string;
      techniqueName?: string;
      notes?: string;
      keyDetails?: string[];
    }>;
    positionNotes?: Array<{
      positionName?: string;
      notes?: string;
      keyDetails?: string[];
    }>;
  };
  sparringRounds?: Array<{
    partnerName?: string;
    partnerBelt?: string;
    submissionsFor?: string[];
    submissionsAgainst?: string[];
    dominantPositions?: string[];
    stuckPositions?: string[];
    notes?: string;
  }>;
};

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

async function transcribeAudio(file: File, apiKey: string) {
  const form = new FormData();
  form.append("file", file);
  form.append("model", TRANSCRIBE_MODEL);
  form.append("response_format", "json");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Transcription failed: ${errorText}`);
  }

  const data = (await response.json()) as { text?: string };
  return data.text?.trim() ?? "";
}

async function extractSession(rawText: string, apiKey: string) {
  const schema = {
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
          required: ["partnerName", "partnerBelt", "submissionsFor", "submissionsAgainst", "dominantPositions", "stuckPositions", "notes"],
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
  };

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: EXTRACT_MODEL,
      temperature: 0.2,
      text: { format: { type: "json_schema", name: "BjjTranscriptExtraction", strict: true, schema } },
      input: [
        {
          role: "system",
          content: `Extract structured BJJ session and sparring details. Return empty arrays or omit fields if not mentioned. Today's date is ${new Date().toISOString().slice(0, 10)}. If a specific date is not mentioned, use today's date. For relative dates like "today", "yesterday", "last Tuesday", calculate the actual date.`,
        },
        { role: "user", content: rawText },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Extraction failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    output_text?: string;
    output?: Array<{
      content?: Array<{ text?: string }>;
    }>;
  };

  const outputText =
    data.output_text ?? data.output?.[0]?.content?.[0]?.text ?? "";
  if (!outputText) {
    return { payload: {}, confidence: null };
  }

  const payload = JSON.parse(outputText) as ExtractionPayload;
  return { payload, confidence: null };
}

export async function POST(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const openAiApiKey = process.env.OPENAI_API_KEY ?? "";
  if (!openAiApiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY" },
      { status: 500 },
    );
  }

  let supabase;
  try {
    supabase = getSupabaseAdmin();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Supabase admin config missing.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
  const { data: authData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authData.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) {
    return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
  }

  const sourceValue = formData.get("source");
  const source =
    sourceValue === "voice_recording" ? "voice_recording" : "audio_upload";
  const sessionIdValue = formData.get("sessionId");
  const sessionId =
    typeof sessionIdValue === "string" && sessionIdValue.trim().length > 0
      ? sessionIdValue.trim()
      : null;

  const transcriptId = randomUUID();
  const audioFile = file as File;
  const fileName = audioFile.name || `${transcriptId}.webm`;
  const extension = fileName.includes(".")
    ? fileName.split(".").pop()
    : "webm";
  const storagePath = `${authData.user.id}/${transcriptId}.${extension}`;

  const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
  const { error: storageError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(storagePath, audioBuffer, {
      contentType: audioFile.type || "application/octet-stream",
      upsert: false,
    });

  if (storageError) {
    return NextResponse.json(
      { error: `Failed to store audio: ${storageError.message}` },
      { status: 500 },
    );
  }

  const createdAt = new Date().toISOString();
  const { error: insertError } = await supabase.from("transcripts").insert({
    id: transcriptId,
    user_id: authData.user.id,
    session_id: sessionId,
    source,
    audio_url: storagePath,
    raw_text: "",
    status: "processing",
    model: TRANSCRIBE_MODEL,
    created_at: createdAt,
  });

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to create transcript: ${insertError.message}` },
      { status: 500 },
    );
  }

  try {
    const rawText = await transcribeAudio(audioFile, openAiApiKey);
    const { payload, confidence } = await extractSession(rawText, openAiApiKey);
    const processedAt = new Date().toISOString();

    await supabase
      .from("transcripts")
      .update({
        raw_text: rawText,
        status: "completed",
        processed_at: processedAt,
      })
      .eq("id", transcriptId)
      .eq("user_id", authData.user.id);

    const extractionId = randomUUID();
    await supabase.from("transcript_extractions").insert({
      id: extractionId,
      transcript_id: transcriptId,
      user_id: authData.user.id,
      extracted_payload: payload,
      confidence,
      status: "draft",
      created_at: processedAt,
      updated_at: processedAt,
    });

    return NextResponse.json({
      id: transcriptId,
      extractionId,
      status: "completed",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Processing failed";
    await supabase
      .from("transcripts")
      .update({ status: "failed" })
      .eq("id", transcriptId)
      .eq("user_id", authData.user.id);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
