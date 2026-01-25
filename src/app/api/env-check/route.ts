import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const hasValue = (value: string | undefined) => Boolean(value && value.trim());

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: hasValue(process.env.NEXT_PUBLIC_SUPABASE_URL),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: hasValue(
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    ),
    SUPABASE_URL: hasValue(process.env.SUPABASE_URL),
    SUPABASE_SECRET_KEY: hasValue(process.env.SUPABASE_SECRET_KEY),
    SUPABASE_SERVICE_ROLE_KEY: hasValue(process.env.SUPABASE_SERVICE_ROLE_KEY),
    OPENAI_API_KEY: hasValue(process.env.OPENAI_API_KEY),
  });
}
