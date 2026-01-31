# Technical Overview

BJJ Notes is an invite-only training log application with AI-powered voice transcription, intelligent taxonomy matching, and session analytics. Built with Next.js 16, React 19, Supabase, and OpenAI.

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
  date: string;                         // "YYYY-MM-DD"
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
  positionId: string;
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
| `useUserTaxonomy()` | Combined system + user taxonomy, mutations |
| `useLocalSessions()` | Session CRUD, Supabase sync |

### useUserTaxonomy

Central hook for taxonomy operations:

```typescript
const {
  positions,                // System + custom positions
  techniques,               // System + custom techniques
  index,                    // TaxonomyIndex for lookups
  tags,                     // User tags with usage stats
  tagSuggestions,           // Sorted by frequency
  progress,                 // Technique drill history
  partners,                 // Partner names with round counts
  addCustomPosition,        // Create user position
  addCustomTechnique,       // Create user technique
  recordTagUsage,           // Track tag usage
  recordTechniqueProgress,  // Update drill stats
  recordPartnerNames,       // Track partners
} = useUserTaxonomy();
```

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/                 # Public auth pages
│   │   ├── login/
│   │   └── signup/
│   ├── (main)/                 # Protected app pages
│   │   ├── log/                # Session logging (core feature)
│   │   ├── sessions/           # Session history
│   │   ├── techniques/         # Technique browser
│   │   ├── taxonomy/           # Taxonomy reference
│   │   └── layout.tsx
│   └── api/
│       ├── auth/signup/
│       ├── transcripts/
│       ├── extractions/
│       └── invite-codes/
├── components/
│   ├── ui/                     # Button, Card, FormField, Modal, Tag
│   ├── auth/                   # AuthGuard, AccountActions
│   ├── extraction/             # ExtractionReviewPanel
│   ├── positions/              # PositionPicker
│   └── techniques/             # TechniquePicker, TagPicker
├── db/
│   └── supabase/               # Admin and client instances
├── hooks/
│   ├── use-auth.ts
│   ├── use-user-taxonomy.ts
│   └── use-local-sessions.ts
├── lib/
│   ├── types/                  # TypeScript interfaces
│   ├── taxonomy/               # Index building, matching
│   ├── extraction/             # OpenAI schemas, matching
│   ├── sessions/               # Normalization
│   └── utils/                  # cn, createId, slugify
└── data/
    ├── positions.json          # ~300 positions
    └── techniques.json         # ~200 techniques
```

---

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase admin operations |
| `OPENAI_API_KEY` | Yes | Whisper + GPT-4o-mini |

---

## Security

- **Row Level Security (RLS)**: All tables enforce user-scoped access
- **Invite-only signup**: Requires valid invite code
- **Auth guards**: Protected routes check session
- **Service role isolation**: Admin operations use separate client
