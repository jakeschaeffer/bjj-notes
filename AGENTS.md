# AI Agent Guidelines

This document provides context for AI coding assistants working on the Grapple Graph codebase.

---

## Quick Context

Grapple Graph is a **Brazilian Jiu-Jitsu training log** with:
- Voice-to-text session logging via OpenAI Whisper + GPT-4o-mini
- Hierarchical position/technique taxonomy with fuzzy matching
- Supabase backend (auth, database, storage)
- Invite-only access system

**Stack**: Next.js 16, React 19, TypeScript, Tailwind CSS 4, Supabase, OpenAI

---

## Key Files to Know

| Area | Primary Files |
|------|---------------|
| **Session logging + edit** | `src/app/(main)/log/page.tsx` (~2940 lines, core feature) |
| **Session detail / delete** | `src/app/(main)/sessions/[id]/page.tsx` |
| **Settings (invites, partners)** | `src/app/(main)/settings/page.tsx` |
| **Types** | `src/lib/types/*.ts` (Session, Position, Technique, etc.) |
| **Taxonomy** | `src/lib/taxonomy/index.ts`, `src/data/*.json` |
| **Extraction** | `src/lib/extraction/match-taxonomy.ts`, `openai.ts` |
| **Hooks** | `src/hooks/use-auth.ts`, `use-user-taxonomy.ts`, `use-local-sessions.ts` |
| **Date handling** | `src/lib/utils/date.ts` (`parseLocalDate`, `todayLocalISO`) |
| **API routes** | `src/app/api/transcripts/{route,[id]/route,text/route}.ts`, `api/extractions/[id]/route.ts`, `api/auth/signup/route.ts`, `api/invite-codes/route.ts` |
| **UI components** | `src/components/ui/*.tsx` (Button, Card, FormField, Modal, Tag) |
| **Sparring components** | `src/components/sparring/` (PartnerPicker; SparringRoundSection exists but is unused — log page inlines the UI) |
| **Progress components** | `src/components/progress/` (TrainingCalendar, StreakStats, TechniqueRecencyList, PositionCoverageChart, SparringTimeline, KnowledgeCard) |
| **Taxonomy UI** | `src/components/taxonomy/taxonomy-card.tsx` (TaxonomyCard, ClickableTaxonomy) |
| **Known-issues log** | `docs/AUDIT_FINDINGS.md` — read before touching the log page |

---

## Coding Patterns

### State Management
- Use functional state updates for `useCallback` compatibility
- Prefer `useMemo` for derived data
- Wrap handlers passed to children with `useCallback`

```typescript
// Good - functional update allows empty deps
const updateRound = useCallback(
  (id: string, update: Partial<DraftRound>) => {
    setRoundDrafts((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...update } : r))
    );
  },
  [],
);
```

### Component Patterns
- Use UI components from `src/components/ui/` (Button, Card, FormField, Tag)
- Prefer `Card` over inline card styling
- Prefer `Button` with variants over inline button classes

```typescript
// Good
<Button variant="primary" size="lg" onClick={handleSubmit}>Save</Button>
<Card as="section" className="grid gap-4">...</Card>

// Avoid
<button className="rounded-full bg-zinc-900 px-6 py-2.5...">Save</button>
```

### API Routes
- Use Bearer token auth via `getBearerToken(request)`
- Validate with Supabase admin client
- Return structured JSON responses
- Set `maxDuration` for long-running operations (e.g., transcription)

```typescript
export const runtime = "nodejs";
export const maxDuration = 60;  // For API routes that call OpenAI
```

### Supabase Patterns
- Client: `src/db/supabase/client.ts` (browser)
- Admin: `src/db/supabase/admin.ts` (server, service role)
- All tables have RLS - user can only access own data

---

## Domain Concepts

### Positions
Hierarchical BJJ positions with parent-child relationships.

```
Guard (root, perspective: bottom)
├── Closed Guard
│   └── High Guard
├── Open Guard
│   ├── De La Riva
│   └── Spider Guard
└── Half Guard
```

### Techniques
Actions performed from positions. Categories: submission, sweep, pass, escape, takedown, transition, guard-retention, control.

- `positionFromId`: Required starting position
- `positionToId`: Optional ending position (for transitions)
- `submissionType`: For submissions only (choke, armlock, leglock, etc.)

