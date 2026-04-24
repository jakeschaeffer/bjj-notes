# Grapple Graph

A personal training journal for Brazilian Jiu-Jitsu practitioners. Track techniques, log sparring sessions, and monitor your progress over time.

## Features

- **Session Logging** - Log training sessions with techniques drilled and sparring rounds
- **Voice Notes** - Record voice notes that are transcribed and automatically parsed into structured session data
- **Sparring Tracker** - Track rounds, partners, submissions, and dominant/stuck positions
- **Technique Taxonomy** - Hierarchical position and technique database with search; click any
  position or technique chip to drill into its profile.
- **Technique & Position Profiles** - Dedicated `/techniques/<id>` and
  `/positions/<id>` pages with stats (first seen, drilled count,
  sparring appearances, notes), an auto-seeded **Guide** (the first
  logged note becomes the de-facto how-to until you write your own),
  and a Timeline of every appearance across sessions.
- **Progress Tracking** - View your training history and technique progress over time
- **Partner Management** - Keep track of training partners and sparring history;
  partner names you log are remembered as autocomplete suggestions for
  future sessions.
- **Mobile-first chrome** - Site nav collapses to a hamburger menu below
  the `md` breakpoint with a slide-down dropdown of routes.

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

### Test user (dev)

Signups require an invite code, so use the admin API to create a
confirmed user for local development. With `SUPABASE_SECRET_KEY` set in
`.env.local`:

```bash
npm run seed:test-user
```

Defaults: `test@example.com` / `testpassword123`. Override with
`TEST_USER_EMAIL` / `TEST_USER_PASSWORD` env vars. The script is
idempotent — re-running resets the password and re-confirms the email.

Log in at [http://localhost:3000/login](http://localhost:3000/login)
with those credentials.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Auth pages (login, signup)
│   ├── (main)/            # Main app pages
│   │   ├── layout.tsx     # Site shell: paper bg, fonts (Inter +
│   │   │                  #   IBM Plex Mono), SiteHeader w/ hamburger
│   │   ├── log/           # Session logging + edit (via ?edit=<id>)
│   │   ├── sessions/      # Session history list
│   │   │   └── [id]/      # Session detail + delete; tech/pos names
│   │   │                  #   are clickable links into the profiles
│   │   ├── taxonomy/      # Position & technique reference (chips
│   │   │                  #   route to the profile pages)
│   │   ├── techniques/    # Technique library (modal preview)
│   │   │   └── [id]/      # Full technique profile (stats, Guide,
│   │   │                  #   timeline)
│   │   ├── positions/     # (no list page)
│   │   │   └── [id]/      # Full position profile (stats, Guide,
│   │   │                  #   structure, timeline)
│   │   ├── progress/      # Progress dashboard
│   │   └── settings/      # Invite codes + partner list
│   └── api/               # API routes (transcripts, extractions,
│                          #   invite-codes, auth/signup, env-check)
├── components/            # React components
│   ├── ui/               # Button, Card, FormField, Modal, Tag
│   ├── auth/             # AuthGuard, AccountActions
│   ├── site/             # SiteHeader (client component, hamburger
│   │                     #   nav at mobile)
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
2. **Edit** (`/log?edit=<id>` or after clicking "Edit session" in view
   mode) — form editable, primary button is "Update session".
3. **View** (immediately after a save or update) — fields are read-only;
   Quick Capture hidden; primary button is "Edit session".

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

### Technique & Position Profiles

Every technique and position has a dedicated profile page at
`/techniques/<id>` and `/positions/<id>`. Profiles include:

- **Stats**: first seen, drilled count, sparring appearances, note
  count.
- **Guide**: a readable how-to for the move/position. If you've
  written a personal note (`updateTechniqueNote` /
  `updatePositionNote`), that becomes the guide. Otherwise, the
  earliest logged drilled entry's freeform `notes` (and any
  `keyDetails` cues) auto-seeds the guide, captioned `from first
  log · <date>`. The "Make mine" button copies the seed into the
  textarea so you can adopt it as a starting draft.
- **Structure** (positions only): child positions and the techniques
  available from this position, all clickable.
- **Timeline**: every session where the move/position appeared
  (drilled, position note, or sparring), each entry linking back to
  the session detail.

Position and technique names in `/sessions/<id>` and the round-detail
tag pills are clickable — they route to these profile pages. The
session detail Back button calls `router.back()` so you return to
wherever you came from (a profile timeline, a search, etc.) rather
than the sessions list every time.

### Custom IDs and URL encoding

Custom positions and techniques created from the log page get IDs
like `custom:hip-bump-sweep-abc12345`. The `:` may be URL-encoded as
`%3A` in some navigations. Profile pages decode the segment defensively:

```ts
const id = params?.id ? decodeURIComponent(params.id) : "";
```

If you build a new dynamic route that consumes a custom-formatted ID,
do the same.

## Scripts

```bash
npm run dev            # Start development server
npm run build          # Build for production
npm run start          # Start production server
npm run lint           # Run ESLint
npm run seed:test-user # Create/reset a confirmed test user for local login
```

Diagnostic scripts (read-only via `SUPABASE_SECRET_KEY`):

```bash
node --env-file=.env.local scripts/check-tax.mjs
# Dumps the test user's custom positions, custom techniques, and
# saved partner names from user_taxonomy.

node --env-file=.env.local scripts/check-sessions.mjs
# Lists session technique IDs and flags any custom IDs that are
# referenced by sessions but missing from user_taxonomy (orphans).
```

## License

Private project.
