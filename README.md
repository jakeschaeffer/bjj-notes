# Grapple Graph

A personal training journal for Brazilian Jiu-Jitsu practitioners. Track techniques, log sparring sessions, and monitor your progress over time.

## Features

- **Session Logging** - Log training sessions with techniques drilled and sparring rounds
- **Voice Notes** - Record voice notes that are transcribed and automatically parsed into structured session data
- **Sparring Tracker** - Track rounds, partners, submissions, and dominant/stuck positions
- **Technique Taxonomy** - Hierarchical position and technique database with search
- **Progress Tracking** - View your training history and technique progress over time
- **Partner Management** - Keep track of training partners and sparring history

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Search**: Fuse.js for fuzzy search
- **Dates**: `date-fns`; dates stored as `"YYYY-MM-DD"` and parsed via
  the project's `parseLocalDate` helper (see `src/lib/utils/date.ts`) to
  avoid UTC off-by-one display bugs.
- **Voice transcription**: OpenAI Whisper
- **Extraction**: OpenAI GPT-4o-mini (Responses API, structured outputs)

> `react-hook-form` and `zod` are listed in `package.json` but not
> currently imported anywhere. Form validation is hand-rolled in the
> log page. Don't assume either library is in use until an import
> appears.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account (for database and auth)

### Environment Variables

Create a `.env.local` file with the following variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# One of these must be set (SECRET_KEY preferred, SERVICE_ROLE_KEY is legacy):
SUPABASE_SECRET_KEY=your_secret_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

OPENAI_API_KEY=your_openai_key              # For voice transcription + extraction
INVITE_ADMIN_EMAILS=you@example.com         # Comma-separated admin allowlist.
                                            # REQUIRED: the invite-codes API
                                            # fails closed when this is unset.
```

See `docs/SUPABASE.md` for full setup, and `TECHNICAL_OVERVIEW.md` for
the complete env-var reference.

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (main)/            # Main app pages
│   │   ├── log/           # Session logging + edit (via ?edit=<id>)
│   │   ├── sessions/      # Session history list
│   │   │   └── [id]/      # Session detail + delete
│   │   ├── taxonomy/      # Position & technique reference
│   │   ├── progress/      # Progress dashboard
│   │   ├── techniques/    # Technique library
│   │   └── settings/      # Invite codes + partner list
│   └── api/               # API routes (transcripts, extractions,
│                          #   invite-codes, auth/signup, env-check)
├── components/            # React components
│   ├── ui/               # Button, Card, FormField, Modal, Tag
│   ├── auth/             # AuthGuard, AccountActions
│   ├── positions/        # PositionPicker
│   ├── techniques/       # TechniquePicker, TagPicker
│   ├── sparring/         # PartnerPicker (SparringRoundSection is
│   │                     #   legacy/unused)
│   ├── taxonomy/         # TaxonomyCard, ClickableTaxonomy
│   ├── progress/         # TrainingCalendar, StreakStats,
│   │                     #   TechniqueRecencyList,
│   │                     #   PositionCoverageChart,
│   │                     #   SparringTimeline, KnowledgeCard
│   └── extraction/       # ExtractionReviewPanel
├── hooks/                # Custom React hooks (auth, sessions, taxonomy)
├── lib/                  # Utilities and types
│   ├── types/           # TypeScript type definitions
│   ├── taxonomy/        # Index building, matching
│   ├── extraction/      # OpenAI schemas, fuzzy matching
│   ├── sessions/        # normalizeSession, sortSessions
│   │                    #   (rest of local.ts is legacy/unused)
│   └── utils/           # cn, createId, slugify, parseLocalDate,
│                        #   todayLocalISO
├── db/                   # Supabase admin + browser clients
└── data/                 # Static taxonomy (30 positions, 50 techniques)
```

## Key Concepts

### Taxonomy

The app uses a hierarchical taxonomy for BJJ positions and techniques:

- **Positions** have perspectives (top, bottom, neutral) and can have parent/child relationships
- **Techniques** are associated with starting positions and have categories (submission, sweep, pass, etc.)

### Session Logging

The log page is a single scrollable form with three operating modes:

1. **New** (`/log`) — fresh session, editable form, "Save session" button.
2. **View** (`/log?edit=<id>` or immediately after a save) — fields are
   read-only; Quick Capture hidden; primary button is "Edit session".
3. **Edit** — user clicked "Edit session" in view mode; form is editable
   again with "Update session" as the primary button.

A session can combine any of: techniques drilled (with or without a
position), position-only notes, sparring rounds, and freeform notes.
There is no "lesson vs. sparring" mode choice.

Voice or pasted transcripts can pre-fill the form; drafts that came from
extraction carry an "Auto-filled · verify" badge that clears the first
time the user edits the draft.

### Voice Extraction

Voice notes are transcribed and parsed using AI to automatically extract:
- Session metadata (date, gi/nogi, session type)
- Techniques mentioned
- Sparring round details

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## License

Private project.
