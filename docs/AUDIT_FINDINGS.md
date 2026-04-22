# Audit Findings — April 2026

This document is the living punch list from the April 2026 deep audit
(design + engineering). Entries are grouped by severity; within each
group they are rough priority order.

Each item has a stable **ID** (`AF-###`) so other docs, commits, and
issues can reference it. When you fix one, remove it and add a one-line
entry under the **Fixed** log at the bottom of the file with commit sha.

Legend: **Area** is the primary file or subsystem; **Impact** is the
observable failure mode; **Status** is open unless noted otherwise.

---

## Critical

### AF-001 — Extraction double-apply on review
- **Area:** `src/app/(main)/log/page.tsx` (extraction review panel +
  `applyExtractionData`)
- **Impact:** When a voice/paste transcript is processed, the form is
  auto-populated *and* the `ExtractionReviewPanel` still shows an
  "Apply" button. Clicking Apply re-runs `applyExtractionData`, which
  appends duplicate technique drafts / sparring rounds on top of the
  ones already present, and clobbers any edits the user made between
  auto-apply and Apply.
- **Fix sketch:** Either (a) hide the Apply button once the extraction
  has been auto-applied and switch the panel to a confirm/dismiss UI,
  or (b) stop auto-applying and make Apply the only path. Option (a)
  matches the current "Auto-filled · verify" UX.

### AF-002 — Log page is a 2,940-line monolith with 49 useStates
- **Area:** `src/app/(main)/log/page.tsx`
- **Impact:** Maintainability. New bugs keep landing in this file
  because state flows are hard to trace end-to-end. The three modes
  (`new` / `view` / `edit`), the extraction flow, the modal step
  machine, and the form reset logic all share state.
- **Fix sketch:** Extract `SessionMetadata`, `TechniqueList`,
  `RoundList`, and `ExtractionReviewPanel` into child components that
  consume typed props/callbacks. Lift shared state into a small reducer
  so each child only needs the slice it renders. Do this incrementally;
  don't try it in one PR.

---

## High

### AF-003 — `deleteSession` is fire-and-forget, swallows errors
- **Area:** `src/hooks/use-local-sessions.ts`,
  `src/app/(main)/sessions/[id]/page.tsx`
- **Impact:** The detail page navigates away before the Supabase delete
  resolves and never surfaces errors. A failed delete shows no feedback
  and the session silently reappears on next load.
- **Fix sketch:** Change `deleteSession` to the same discriminated
  union contract as `addSession`/`updateSession`
  (`Promise<{ ok: true } | { ok: false; error: string }>`). Await it
  in the detail page; only navigate on `ok: true`.

### AF-004 — Insights / goals lose commas across edit round-trips
- **Area:** `src/app/(main)/log/page.tsx` (insights & goals inputs,
  `handleSubmit`, edit-load effect)
- **Impact:** Free-form items are joined on `", "` for storage and
  split on `","` on load. Any user-entered comma is destroyed on the
  first edit round-trip.
- **Fix sketch:** Store as `string[]` directly in the session payload
  (schema already allows it), or serialize with a newline separator and
  update the split.

### AF-005 — `fetchAndMatchExtraction` silently swallows errors
- **Area:** `src/app/(main)/log/page.tsx`
- **Impact:** If extraction fails (network error, 500, malformed
  JSON), the Quick Capture UI spins forever with no user-visible
  error. The form stays empty.
- **Fix sketch:** Surface the error via the existing `setFormError`
  slot or a dedicated extraction-error banner. Always clear the loading
  state in a `finally`.

### AF-006 — API routes `JSON.parse` request bodies without try/catch
- **Area:** `src/app/api/transcripts/*`,
  `src/app/api/extractions/[id]/route.ts`, `src/app/api/auth/signup/route.ts`
- **Impact:** A malformed body crashes the handler → 500. Low-severity
  on its own, but it blocks useful error messages to the client.
- **Fix sketch:** Wrap each `await request.json()` in a try/catch and
  return a 400 with `{ error: "Invalid JSON body" }` on failure.

### AF-007 — `useUserTaxonomy` persist race (last-write-wins)
- **Area:** `src/hooks/use-user-taxonomy.ts`,
  `src/app/(main)/log/page.tsx` `handleSubmit`
