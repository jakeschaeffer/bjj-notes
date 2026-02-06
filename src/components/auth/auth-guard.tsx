"use client";

import Link from "next/link";

import { useAuth } from "@/hooks/use-auth";

type AuthGuardProps = {
  children: React.ReactNode;
};

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_-40px_var(--shadow)]">
        <p className="text-sm text-[var(--muted)]">Checking your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-6 shadow-[0_24px_60px_-40px_var(--shadow)]">
        <h1 className="text-lg font-semibold">Sign in to keep your data</h1>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Your sessions, notes, and progress are stored securely in your account.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-semibold text-[var(--background)]"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm font-semibold text-[var(--foreground)]"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
