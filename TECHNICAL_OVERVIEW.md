# Technical Overview

Grapple Graph is an invite-only training log application with AI-powered voice transcription, intelligent taxonomy matching, and session analytics. Built with Next.js 16, React 19, Supabase, and OpenAI.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js App Router                        │
├─────────────────────────────────────────────────────────────────┤
│  (auth)/           │  (main)/              │  api/              │
│  - login           │  - log (core)         │  - auth/signup     │
│  - signup          │  - sessions           │  - transcripts     │
│                    │  - techniques         │  - extractions     │
│                    │  - taxonomy           │  - invite-codes    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
        ┌──────────┐   ┌───────────┐   ┌───────────┐
        │ Supabase │   │  OpenAI   │   │  Static   │
        │  (Auth,  │   │ (Whisper, │   │   JSON    │
        │   DB,    │   │ GPT-4o)   │   │ Taxonomy  │
        │ Storage) │   │           │   │           │
        └──────────┘   └───────────┘   └───────────┘
```

---

## Data Model

### Core Entities

#### Position (static taxonomy)
Read-only hierarchical taxonomy shipped with the app. Stored in `src/data/positions.json`.

```typescript
interface Position {
  id: string;                           // UUID or slug
  name: string;                         // "Closed Guard"
  slug: string;                         // "closed-guard"
  parentId: string | null;              // Hierarchical parent
  path: string[];                       // Full path from root
  perspective: "top" | "bottom" | "neutral";
  giApplicable: boolean;
  nogiApplicable: boolean;
  isCustom?: boolean;                   // User-created
}
```

**Hierarchy example:**
- Guard (root)
  - Closed Guard
    - High Guard
  - Open Guard
    - De La Riva
    - Spider Guard

#### Technique (static taxonomy)
Read-only taxonomy shipped with the app. Stored in `src/data/techniques.json`.

```typescript
type TechniqueCategory = "submission" | "sweep" | "pass" | "escape" |
                         "takedown" | "transition" | "guard-retention" | "control";

type SubmissionType = "choke" | "armlock" | "shoulder-lock" |
                      "wristlock" | "leglock" | "spine-lock" | "compression";

interface Technique {
  id: string;
  name: string;                         // "Triangle Choke"
  category: TechniqueCategory;
  positionFromId: string;               // Required starting position
  positionToId?: string | null;         // Optional ending position
  submissionType: SubmissionType | null;
  giApplicable: boolean;
  nogiApplicable: boolean;
  aliases: string[];                    // ["Triangle", "Sankaku"]
  keyDetails?: string[];
  isCustom?: boolean;
}
```

#### Session (user data)
Stores session metadata, notes, techniques drilled, and sparring details.

```typescript
type SessionType = "regular-class" | "open-mat" | "private" |
                   "competition" | "seminar" | "drilling-only";

interface Session {
  id: string;
  userId: string;
  date: string;                         // "YYYY-MM-DD" — always parse with
                                        // parseLocalDate() for display
  sessionType: SessionType;
  giOrNogi: "gi" | "nogi" | "both";
  durationMinutes: number | null;
  energyLevel: 1 | 2 | 3 | 4 | 5 | null;
  techniques: SessionTechnique[];
  positionNotes: SessionPositionNote[];
  sparringRounds: SparringRound[];
  notes: string;
  insights: string[];
  goalsForNext: string[];
  legacySparring?: {                    // Back-compat for pre-rounds data
    rounds: number;
    subsAchieved: number;
    subsReceived: number;
    notes: string;
  };
  createdAt: string;                    // ISO 8601
  updatedAt: string;
}
```

#### SessionTechnique (user data)
Links a session to techniques drilled with notes and key details.

```typescript
interface SessionTechnique {
  id: string;
  sessionId: string;
  positionId: string | null;            // Optional — techniques can be logged
                                        // without a starting position
  techniqueId: string;
  keyDetails: string[];                 // ["grip on collar", "hip angle"]
  notes: string;
}
```

#### SparringRound (user data)
Tracks individual sparring rounds within a session.

```typescript
type BeltLevel = "white" | "blue" | "purple" | "brown" | "black" | "unknown";

