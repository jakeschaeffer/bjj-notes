"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { supabase } from "@/db/supabase/client";
import { useAuth } from "@/hooks/use-auth";

type InviteCode = {
  id: string;
  code_plain?: string | null;
  max_uses: number;
  uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
};

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [newCodeValue, setNewCodeValue] = useState("");
  const [maxUses, setMaxUses] = useState(1);
  const [expiresAt, setExpiresAt] = useState("");
  const [inviteForbidden, setInviteForbidden] = useState(false);

  const getToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }, []);

  const loadInviteCodes = useCallback(async () => {
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");

    const token = await getToken();
    if (!token) {
      setInviteLoading(false);
      return;
    }

    const response = await fetch("/api/invite-codes", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 403) {
      setInviteForbidden(true);
      setInviteLoading(false);
      return;
    }

    const data = (await response.json()) as { codes?: InviteCode[]; error?: string };
    if (!response.ok || data.error) {
      setInviteError(data.error ?? "Unable to load invite codes.");
      setInviteLoading(false);
      return;
    }

    setInviteCodes(data.codes ?? []);
    setInviteLoading(false);
  }, [getToken]);

  async function handleCreateCode() {
    setInviteError("");
    setInviteSuccess("");

    const token = await getToken();
    if (!token) {
      return;
    }

    const response = await fetch("/api/invite-codes", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        code: newCodeValue.trim() || undefined,
      }),
    });

    const data = (await response.json()) as {
      code?: string;
      entry?: InviteCode;
      error?: string;
    };

    if (!response.ok || data.error) {
      setInviteError(data.error ?? "Unable to create invite code.");
      return;
    }

    if (data.entry) {
      setInviteCodes((prev) => [data.entry!, ...prev]);
    }

    setInviteSuccess(`Invite code created: ${data.code}`);
    setNewCodeValue("");
  }

  async function toggleInvite(codeId: string, nextActive: boolean) {
    setInviteError("");
    setInviteSuccess("");

    const token = await getToken();
    if (!token) {
      return;
    }

    const response = await fetch("/api/invite-codes", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id: codeId, isActive: nextActive }),
    });

    if (!response.ok) {
      setInviteError("Unable to update invite code.");
      return;
    }

    setInviteCodes((prev) =>
      prev.map((code) =>
        code.id === codeId ? { ...code, is_active: nextActive } : code,
      ),
    );
  }

  useEffect(() => {
    if (!user) {
      return;
    }
    Promise.resolve().then(() => {
      void loadInviteCodes();
    });
  }, [user, loadInviteCodes]);

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

      {inviteForbidden ? null : (
        <div className="rounded-2xl border border-amber-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-500">
              Invite Codes
            </p>
            <p className="text-sm text-zinc-600">
              Generate and manage invite-only access.
            </p>
          </div>
          {inviteLoading ? (
            <span className="text-xs font-semibold text-amber-600">Loading…</span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Custom code (optional)
            <input
              value={newCodeValue}
              onChange={(event) => setNewCodeValue(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm normal-case"
              placeholder="Leave blank to auto-generate"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Max uses
            <input
              type="number"
              min={1}
              value={maxUses}
              onChange={(event) =>
                setMaxUses(Math.max(1, Number(event.target.value || 1)))
              }
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm normal-case"
            />
          </label>
          <label className="space-y-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            Expires on
            <input
              type="date"
              value={expiresAt}
              onChange={(event) => setExpiresAt(event.target.value)}
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm normal-case"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCreateCode}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Create invite
          </button>
          {inviteSuccess ? (
            <span className="text-sm font-semibold text-emerald-600">
              {inviteSuccess}
            </span>
          ) : null}
          {inviteError ? (
            <span className="text-sm font-semibold text-red-500">
              {inviteError}
            </span>
          ) : null}
        </div>

        <div className="mt-6 space-y-3">
          {inviteCodes.length === 0 ? (
            <p className="text-sm text-zinc-500">No invite codes yet.</p>
          ) : (
            inviteCodes.map((code) => (
              <div
                key={code.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-zinc-700">
                    {code.code_plain ? code.code_plain : "Hidden code"} • Uses:{" "}
                    {code.uses}/{code.max_uses}
                  </p>
                  <p className="text-xs text-zinc-500">
                    Created {new Date(code.created_at).toLocaleString()}
                    {code.expires_at
                      ? ` • Expires ${new Date(code.expires_at).toLocaleDateString()}`
                      : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleInvite(code.id, !code.is_active)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100"
                >
                  {code.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
      )}

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
