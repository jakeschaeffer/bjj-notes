"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { Session } from "@/lib/types";
import { supabase } from "@/db/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { normalizeSession, sortSessions } from "@/lib/sessions/local";

type SessionRow = {
  id: string;
  user_id: string;
  date: string;
  payload: Session;
  created_at?: string;
  updated_at?: string;
};

export function useLocalSessions() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    let cancelled = false;

    if (authLoading) {
      return () => {
        cancelled = true;
      };
    }

    if (!user) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setSessions([]);
        }
      });
      return () => {
        cancelled = true;
      };
    }

    (async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("id, user_id, date, payload, created_at, updated_at")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Failed to load sessions", error.message);
        setSessions([]);
        return;
      }

      const rows = (data as SessionRow[]) ?? [];
      const mapped = rows.map((row) =>
        normalizeSession({
          ...row.payload,
          userId: user.id,
        }),
      );
      setSessions(sortSessions(mapped));
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, user]);

  const addSession = useCallback(
    async (session: Session) => {
      if (!user) {
        return;
      }

      const payload = { ...session, userId: user.id };
      const { error } = await supabase.from("sessions").upsert({
        id: payload.id,
        user_id: user.id,
        date: payload.date,
        payload,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
      });

      if (error) {
        console.error("Failed to save session", error.message);
        return;
      }

      setSessions((prev) => {
        const next = prev.filter((item) => item.id !== payload.id);
        next.push(payload);
        return sortSessions(next);
      });
    },
    [user],
  );

  const updateSession = useCallback(
    async (session: Session) => {
      if (!user) {
        return;
      }

      const payload = { ...session, userId: user.id };
      const { error } = await supabase.from("sessions").upsert({
        id: payload.id,
        user_id: user.id,
        date: payload.date,
        payload,
        created_at: payload.createdAt,
        updated_at: payload.updatedAt,
      });

      if (error) {
        console.error("Failed to update session", error.message);
        return;
      }

      setSessions((prev) => {
        const next = prev.filter((item) => item.id !== payload.id);
        next.push(payload);
        return sortSessions(next);
      });
    },
    [user],
  );

  const deleteSession = useCallback(
    async (id: string) => {
      if (!user) {
        return;
      }

      const { error } = await supabase
        .from("sessions")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (error) {
        console.error("Failed to delete session", error.message);
        return;
      }

      setSessions((prev) => prev.filter((item) => item.id !== id));
    },
    [user],
  );

  const byId = useMemo(() => {
    const map = new Map<string, Session>();
    for (const session of sessions) {
      map.set(session.id, session);
    }
    return map;
  }, [sessions]);

  return {
    sessions,
    addSession,
    updateSession,
    deleteSession,
    getSessionById: (id: string) => byId.get(id),
  };
}