- **Impact:** The save flow calls `recordTagUsage`,
  `recordTechniqueProgress`, and `recordPartnerNames` sequentially;
  each schedules its own `persistState` upsert against the same
  `user_taxonomy` row. Earlier writes can be clobbered by later ones
  that started from stale state.
- **Fix sketch:** Batch updaters into a single `updateState(fn)` call
  that composes all three mutations, or serialize `persistState` with a
  queue (next write waits for previous).

### AF-008 — `/api/env-check` is publicly accessible
- **Area:** `src/app/api/env-check/route.ts`
- **Impact:** Information disclosure — leaks which env vars are set on
  the server to any unauthenticated caller.
- **Fix sketch:** Gate on `getBearerToken` + admin-email allowlist, or
  remove entirely before production.

### AF-009 — Date off-by-one in `streak-stats.tsx` and `knowledge-card.tsx`
- **Area:** `src/components/progress/streak-stats.tsx:67,73`,
  `src/components/progress/knowledge-card.tsx` (partner last-seen)
- **Impact:** Same UTC-midnight bug as the main log page had: `new
  Date(s.date)` in a local-timezone display renders the previous day
  for users west of UTC.
- **Fix sketch:** Replace `new Date(session.date)` / `new Date(s.date)`
  with `parseLocalDate(...)` from `@/lib/utils/date`. The helper
  already handles `YYYY-MM-DD`.

---

## Medium

### AF-010 — Notes "Hide" button swallowed by `<fieldset disabled>`
- **Area:** `src/app/(main)/log/page.tsx` (notes section toggle)
- **Impact:** In view mode the notes-section collapse/expand button
  becomes disabled because it lives inside the form's fieldset, even
  though it's a pure UI affordance.
- **Fix sketch:** Move the toggle outside the fieldset or render a
  `<Link>`/`<a>` equivalent; see AGENTS.md "View / edit / new mode".

### AF-011 — `/log?edit=<deleted-id>` renders empty editable form
- **Area:** `src/app/(main)/log/page.tsx` (edit-load effect)
- **Impact:** Opening an edit link for a deleted session silently
  initializes an empty new draft, still in `view` mode flags,
  producing a confusing hybrid UI.
- **Fix sketch:** When `editSessionId` is set but not found, show a
  "Session not found" state with a link back to `/sessions`.

### AF-012 — Recording AbortController not cleaned up on unmount
- **Area:** `src/app/(main)/log/page.tsx` (recording flow)
- **Impact:** Leaving the page mid-recording leaks the
  MediaRecorder/stream and can keep the mic indicator on.
- **Fix sketch:** Return a cleanup from the recording `useEffect` that
  stops tracks and aborts any in-flight upload.

### AF-013 — Direct DOM access via `getElementById` in log page
- **Area:** `src/app/(main)/log/page.tsx` (scroll-into-view on new
  draft)
- **Impact:** Bypasses React's render lifecycle; fragile if the DOM
  isn't ready when the effect runs.
- **Fix sketch:** Use a `ref` callback on the newly-appended draft
  element and scroll from there.

### AF-014 — Custom technique category defaults silently
- **Area:** `src/app/(main)/log/page.tsx` (custom-technique sub-step
  of the submission picker)
- **Impact:** Submitting the custom-technique form without choosing a
  category silently defaults to `"transition"` or similar. Users can
  end up with miscategorized techniques in their taxonomy.
- **Fix sketch:** Make the category select required and validate
  before commit; highlight the field in red when missing.

### AF-015 — `addCustomPosition` / `addCustomTechnique` lack dedup
- **Area:** `src/hooks/use-user-taxonomy.ts`
- **Impact:** Adding the same custom name twice creates two distinct
  records with different IDs. The second becomes hard to reach through
  search.
- **Fix sketch:** Normalize name (trim + lowercase), check existing
  customs before inserting, and return the existing ID when a match is
  found.

### AF-016 — No `maxDuration` on some OpenAI-calling routes
- **Area:** `src/app/api/extractions/[id]/route.ts`,
  `src/app/api/transcripts/text/route.ts`
- **Impact:** Default serverless timeout (10s on Vercel hobby) can
  kill long extractions. Transcription route already sets
  `maxDuration = 60`.
- **Fix sketch:** `export const maxDuration = 60;` in each
  OpenAI-calling route.

