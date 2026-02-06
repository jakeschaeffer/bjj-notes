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
      <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
        Checking session...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em]">
        <Link
          href="/login"
          className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-full bg-[var(--foreground)] px-3 py-1 text-[var(--background)] transition hover:translate-y-[-1px]"
        >
          Sign up
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
      <Link href="/settings" className="font-semibold text-[var(--foreground)]">
        {user.email ?? "Account"}
      </Link>
      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
        className="rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)] transition hover:bg-[var(--surface-2)] hover:text-[var(--foreground)]"
      >
        Log out
      </button>
    </div>
  );
}
