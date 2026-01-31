import { NextResponse } from "next/server";
import { createHash } from "crypto";

import { getSupabaseAdmin } from "@/db/supabase/admin";

type SignupPayload = {
  email?: string;
  password?: string;
  code?: string;
};

function hashCode(code: string) {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SignupPayload | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  const code = body?.code?.trim() ?? "";

  if (!email || !password || !code) {
    return NextResponse.json(
      { error: "Email, password, and invite code are required." },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters long." },
      { status: 400 },
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

  const { data: consumed, error: consumeError } = await supabase.rpc(
    "consume_signup_code",
    {
      p_code_hash: hashCode(code),
    },
  );

  if (consumeError) {
    return NextResponse.json(
      { error: "Unable to validate invite code." },
      { status: 500 },
    );
  }

  if (!consumed) {
    return NextResponse.json(
      { error: "Invalid or expired invite code." },
      { status: 400 },
    );
  }

  const { error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
