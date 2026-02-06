"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { supabase } from "@/db/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/log");
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-[var(--muted)]">
          Account
        </p>
        <h1 className="text-display text-4xl">Log in</h1>
        <p className="text-sm text-[var(--muted)]">
          Access your saved sessions and notes.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="space-y-2 text-sm font-medium text-[var(--muted-strong)]">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]"
            required
          />
        </label>
        <label className="space-y-2 text-sm font-medium text-[var(--muted-strong)]">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--foreground)]"
            required
          />
        </label>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-[var(--foreground)] px-4 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-[var(--background)] transition hover:translate-y-[-1px] disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Log in"}
        </button>
      </form>

      <p className="text-sm text-[var(--muted)]">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-[var(--accent)]">
          Create an account
        </Link>
      </p>
    </div>
  );
}