### Sessions
A training session includes:
- Metadata (date, type, gi/nogi, duration)
- Techniques drilled (position + technique + notes)
- Position notes (position + notes, no specific technique)
- Sparring rounds (partner, submissions, dominant/stuck positions)
- General notes, insights, goals

### User Taxonomy
User customizations stored in `user_taxonomy.data` (JSONB):
- Custom positions and techniques
- Tag usage history
- Technique progress (times drilled, first/last seen)
- Partner names with round counts

---

## Common Tasks

### Adding a new UI pattern
1. Check if `src/components/ui/` has an existing component
2. If not, create one following existing patterns (forwardRef, cn utility, variants)
3. Export from `src/components/ui/index.ts`

### Modifying the session form
The log page (`src/app/(main)/log/page.tsx`) is large (~2940 lines as of
April 2026) and has three modes: `new`, `view`, `edit`. Approximate layout:

- Lines 1–60: Imports
- Lines 60–205: Module-level types, constants, helpers (`createDraftTechnique`,
  `createDraftRound`, `beltOptions`, `ambiguousSubmissions` map, etc.)
- Lines 206–425: State declarations (~49 useStates), refs, `?edit=<id>`
  load effect
- Lines 425–1320: Computed values, memos, handlers (`updateTechnique`,
  `updateRound`, submission flow, recording flow, extraction, edit-session
  load, `resetForm`, async `handleSubmit`)
- Lines 1320+: JSX render — header, form (with `<fieldset disabled>` for
  view mode), modals (one unified submission picker with sub-steps; belt,
  position, taxonomy, unmatched, paste-transcript)

### View / edit / new mode

The log page is driven by `viewMode: "new" | "view" | "edit"`:

- `new` — default on `/log` with no query. Quick Capture visible, form
  editable, primary button is "Save session".
- `view` — set after a successful save or update. Form body wrapped in
  `<fieldset disabled={readOnly}>`, Quick Capture hidden, sections
  force-expanded. Primary button is "Edit session".
- `edit` — set when `/log?edit=<id>` resolves (user clicked Edit on the
  session detail page) **or** when the user clicks "Edit session" from
  view mode. Fields editable, primary button is "Update session".

