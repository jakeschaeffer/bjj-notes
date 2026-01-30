import { NextResponse } from "next/server";

import { getSupabaseAdmin } from "@/db/supabase/admin";

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const { id } = await params;

  const { data, error } = await supabase
    .from("transcripts")
    .select("*")
    .eq("id", id)
    .eq("user_id", authData.user.id)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Transcript not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    sessionId: data.session_id,
    source: data.source,
    audioUrl: data.audio_url,
    rawText: data.raw_text,
    status: data.status,
    model: data.model,
    createdAt: data.created_at,
    processedAt: data.processed_at,
  });
}