interface SparringRound {
  id: string;
  partnerName: string | null;
  partnerBelt: BeltLevel | null;
  submissionsFor: RoundSubmission[];
  submissionsAgainst: RoundSubmission[];
  submissionsForCount: number;
  submissionsAgainstCount: number;
  dominantPositions: string[];          // Position IDs
  stuckPositions: string[];             // Position IDs
  notes: string;
}

interface RoundSubmission {
  id: string;
  techniqueId: string;
  positionId: string | null;
}
```

#### User Taxonomy (user data)
User-specific additions to the base taxonomy.

```typescript
interface UserTag {
  id: string;
  tag: string;
  usageCount: number;
  createdAt: string;
  lastUsedAt: string;
}

interface TechniqueProgress {
  id: string;
  techniqueId: string;
  firstSeenAt: string;
  lastDrilledAt: string;
  timesDrilled: number;
}
```

---

## API Design

### Supabase Tables

```sql
-- Core session storage (full JSON in payload)
sessions
├── id (text, PK)
├── user_id (uuid, FK → auth.users)
├── date (date)
├── payload (jsonb)                    -- Full Session object
├── created_at (timestamptz)
└── updated_at (timestamptz)

-- User taxonomy customizations
user_taxonomy
├── user_id (uuid, PK, FK → auth.users)
├── data (jsonb)                       -- UserTaxonomyState
└── updated_at (timestamptz)

-- Audio transcripts
transcripts
├── id (uuid, PK)
├── user_id (uuid, FK)
├── session_id (text, FK → sessions, nullable)
├── source (text)                      -- 'audio_upload' | 'voice_recording'
├── audio_url (text)
├── raw_text (text)
├── status (text)                      -- 'pending' | 'processing' | 'completed' | 'failed'
├── model (text)
├── created_at (timestamptz)
└── processed_at (timestamptz)

-- AI extraction results
transcript_extractions
├── id (uuid, PK)
├── transcript_id (uuid, FK → transcripts)
├── user_id (uuid, FK)
├── extracted_payload (jsonb)
├── confidence (numeric)
├── status (text)                      -- 'draft' | 'reviewed' | 'applied'
├── created_at (timestamptz)
└── updated_at (timestamptz)

-- Invite system
signup_codes
├── id (uuid, PK)
├── code_plain (text)
├── code_hash (text, unique)
├── max_uses (int)
├── uses (int)
├── expires_at (timestamptz)
├── is_active (bool)
└── created_at (timestamptz)
```

### Storage Buckets

```
session-audio (private)
└── {user_id}/
    └── {transcript_id}.webm
```

### REST Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/signup` | Create account with invite code |
| POST | `/api/transcripts` | Upload audio, transcribe, extract |
| POST | `/api/transcripts/text` | Submit text directly for extraction |
| GET | `/api/transcripts/[id]` | Retrieve transcript |
| GET | `/api/extractions/[id]` | Retrieve extraction |
| GET/POST/PATCH | `/api/invite-codes` | Admin invite management |
| GET | `/api/env-check` | Verify environment configuration |

---

## Key Flows

### Session Logging Flow

```
┌─────────────────┐
│ Voice Recording │──┐
│ or Text Input   │  │
└─────────────────┘  │
                     ▼
              ┌──────────────┐
              │ /api/transcripts │
              │ - Whisper API    │
              │ - GPT-4o-mini    │
              └───────┬──────────┘
                      ▼
              ┌──────────────┐
              │ Fuzzy Match  │
              │ to Taxonomy  │
              └───────┬──────┘
                      ▼
              ┌──────────────┐
              │ Extraction   │
              │ Review Panel │ ◄── User reviews/edits
              └───────┬──────┘
                      ▼
              ┌──────────────┐
              │ Session Form │ ◄── Manual refinement
              │ (pre-filled) │
              └───────┬──────┘
                      ▼
              ┌──────────────┐
              │   Supabase   │
              │ - sessions   │
              │ - taxonomy   │
              └──────────────┘
```

### Taxonomy Matching

The extraction system uses Fuse.js fuzzy matching:

1. **Position Matching**: Matches position names against the hierarchy
   - Weights: name (1.0), slug (0.5), searchLabel (0.7)
   - Threshold: 0.5

2. **Technique Matching**: Matches technique names with position hints
   - Prefers techniques from the indicated position
   - Falls back to global technique search
   - Returns confidence scores (0-1)

---

## State Management

### Hooks

