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
| **Session logging** | `src/app/(main)/log/page.tsx` (2400+ lines, core feature) |
| **Types** | `src/lib/types/*.ts` (Session, Position, Technique, etc.) |
| **Taxonomy** | `src/lib/taxonomy/index.ts`, `src/data/*.json` |
| **Extraction** | `src/lib/extraction/match-taxonomy.ts` |
| **Hooks** | `src/hooks/use-user-taxonomy.ts`, `use-local-sessions.ts` |
| **API routes** | `src/app/api/transcripts/route.ts` |
| **UI components** | `src/components/ui/*.tsx` (Button, Card, FormField, Tag, Modal) |

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
The log page (`src/app/(main)/log/page.tsx`) is large. Key sections:
- Lines 1-50: Imports and types
- Lines 200-280: State declarations
- Lines 350-600: Handler functions (with useCallback)
- Lines 1260+: JSX render

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

const { positions, techniques, index } = useUserTaxonomy();

// Get children of a position
const children = index.positionsByParent.get(parentId) ?? [];

// Get techniques for a position
const techs = index.techniquesByPosition.get(positionId) ?? [];

// Fuzzy search techniques
const results = index.techniqueSearch.search(query);
```

---

## Testing Considerations

- No test framework currently configured
- Use `npx tsc --noEmit` to verify TypeScript
- Use `npm run build` to verify full build (may fail on network issues with Google Fonts)
- Manual testing in browser for UI changes

---

## Known Technical Debt

1. **Log page size**: 2400+ lines, could be split into sub-components
2. **State sprawl**: 28 useState calls could be consolidated into objects
3. **No automated tests**: Manual testing only
4. **Accessibility gaps**: Limited ARIA labels and focus states (partially addressed in UI components)

---

## Branch Conventions

When creating branches for Claude Code:
- Format: `claude/{description}-{session-suffix}`
- Example: `claude/fix-voice-recording-timeout-9n2Ve`

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