When adding new interactive controls to the form, remember that
`<fieldset disabled>` natively disables child buttons/inputs. For anything
that should stay clickable in view mode (navigation links, confirmations),
render it *outside* the fieldset or use `<Link>` / an `<a>` (which
`<fieldset disabled>` doesn't affect).

### Editing an existing session

Session detail page has an **Edit** button linking to `/log?edit=<id>`.
The log page reads the query param, finds the session in the local
`sessions` array, and populates the form via an effect gated by
`loadedEditIdRef` (runs once per `editSessionId`). The form opens
directly in `edit` mode so the user can start editing immediately.
On update, the form switches to `view` mode so the user can see the
saved state read-only.

### Save result contract

`addSession` and `updateSession` on `useLocalSessions` return
`Promise<{ ok: true } | { ok: false; error: string }>`. Always await the
result and branch on `result.ok`. Failing to do so reintroduces the "UI
says saved but DB write failed" bug class.

```ts
const result = editingSessionId
  ? await updateSession(session)
  : await addSession(session);
if (!result.ok) {
  setFormError(result.error || "Could not save. Please try again.");
  return;
}
// ...success path: side-effects, summary, viewMode="view"
```

### Dates

Never `new Date(sessionDate)` for display — the string is UTC-parsed and
then formatted in local time, which is off by one day for users west of
UTC. Use `parseLocalDate()` from `@/lib/utils`:

```ts
import { parseLocalDate } from "@/lib/utils";
format(parseLocalDate(session.date), "MMM d, yyyy");  // ✅
```

Default-to-today values come from `todayLocalISO()` in the same module.

### Extraction "auto-filled" flag

`DraftTechnique` and `DraftRound` carry an optional `fromExtraction` flag.
`applyExtractionData` sets it to `true` on every draft it produces.
`updateTechnique` / `updateRound` (the centralized draft updaters) clear
the flag on any user edit. The badge is rendered in each draft card.
When extending the draft update flow, route mutations through the
existing updaters so the flag clears correctly.

### Adding a new API route
```typescript
// src/app/api/example/route.ts
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/db/supabase/admin";

export const runtime = "nodejs";

function getBearerToken(request: Request) {
  const auth = request.headers.get("authorization") ?? "";
  return auth.startsWith("Bearer ") ? auth.slice(7).trim() : null;
}

export async function GET(request: Request) {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: authData, error } = await supabase.auth.getUser(token);
  if (error || !authData.user) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Query with user scope
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("user_id", authData.user.id);

  return NextResponse.json({ data });
}
```

### Working with taxonomy
```typescript
import { useUserTaxonomy } from "@/hooks/use-user-taxonomy";

const {
  positions,
  techniques,
  index,
  partnerSuggestions,
  techniqueNotesById,
  positionNotesById,
  updateTechniqueNote,
  updatePositionNote,
  addCustomPosition,
  addCustomTechnique,
  recordTagUsage,
  recordTechniqueProgress,
  recordPartnerNames,
} = useUserTaxonomy();

// Get children of a position
const children = index.positionsByParent.get(parentId) ?? [];

// Get techniques for a position
const techs = index.techniquesByPosition.get(positionId) ?? [];

// Fuzzy search techniques
const results = index.techniqueSearch.search(query);

// Look up a user's personal note on a technique
const myNote = techniqueNotesById.get(techniqueId)?.notes;
```

**Warning**: `updateState` inside `useUserTaxonomy` calls `persistState`
asynchronously. Calling multiple mutators back-to-back fires multiple
upserts against the same `user_taxonomy` row and can produce a
last-write-wins race. If you need to record tag usage, technique
progress, and partner names together (as `handleSubmit` does), this is
currently a known issue — see the audit.

---

## Testing Considerations

- No test framework currently configured
- Use `npx tsc --noEmit` to verify TypeScript
- Use `npm run build` to verify full build (may fail on network issues with Google Fonts)
- Manual testing in browser for UI changes

---

## Known Technical Debt

See `docs/AUDIT_FINDINGS.md` for the full, severity-ranked list. Highlights:

1. **Log page size**: ~2940 lines, 49 useStates. Could be split into
   sub-components (metadata, techniques, sparring rounds, extraction
   review) but has resisted extraction because so much state is shared.
2. **Extraction double-apply** (critical): the extraction auto-populates
   the form *and* shows the "Apply" button, which re-applies on click.
3. **`deleteSession` fire-and-forget**: navigates before the async
   resolves, swallows errors.
4. **User-taxonomy persist race**: three sequential `updateState` calls
   after save can clobber each other (last-write-wins).
5. **Dead code files**: most of `src/lib/sessions/local.ts`, all of
   `src/lib/taxonomy/user-store.ts`, and
   `src/components/sparring/sparring-round-section.tsx` are unused —
   legacy from an earlier localStorage-based architecture.
6. **Modal accessibility**: no `role="dialog"`, no `aria-modal`, no focus
   trap, Escape doesn't close.
7. **No automated tests**: manual testing only.
8. **Insights / goals comma-serialization** loses commas inside items
   across edit round-trips.
9. **`/api/env-check` is public** — information disclosure.

---

## Branch Conventions

All Claude Code work lands on the shared `dev` branch — do NOT create a new
`claude/...` branch per task.

- Commit directly to `dev` and `git push -u origin dev`.
- `dev` is periodically merged into `main` via PR.
- Only create a separate branch if the user explicitly asks for one (e.g.,
  for a risky experiment that shouldn't block other work on `dev`).

---

## Helpful Commands

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Dev server
npm run dev

# Lint
npm run lint
```

---

## Lessons & Gotchas (April 2026, post-design landing)

These are real bugs, near-misses, and patterns worth knowing before you
edit. Each has bitten us once already.

### URL-encoded dynamic segments

Custom taxonomy IDs contain `:` (e.g. `custom:hip-bump-sweep-abc12345`).
When a `<Link href="/techniques/${id}">` navigates, the `:` may be
encoded to `%3A`. Whether `useParams()` returns it decoded or encoded
depends on the navigation path (client transition vs. hard load) and is
not consistent across Next.js versions.

**Always decode dynamic segments before using them as Map keys:**

```ts
const params = useParams<{ id: string }>();
const id = params?.id ? decodeURIComponent(params.id) : "";
```

`decodeURIComponent` is a no-op for already-decoded strings, so this is
safe in both directions. See `src/app/(main)/techniques/[id]/page.tsx`
and `src/app/(main)/positions/[id]/page.tsx`.

### `useUserTaxonomy` async load — guard with `loading`

The hook fetches `user_taxonomy.data` from Supabase asynchronously. On
first render it returns `emptyState`, so any custom (`custom:*`)
position or technique looked up via `index.positionsById.get(id)` /
`index.techniquesById.get(id)` will be **undefined** until the fetch
resolves and the component re-renders.

Pages that resolve a custom ID (the technique/position profile pages)
must check `loading` from the hook before deciding the resource is
"not found". Without this guard, the user sees a "Not found" flash —
or, on slow networks, a persistent false negative until the fetch
lands.

```ts
const { index, loading: taxLoading } = useUserTaxonomy();
const technique = index.techniquesById.get(id) ?? null;
if (taxLoading) return <Loading />;
if (!technique) return <NotFound />;
```

System techniques (no `custom:` prefix) are merged into `index` from
the very first render via `systemTechniques`, so they aren't affected.

### `user_taxonomy` persist is fire-and-forget

`updateState` inside `useUserTaxonomy` calls `persistState` via
`void persistState(next)` — the upsert runs in the background and the
caller doesn't await it. Two consequences:

1. **Multiple back-to-back mutators race.** `addCustomTechnique(...)`
   followed immediately by `addCustomPosition(...)` fires two
   parallel upserts of the same row; last-write-wins.
2. **A mutation right before navigation can lose.** If you call
   `addCustomTechnique` and then `router.push` in the same handler,
   the upsert is in flight when the page unmounts. Most browsers
   complete pending fetches but not all. Recovery: re-run the
   mutation, or treat the in-flight write as best-effort.

When recording multiple things together (the log page does this on
save: partner names, technique progress, tag usage), batch them into
one `updateState` call OR await an explicit save method (does not
exist yet — see `docs/AUDIT_FINDINGS.md`).

### CSS variables across React siblings

The branch designs scope variables (`--bg`, `--ink`, `--accent`, …) on
the page's design root (`.v1-root`, `.v2-root`, `.tp-root`, etc.).
Modals rendered in the same component tree as siblings of that root
do **not** inherit the variables, even though they're descendants of
the same React tree. CSS inheritance follows the DOM, and a modal
positioned `fixed` at the body level is a sibling, not a descendant,
of the root.

**Fix:** redeclare the variables on the modal scrim element itself:

```css
.v1-modal-scrim {
  position: fixed;
  inset: 0;
  /* re-declare so var(--ink) resolves inside the modal */
  --bg: #f5f2ed;
  --ink: #1a1815;
  --accent: oklch(0.45 0.12 25);
}
```

This bit us once when the V1/V2 mic modals rendered with no
background. Symptom: modal looks transparent / "weird overlay".

### Cascading button styles

Watch out for over-broad descendant selectors:

```css
/* Wrong — matches every <button> inside .pcompose, including chips */
.v2-root .pcompose button { width: 44px; ... }
```

The pcompose container has the `+` add button as a direct child *and*
nested partner-suggestion chips inside `.pcompose-field`. The rule
above forced every chip to render as a 44px square. Use child
selectors or specific class scopes:

```css
.v2-root .pcompose > button { ... }       /* direct child only */
.v2-root button.partner-chip { ... }      /* explicit override */
```

### setState inside useEffect

The repo's ESLint config bans synchronous `setState` calls in effect
bodies (`react-hooks/set-state-in-effect`). The rule is right most of
the time but wrong for "hydrate from async data" patterns where the
external system is genuinely async (e.g. loading a session by `?edit=<id>`
after the sessions hook has fetched). Use a single
`eslint-disable-next-line` with a short justification and keep the
hydration guarded by a ref so it runs once per id.

```ts
// eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating drafts from async-loaded session data.
setClassIdx(classMatch >= 0 ? classMatch : 0);
setMoves(rebuiltMoves);
setRounds(rebuiltRounds);
```

### Browser back button on detail pages

`<Link href="/sessions">Back</Link>` on the session detail always
returns to the sessions list, regardless of where the user came from
(e.g. they entered the session via a technique profile timeline). The
fix is `router.back()` with a `/sessions` fallback when there's no
history (deep link):

```tsx
<button onClick={() => {
  if (window.history.length > 1) router.back();
  else router.push("/sessions");
}}>Back</button>
```

### Negative-margin design roots

Each design root (`.v1-root`, `.v2-root`, `.sd-root`, `.tp-root`,
`.pp-root`) bleeds edge-to-edge by negating the parent `<main>`'s
padding:

```css
.v1-root {
  margin: -24px -20px -48px -20px; /* matches main's padding */
  padding-bottom: 24px;
}
```

If you change `(main)/layout.tsx`'s `app-main` padding, **update
every design root**. Mismatches show as a visible gap or a horizontal
scroll bar.

### React event delegation in MCP/eval scripts

`element.focus()` triggers the native `focus` event, which doesn't
bubble. React listens via delegated `focusin` at the root, which DOES
bubble. When testing the partner autocomplete or composer focus
states from an eval script, dispatch both:

```js
input.focus();
input.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
```

Without this, `onFocus` handlers don't fire and you'll wrongly
conclude the autocomplete is broken.

### Inspecting Supabase data without going through the UI

The MCP-controlled preview browser sometimes loses Supabase auth
cookies between navigations, making it tedious to log in repeatedly
just to inspect data. Use the admin scripts:

- `scripts/check-tax.mjs` — dumps custom positions/techniques and
  partner names for the test user.
- `scripts/check-sessions.mjs` — lists session technique IDs and
  cross-references them against the user_taxonomy table to find
  orphaned references.

```bash
node --env-file=.env.local scripts/check-tax.mjs
node --env-file=.env.local scripts/check-sessions.mjs
```

These read via the `SUPABASE_SECRET_KEY` (admin) and bypass RLS.

### `.next` cache + branch switches

Switching git branches while `npm run dev` is running can leave the
dev server serving compiled artifacts from the previous branch's
code. Symptom: edits land in the file but the browser shows the old
UI. **`rm -rf .next && npm run dev`** clears it. Build (`npm run
build`) writes to the same dir and can confuse the dev server too.

### Custom taxonomy is per-user, sessions reference IDs

A session's `techniques[].techniqueId` is a string ID, not a foreign
key. If a custom technique definition (`user_taxonomy.data.techniques`)
is missing for that ID, the session detail renders "Unknown technique"
and any "click the technique" link points to a profile that says
"Not found".

This can happen if:
- The custom technique upsert raced with a navigation and was lost
  (see "fire-and-forget" above).
- The user manually edited the JSONB row.
- A session was migrated from another account (no migration path
  exists today, but historically test data has moved around).

If you suspect orphan IDs, run `scripts/check-sessions.mjs` to find
them. Recovery is currently manual: re-add the custom via the log
flow, or edit `user_taxonomy.data.techniques` directly.

### Profile pages: the "Guide" concept

The technique and position profile pages ship a "Guide" section that
auto-seeds from the **first logged drilled entry's** freeform `notes`
(plus any `keyDetails` cues, rendered as paper-yellow cards
underneath). This came from a real user observation: people write
the most detailed text the first time they drill a move, and rarely
go back to curate `Personal notes` manually.

If you change the seeding heuristic, preserve the "Make mine"
button — clicking it copies the seed into the textarea so users can
adopt the first-log text as a starting draft in one click. After
they save, the personal note takes precedence over the seed; the
seed remains visible only as the timeline entry.

### Working preferences (per the project owner)

- **Push-as-you-go**: small, focused commits. Push to `dev` (or main
  if working on a one-off line) without batching.
- **Verify before claiming done**: render in the preview browser and
  click the actual flow, don't just `tsc --noEmit`.
- **Surface trade-offs explicitly**: when you have to defer a
  feature (e.g. attempted-vs-executed for sparring submissions), say
  so in the commit message and link to where it'd plug in.
- **Don't generate documentation files unless asked.** This file
  exists; update it. README/AGENTS/DESIGN/TECHNICAL_OVERVIEW are the
  designated documentation surfaces.