| Hook | Purpose |
|------|---------|
| `useAuth()` | Auth state, user object, loading state |
| `useUserTaxonomy()` | Combined system + user taxonomy, mutations, notes |
| `useLocalSessions()` | Session CRUD, Supabase sync (hook name is historical — backend is Supabase, not localStorage) |

### useUserTaxonomy

Central hook for taxonomy operations:

```typescript
const {
  positions,                // System + custom positions
  techniques,               // System + custom techniques
  index,                    // TaxonomyIndex for lookups
  tags,                     // User tags with usage stats
  tagSuggestions,           // Tags sorted by frequency
  progress,                 // Technique drill history
  partners,                 // Partner names with round counts
  partnerSuggestions,       // Partner names sorted by frequency
  techniqueNotes,           // User notes attached to techniques
  positionNotes,            // User notes attached to positions
  techniqueNotesById,       // Map<techniqueId, UserTechniqueNote>
  positionNotesById,        // Map<positionId, UserPositionNote>
  addCustomPosition,        // Create user position
  addCustomTechnique,       // Create user technique
  recordTagUsage,           // Track tag usage
  recordTechniqueProgress,  // Update drill stats
  recordPartnerNames,       // Track partners
  updateTechniqueNote,      // Upsert a personal note on a technique
  updatePositionNote,       // Upsert a personal note on a position
} = useUserTaxonomy();
```

### useLocalSessions

```typescript
const {
  sessions,                 // Session[] — loaded from Supabase
  addSession,               // (session) => Promise<SaveResult>
  updateSession,            // (session) => Promise<SaveResult>
  deleteSession,            // (id) => Promise<void>   (see audit: should
                            //                          return SaveResult)
  getSessionById,           // (id) => Session | undefined
} = useLocalSessions();

type SaveResult = { ok: true } | { ok: false; error: string };
```

**Always check `result.ok`** before showing success feedback or resetting
the form. Failing to do so reintroduces the "UI claims saved but DB write
failed" class of bug.

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Public auth pages
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/                 # Protected app pages
│   │   ├── log/                # Session logging + edit (core feature)
│   │   ├── sessions/           # Session history list
│   │   │   └── [id]/           # Session detail + delete
│   │   ├── techniques/         # Technique browser
│   │   ├── taxonomy/           # Taxonomy reference
│   │   ├── progress/           # Progress dashboard
│   │   ├── settings/           # Invite codes, partner list
│   │   └── layout.tsx
│   ├── api/
│   │   ├── auth/signup/
│   │   ├── transcripts/        # Audio upload + text paste
│   │   │   └── [id]/
│   │   ├── extractions/
│   │   │   └── [id]/
│   │   ├── invite-codes/
│   │   └── env-check/          # ⚠ Public endpoint — leaks which secrets
│   │                           #    are set; see audit TODOs.
│   └── page.tsx                # Landing page
├── components/
│   ├── ui/                     # Button, Card, FormField, Modal, Tag
│   ├── auth/                   # AuthGuard, AccountActions
│   ├── extraction/             # ExtractionReviewPanel
│   ├── positions/              # PositionPicker
│   ├── techniques/             # TechniquePicker, TagPicker
│   ├── sparring/               # SparringRoundSection (⚠ unused — log
│   │                           #    page implements inline), PartnerPicker
│   ├── taxonomy/               # TaxonomyCard, ClickableTaxonomy
│   └── progress/               # TrainingCalendar, StreakStats,
│                               #    TechniqueRecencyList,
│                               #    PositionCoverageChart,
│                               #    SparringTimeline, KnowledgeCard
├── db/
│   └── supabase/               # Admin and browser clients
├── hooks/
│   ├── use-auth.ts
│   ├── use-user-taxonomy.ts
│   └── use-local-sessions.ts   # Supabase-backed; name is historical
├── lib/
│   ├── types/                  # TypeScript interfaces
│   ├── taxonomy/               # Index building, matching
│   ├── extraction/             # OpenAI schemas, matching
│   ├── sessions/               # normalizeSession, sortSessions
│   │                           #    (rest of local.ts is dead code)
│   └── utils/                  # cn, createId, slugify,
│                               #    parseLocalDate, todayLocalISO
└── data/
    ├── positions.json          # 30 positions (system taxonomy)
    └── techniques.json         # 50 techniques (system taxonomy)
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL (browser client) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key (browser client) |
| `SUPABASE_URL` | No | Override URL for server routes; falls back to `NEXT_PUBLIC_SUPABASE_URL` |
| `SUPABASE_SECRET_KEY` | Yes\* | Preferred server-only key for admin operations |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes\* | Legacy fallback for `SUPABASE_SECRET_KEY` |
| `OPENAI_API_KEY` | Yes | Whisper + GPT-4o-mini |
| `INVITE_ADMIN_EMAILS` | Yes\*\* | Comma-separated admin email allowlist |

