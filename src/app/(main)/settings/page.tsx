"use client";
import { useRouter } from "next/navigation";

import { supabase } from "@/db/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-zinc-600">
          Manage your account and sign out.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">
          Signed in as
        </p>
        <p className="mt-2 text-sm text-zinc-700">{user?.email ?? "-"}</p>
      </div>

      <button
        type="button"
        onClick={async () => {
          await supabase.auth.signOut();
          router.push("/login");
        }}
        className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
      >
        Sign out
      </button>
    </div>
  );
}
