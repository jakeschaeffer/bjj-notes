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
- **Database**: Supabase (PostgreSQL + Auth)
- **Search**: Fuse.js for fuzzy search
- **Forms**: React Hook Form + Zod validation

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
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_key  # For voice transcription
```

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
│   │   ├── log/           # Session logging
│   │   ├── sessions/      # Session history
│   │   ├── taxonomy/      # Position & technique reference
│   │   ├── progress/      # Progress tracking
│   │   ├── techniques/    # Technique library
│   │   └── settings/      # User settings & partners
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # Shared UI components
│   ├── positions/        # Position picker components
│   ├── techniques/       # Technique picker components
│   ├── sparring/         # Sparring round components
│   ├── taxonomy/         # Taxonomy display components
│   └── extraction/       # Voice extraction review
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and types
│   ├── types/           # TypeScript type definitions
│   ├── taxonomy/        # Taxonomy data and utilities
│   └── extraction/      # Voice-to-data extraction
└── db/                   # Database client setup
```

## Key Concepts

### Taxonomy

The app uses a hierarchical taxonomy for BJJ positions and techniques:

- **Positions** have perspectives (top, bottom, neutral) and can have parent/child relationships
- **Techniques** are associated with starting positions and have categories (submission, sweep, pass, etc.)

### Session Logging

Sessions can be logged in two modes:

1. **Lesson Mode** - Log techniques drilled with optional position context, key details, and notes
2. **Sparring Mode** - Log rounds with partners, submissions, and position tracking

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