\* At least one of `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` must be set, or server routes will throw.

\*\* `INVITE_ADMIN_EMAILS` is technically optional, **but the invite-codes API fails closed** when it is unset — no one will be able to create or manage invite codes. Set this to your admin email(s) during setup.

---

## Security

- **Row Level Security (RLS)**: All tables enforce user-scoped access
- **Invite-only signup**: Requires valid invite code
- **Auth guards**: Protected routes check session
- **Service role isolation**: Admin operations use separate client
- **Admin allowlist fails closed**: `isAdminEmail` returns `false` when
  `INVITE_ADMIN_EMAILS` is unset (vs. the prior behavior of granting every
  authenticated user admin rights).

---

## Log Page State Machine

The log page (`src/app/(main)/log/page.tsx`) is the core feature and
doubles as both the "new session" form and the "edit existing session"
view. It runs in one of three modes via the `viewMode` state:

| Mode | When it's entered | What the user sees |
|------|-------------------|--------------------|
| `new`  | Fresh `/log` visit with no query param | Full editable form, Quick Capture visible, primary button "Save session" |
| `view` | `/log?edit=<id>` query param; also after a successful save or update | Fieldset-disabled form (read-only), Quick Capture hidden, sections force-expanded, primary button "Edit session" |
| `edit` | User clicks "Edit session" from view mode | Form editable again, primary button "Update session" |

Transitions:
- `new → view` on successful save (the just-saved session is loaded in
  view mode for immediate inspection).
- `view → edit` on "Edit session" click.
- `edit → view` on successful update.
- `view|edit → new` on "Start new session" / "Log another" (calls
  `resetForm()` and strips `?edit=` from the URL).

The read-only state is enforced by wrapping the form body in
`<fieldset disabled={readOnly}>`, which natively disables all nested
inputs, selects, textareas, and buttons. The Save/Edit button row and
saved-summary banner are rendered outside the fieldset so they stay
interactive. Add/remove draft buttons are conditionally rendered (not
just disabled) so they don't appear greyed out.

### Extraction "auto-filled · verify" flag

Drafts created by applying an AI extraction set `fromExtraction: true` on
`DraftTechnique` and `DraftRound`. The UI renders an amber pill on each
such draft, signalling "this was auto-filled, please verify before
saving." The flag is cleared the first time the user edits the draft
(centralized in `updateTechnique` / `updateRound`).

### Notes accordion

The notes + reflections accordion uses an explicit `notesOpen` boolean
rather than the prior `notes === " "` sentinel hack. The accordion also
auto-opens when any note field has content on load, and stays open
automatically in `view` mode.

---

## Date Handling

Session dates are stored as `"YYYY-MM-DD"` strings. Rendering them with
`new Date(str)` treats the string as UTC midnight — which is the
*previous* calendar day for any user west of UTC once formatted in local
time. This was a shipped bug that caused sessions logged on April 21 to
display as April 20.

Use **`parseLocalDate(iso)`** from `@/lib/utils` for every display site:

```ts
import { parseLocalDate } from "@/lib/utils";
format(parseLocalDate(session.date), "MMM d, yyyy");  // ✅
format(new Date(session.date), "MMM d, yyyy");        // ❌ UTC off-by-one
```

`todayLocalISO()` in the same module returns today's date as a local
"YYYY-MM-DD" — use it anywhere you need a default-to-today value.

See `AUDIT_FINDINGS.md` for the (currently outstanding) sites that still
use `new Date(...)` on a date string.

---

## Known Issues

Outstanding bugs and design gaps from the April 2026 audit are tracked in
`docs/AUDIT_FINDINGS.md`. Start there before adding new features — many
high-severity fixes are small, local changes worth doing first.