### AF-017 — `onAuthStateChange` leaves `loading` true in some paths
- **Area:** `src/hooks/use-auth.ts`
- **Impact:** If the initial `getSession` rejects, `loading` never
  flips to `false` and the UI stays in the loading skeleton.
- **Fix sketch:** Set `loading` in a `finally` on the initial fetch
  and unconditionally on every `onAuthStateChange` event.

### AF-018 — Modal a11y: no `role="dialog"`, no focus trap, no Escape
- **Area:** `src/components/ui/modal.tsx`
- **Impact:** Keyboard-only and screen-reader users can't close or
  escape modals reliably.
- **Fix sketch:** Add `role="dialog"`, `aria-modal="true"`, focus the
  first focusable on open, restore focus on close, handle Escape.
  Consider `@radix-ui/react-dialog` instead of rolling our own.

### AF-019 — Mobile nav breaks on narrow screens
- **Area:** `src/app/(main)/layout.tsx` header/nav
- **Impact:** Nav items wrap / overflow at < 380 px; no hamburger
  fallback.
- **Fix sketch:** Collapse into a hamburger menu below `sm`.

---

## Low

### AF-020 — Dead code: `src/lib/sessions/local.ts` (mostly)
- **Area:** `src/lib/sessions/local.ts`
- **Impact:** Only `normalizeSession` and `sortSessions` are imported;
  the rest of the file predates the Supabase migration.
- **Fix sketch:** Keep the two used exports, delete the rest.

### AF-021 — Dead code: `src/lib/taxonomy/user-store.ts`
- **Area:** `src/lib/taxonomy/user-store.ts`
- **Impact:** No imports anywhere. Legacy from the localStorage era.
- **Fix sketch:** Delete the file.

### AF-022 — Dead code: `SparringRoundSection`
- **Area:** `src/components/sparring/sparring-round-section.tsx`
- **Impact:** Not imported. The log page inlines the round UI instead.
- **Fix sketch:** Delete the file (and its styles if any).

### AF-023 — `react-hook-form` and `zod` are listed but unused
- **Area:** `package.json` dependencies
- **Impact:** Bundle/install bloat; misleading to new contributors.
- **Fix sketch:** `npm uninstall react-hook-form zod`. Update README
  (already noted) once removed.

### AF-024 — No automated tests
- **Area:** entire repo
- **Impact:** Every regression so far has been caught manually. The
  log page's complexity makes manual-only testing risky.
- **Fix sketch:** Start with Vitest + React Testing Library for
  `parseLocalDate`, `normalizeSession`, and the extraction
  match-taxonomy logic; those are small, pure, and high-signal.

### AF-025 — No CI
- **Area:** repo root
- **Impact:** `npx tsc --noEmit` / `npm run lint` are developer
  discipline only.
- **Fix sketch:** Add a GitHub Actions workflow on PR: install, lint,
  typecheck. Hook tests in later.

---

## Fixed (recent)

Keep this list short — only the last ~10 entries. Older fixes live in
git history.

- **AF-F01** — Date off-by-one in 12 display sites (log page, sessions
  list, session detail, progress calendar, extraction review).
  Introduced `parseLocalDate` + `todayLocalISO` helpers in
  `src/lib/utils/date.ts`.
- **AF-F02** — Invite-codes API failed open when `INVITE_ADMIN_EMAILS`
  was unset (`isAdminEmail` returned true for everyone). Now fails
  closed and returns 403.
- **AF-F03** — `addSession` / `updateSession` UI said "saved" when the
  Supabase write failed. Returns
  `Promise<{ ok: true } | { ok: false; error: string }>`; log page
  branches on `result.ok`.
- **AF-F04** — Empty-session save allowed; form reset ran before the
  save completed. Added empty-session guard and await-before-reset.
- **AF-F05** — Custom technique input path was hidden behind stacked
  modals. Collapsed into a single submission picker modal with
  search → ambiguous → custom sub-steps.
- **AF-F06** — Post-save view vs. edit state. Log page now drives UI
  from `viewMode: "new" | "view" | "edit"`; form body wraps in
  `<fieldset disabled>` in view mode.
- **AF-F07** — Extraction drafts now carry a `fromExtraction` flag that
  renders an "Auto-filled · verify" badge and clears on first edit.
