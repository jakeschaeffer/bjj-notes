import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { getSupabaseAdmin } from "@/db/supabase/admin";
import { buildExtractionRequest } from "@/lib/extraction/openai";

export const runtime = "nodejs";

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

async function extractSession(rawText: string, apiKey: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildExtractionRequest(rawText, EXTRACT_MODEL)),
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

  const body = (await request.json().catch(() => null)) as {
    text?: string;
  } | null;

  const rawText = body?.text?.trim() ?? "";
  if (!rawText) {
    return NextResponse.json({ error: "Missing transcript text" }, { status: 400 });
  }

  const transcriptId = randomUUID();
  const createdAt = new Date().toISOString();

  const { error: insertError } = await supabase.from("transcripts").insert({
    id: transcriptId,
    user_id: authData.user.id,
    session_id: null,
    source: "audio_upload",
    audio_url: null,
    raw_text: rawText,
    status: "processing",
    model: "text-input",
    created_at: createdAt,
  });

  if (insertError) {
    return NextResponse.json(
      { error: `Failed to create transcript: ${insertError.message}` },
      { status: 500 },
    );
  }

  try {
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
