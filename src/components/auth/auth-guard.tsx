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
      <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <p className="text-sm text-zinc-600">Checking your account...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold">Sign in to keep your data</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Your sessions, notes, and progress are stored securely in your account.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-700"
          >
            Create account
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
