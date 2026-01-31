import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";

import { getSupabaseAdmin } from "@/db/supabase/admin";

type InviteCodeInput = {
  maxUses?: number;
  expiresAt?: string | null;
  code?: string;
};

type InviteCodeUpdate = {
  id?: string;
  isActive?: boolean;
};

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode() {
  return `BJJ-${randomBytes(6).toString("base64url").toUpperCase()}`;
}

function getBearerToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.slice("Bearer ".length).trim();
}

function isAdminEmail(email: string | undefined | null) {
  if (!email) return false;
  const allowlist = (process.env.INVITE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  if (allowlist.length === 0) {
    return true;
  }
  return allowlist.includes(email.toLowerCase());
}

export async function GET(request: Request) {
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

  if (!isAdminEmail(authData.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("signup_codes")
    .select("id, code_plain, max_uses, uses, expires_at, is_active, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Unable to load invite codes." }, { status: 500 });
  }

  return NextResponse.json({ codes: data ?? [] });
}

export async function POST(request: Request) {
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

  if (!isAdminEmail(authData.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as InviteCodeInput | null;
  const maxUses = Math.max(1, Number(body?.maxUses ?? 1));
  const expiresAt = body?.expiresAt ?? null;
  const code = body?.code?.trim() || generateCode();
  const codeHash = hashCode(code);

  const { data, error } = await supabase
    .from("signup_codes")
    .insert({
      code_plain: code,
      code_hash: codeHash,
      max_uses: maxUses,
      expires_at: expiresAt,
    })
    .select("id, code_plain, max_uses, uses, expires_at, is_active, created_at")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Unable to create invite code." }, { status: 500 });
  }

  return NextResponse.json({ code, entry: data });
}

export async function PATCH(request: Request) {
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

  if (!isAdminEmail(authData.user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as InviteCodeUpdate | null;
  if (!body?.id || typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { error: "id and isActive are required." },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("signup_codes")
    .update({ is_active: body.isActive })
    .eq("id", body.id);

  if (error) {
    return NextResponse.json({ error: "Unable to update invite code." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
