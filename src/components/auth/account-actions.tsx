"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/db/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export function AccountActions() {
  const router = useRouter();
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="text-xs text-[var(--gg-text-muted)]">Checking session...</div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/login"
          className="rounded-full border border-[var(--gg-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)]"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-[linear-gradient(135deg,var(--gg-signal),var(--gg-signal-2))] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-black transition hover:brightness-110"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--gg-text-muted)]">
      <Link href="/settings" className="font-semibold text-[var(--gg-text)]">
        {user.email ?? "Account"}
      </Link>
      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
        className="rounded-full border border-[var(--gg-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--gg-text)] transition hover:border-[var(--gg-signal)] hover:text-[var(--gg-signal)]"
      >
        Log out
      </button>
    </div>
  );
}
