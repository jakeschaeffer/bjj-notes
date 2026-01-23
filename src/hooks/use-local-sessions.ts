"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

import type { Session } from "@/lib/types";
import { getSnapshot, subscribe, updateSessions } from "@/lib/sessions/local";

export function useLocalSessions() {
  const sessions = useSyncExternalStore(subscribe, getSnapshot, () => []);

  const addSession = useCallback((session: Session) => {
    updateSessions((prev) => [session, ...prev]);
  }, []);

  const updateSession = useCallback((session: Session) => {
    updateSessions((prev) =>
      prev.map((item) => (item.id === session.id ? session : item)),
    );
  }, []);

  const deleteSession = useCallback((id: string) => {
    updateSessions((prev) => prev.filter((item) => item.id !== id));
  }, []);

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
