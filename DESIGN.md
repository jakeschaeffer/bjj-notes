# Grapple Graph — UI Design Spec

## Design Philosophy

Grapple Graph is a post-training capture tool. The user just finished rolling—they're
tired, sweaty, and have maybe 5 minutes of motivation before the details fade. Every
screen must respect that constraint: **fast capture first, rich review later.**

The existing amber/zinc palette, rounded cards, and Tailwind 4 system work well. This
document focuses on two core screens that need the most design attention:

1. **Session Logging** — the primary write path
2. **Progress / "What I've Learned"** — the primary read path

---

## 1. Session Logging Screen (`/log`)

### Current State

The current log page is functional but has friction points:

- The "lesson" vs "sparring" tab split forces users to choose a mode before they've
  started writing. Most sessions include both drilling and rolling.
- Metadata (date, type, gi/nogi) is collapsed by default — good — but the collapsible
  chrome adds visual noise.
- The technique card asks for Position then Technique sequentially, which is fine for
  structured drilling but awkward when the user just wants to jot "we did armbars."
- Sparring rounds have good granularity (submissions, dominant/stuck positions) but
  the round-by-round card pattern gets long quickly for 5-6 round sessions.

### Proposed Design

#### A. Remove the Lesson / Sparring Tab Split

Replace the binary mode tabs with a single scrollable form that has two clearly
delineated sections. Both are always visible, collapsible but open by default:

```
┌─────────────────────────────────────────────┐
│  Quick Capture (voice/paste)                │
├─────────────────────────────────────────────┤
│  Session Details  (date • regular class •   │
│                    gi • 90min)    [Edit]     │
├─────────────────────────────────────────────┤
│  ▼ What did you work on?                    │
│  ┌──────────────────────────────────┐       │
│  │ Technique 1:  [Armbar from Mount]│       │
│  │ Details...                       │       │
│  └──────────────────────────────────┘       │
│  + Add technique                            │
├─────────────────────────────────────────────┤
│  ▼ How did sparring go?                     │
│  ┌──────────────────────────────────┐       │
│  │ Round 1:  vs Jake (Blue)         │       │
│  │ +2 / -0  │ Dominant: Mount       │       │
│  └──────────────────────────────────┘       │
│  + Add round                                │
├─────────────────────────────────────────────┤
│  ▼ Reflections                              │
│  Notes, insights, goals for next            │
├─────────────────────────────────────────────┤
│  [ Save Session ]                           │
└─────────────────────────────────────────────┘
```

**Rationale:** Most sessions have a drilling portion and a rolling portion. Forcing
a tab choice either means the user logs two separate sessions or skips one half. A
unified form with collapsible sections handles all session types naturally. A
"drilling-only" session just has zero sparring rounds.

#### B. Compact Technique Entry

The current technique card uses a two-column Position / Technique picker layout.
Simplify the default entry to a single-line autocomplete that searches across both
techniques and positions simultaneously:

```
┌──────────────────────────────────────────────┐
│ 🔍 Search technique or position...           │
│                                              │
│  Recent: Armbar from Mount, Triangle, ...    │
└──────────────────────────────────────────────┘
```

When a technique is selected, the position is auto-filled from its `positionFromId`.
If the user types a position name instead, it creates a position-only note row. The
expanded detail panel (key details + notes) stays the same — it's well designed.

This reduces the default technique card from ~120px tall to ~48px for a fast entry,
expandable on tap.

#### C. Compact Sparring Round Summary

For the common case of 5-6 rounds with minimal notes, offer a **compact summary
row** option alongside the detailed card:

```
┌──────────────────────────────────────────────┐
│ Sparring Summary                             │
│                                              │
│  R1  Jake (blue)     +1 -0   Mount, Back     │
│  R2  Tyler (purple)  +0 -1   ▼ Stuck: Side   │
│  R3  Open            +0 -0                    │
│  R4  Sarah (blue)    +2 -0   Mount            │
│                                              │
│  [+ Add round]     [Expand all]              │
└──────────────────────────────────────────────┘
```

Each row is tappable to expand into the full card with submission details, position
tags, and notes. This keeps the common case (quick round summary) fast while
preserving the full detail when needed.

**Implementation:** Each `DraftRound` already has all the fields. The compact view
just renders a single row per round with:
- Partner name + belt dot
- +N / -N submission counts
- Comma-joined dominant position labels
- Tap to expand into the existing card layout

#### D. Quick-Add Patterns

Add a **"Quick round"** button that pre-fills a round template:

```
[+ Quick round: no submissions, no positions]
[+ Quick round: from last session's partner list]
```

The most common sparring entry is "I rolled with X, nothing notable happened." Make
that a one-tap operation.

#### E. Session Templates

For recurring session types (e.g., "Tuesday gi class" or "Saturday open mat"), allow
saving the metadata (type, gi/nogi, duration) as a template. On the log screen,
show a small template bar:

```
Recent: [Tue Gi Class] [Sat Open Mat] [+ Custom]
```

This auto-fills date (today), session type, gi/nogi, and duration. The user jumps
straight to technique entry.

#### F. Post-Save Continuation

After saving, instead of just a flash "Saved!" message, show a brief summary card
with a clear next action:

```
┌──────────────────────────────────────────────┐
│  ✓ Session saved — Feb 6, 2026               │
│                                              │
│  3 techniques • 4 rounds • +2/-1 subs        │
│                                              │
│  [View session]   [Log another]              │
└──────────────────────────────────────────────┘
```

---

## 2. Progress / "What I've Learned" Screen (`/progress`)

### Current State

The progress page has three stat cards (total sessions, techniques logged, last 30
days), top-5 lists for positions and techniques, and two searchable "explore" lists
that open modals with notes and children.

This is a good foundation but has gaps:

- **No temporal dimension.** There's no way to see *when* you trained or how
  consistent you've been over weeks/months.
- **Flat top-5 lists** don't show the full distribution. A user with 200 sessions
  can't see which techniques they've been focusing on recently vs historically.
- **The position/technique modals** are disconnected from session context. You see
  notes but can't easily jump to the sessions where those notes came from.
- **No "what am I neglecting?"** view — which positions/techniques have you not
  touched in a while?

### Proposed Design

#### A. Training Calendar (Hero Component)

The centerpiece of the progress page should be a **GitHub-style contribution
calendar** adapted for training — a grid of cells, one per day, colored by training
activity:

```
Training Activity — 2026

    Jan         Feb         Mar         Apr
Mo  ■ □ ■ □    ■ □ ■ ■    □ □ ■ □    ...
Tu  □ □ □ □    □ □ □ □    □ □ □ □
We  ■ □ ■ □    ■ □ ■ □    ■ □ ■ □
Th  □ □ □ □    □ □ □ □    □ □ □ □
Fr  ■ □ ■ □    ■ □ ■ □    ■ □ ■ □
Sa  ■ ■ ■ ■    ■ ■ ■ ■    ■ ■ ■ ■
Su  □ □ □ □    □ □ □ □    □ □ □ □
```

**Color encoding:**
- Empty (zinc-100): No training
- Light amber (amber-100): Session logged, no sparring
- Medium amber (amber-300): Session with sparring
- Dark amber (amber-500): Multiple sessions or competition day

**Hover tooltip:** "Feb 6 — Regular class (gi) • 3 techniques • 4 rounds"

**Click:** Opens a mini session summary inline below the calendar (not a modal),
or navigates to the session detail page.

**Why this works for BJJ:** Consistency is the #1 predictor of progress in grappling.
A visual streak calendar provides immediate motivation ("I've trained 3x/week for
6 weeks straight") and surfaces gaps ("I missed two weeks in March").

**Implementation notes:**
- Use the existing `sessions` array from `useLocalSessions()`
- Group sessions by `date` field into a `Map<string, Session[]>`
- Render a 52-column × 7-row grid (one year), with `date-fns` for date math
- CSS grid with `grid-template-columns: repeat(52, 1fr)` for the year view
- On mobile, show last 3 months instead of full year
- Each cell: `w-3 h-3 rounded-sm` with amber intensity classes

#### B. Streak & Consistency Stats

Replace the current three stat cards with a richer stats row:

```
┌─────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐
│ 47      │  │ 3.2x     │  │ 12       │  │ 156       │
│ Sessions│  │ per week  │  │ Current  │  │ Techniques│
│ total   │  │ (30 day) │  │ streak   │  │ logged    │
└─────────┘  └──────────┘  └──────────┘  └───────────┘
```

- **Sessions total**: existing
- **Weekly frequency**: sessions in last 30 days ÷ 4.3, showing trend arrow (↑/↓)
  vs prior 30 days
- **Current streak**: consecutive weeks with at least one session (more forgiving
  than consecutive days, which is unrealistic for most people)
- **Techniques logged**: existing, but scoped to show "X new this month" as subtitle

#### C. Technique Recency / Neglect Heatmap

A table showing all logged techniques with their recency:

```
┌──────────────────────────────────────────────┐
│  Technique Recency                           │
│                                              │
│  Armbar from Mount    ■■■■■  Last: 2 days    │
│  Triangle Choke       ■■■□□  Last: 12 days   │
│  Kimura               ■■□□□  Last: 3 weeks   │
│  Scissor Sweep        ■□□□□  Last: 6 weeks   │
│  Hip Bump Sweep       □□□□□  Last: 3 months  │
│                                              │
│  Sort: [Recency ▼] [Frequency] [Alpha]       │
└──────────────────────────────────────────────┘
```

The bars represent the last 5 sessions where this technique appeared (filled = present,
empty = absent). Color shifts from amber (recent/practiced) to zinc (neglected).

This directly answers: "What should I ask to drill next class?"

**Implementation:**
- For each technique in `stats.techniqueCounts`, find the dates of sessions containing it
- Calculate `daysSinceLastDrilled` from the most recent session date
- Color scale: <7 days = amber-500, <30 = amber-300, <90 = amber-100, 90+ = zinc-200
- Sort options: by recency (default), by total count, alphabetical

#### D. Position Coverage Map

A visual representation of the BJJ position hierarchy showing where the user has
spent time and where gaps exist:

```
┌──────────────────────────────────────────────┐
│  Position Coverage                           │
│                                              │
│  Guard ━━━━━━━━━━━━━━━━━━                    │
│    Closed Guard  ━━━━━━━━━━━━                │
│    Open Guard    ━━━━━━━                     │
│    Half Guard    ━━━━━━━━━━                  │
│    Butterfly     ━━                          │
│    De La Riva    ━                           │
│                                              │
│  Mount ━━━━━━━━━━━━━                         │
│  Side Control ━━━━━━━━━                      │
│  Back Control ━━━━━━━━━━━                    │
│                                              │
│  Turtle ━                                    │
│  Standing ━━━                                │
└──────────────────────────────────────────────┘
```

Each bar shows relative session count. Indentation follows the position hierarchy
already defined in `positions.json`. Bars are colored by recency (amber = recent,
zinc = stale).

Clicking a position opens the existing modal with children, notes, and techniques —
keeping the current progress page modal functionality intact.

#### E. Sparring Performance Timeline

A simple line/bar chart showing sparring performance over time:

```
┌──────────────────────────────────────────────┐
│  Sparring — Last 3 Months                    │
│                                              │
│  Submissions:  ┌─ For                        │
│        6 ─     │                             │
│        4 ─   ██│  ██                         │
│        2 ─ ████│████  ██    ██               │
│        0 ─ ────┴──────────────────           │
│             W1  W2  W3  W4  W5  W6           │
│                                              │
│        █ Subs achieved   ░ Subs received     │
│                                              │
│  Rounds/week avg: 4.2                        │
│  Submission rate: 0.4 per round              │
└──────────────────────────────────────────────┘
```

**Why not a full charting library?** For a personal logging tool, a simple CSS-based
bar chart (div heights calculated from data) avoids a heavy dependency. The data is
simple enough that we don't need axes, legends, or interactivity beyond hover
tooltips.

**Implementation:**
- Group sparring rounds by ISO week using `date-fns`
- Sum `submissionsForCount` and `submissionsAgainstCount` per week
- Render stacked div bars with max height normalized to the peak week
- Use amber-500 for subs achieved, zinc-300 for subs received
- Show rolling averages as subtitle text

#### F. "What I Know" Knowledge Cards

The bottom of the progress page (replacing the current explore lists) should show
**knowledge cards** — compact summaries of the user's accumulated understanding:

```
┌──────────────────────────────────────────────┐
│  Closed Guard (12 sessions, 8 techniques)    │
│                                              │
│  Personal notes:                             │
│  "Focus on breaking posture first. Hip       │
│   escape to reguard when they stand..."      │
│                                              │
│  Key techniques:                             │
│  Armbar (6x) • Triangle (4x) • Hip bump (3x)│
│                                              │
│  Recent session notes:                       │
│  Feb 4: "Worked on grip fighting sequence"   │
│  Jan 28: "Triangle setups from overhook"     │
│                                              │
│  [View all sessions] [Edit notes]            │
└──────────────────────────────────────────────┘
```

These are organized by position (the natural "chapter" in BJJ knowledge) and show:
1. Session count + technique count for that position
2. The user's personal notes (from `positionNotesById`)
3. Top techniques with frequency counts
4. Most recent 2-3 session notes with dates

**Sort/filter:** By most practiced, most recently practiced, or alphabetical. A search
bar (already exists) filters the list.

This replaces the current flat list + modal approach with a richer inline display that
shows information density without requiring a modal tap.

---

## 3. Navigation & Information Architecture

### Current Nav

```
Home | Log | Sessions | Techniques | Progress | Taxonomy
```

Six items is on the edge of being too many for mobile. The "Taxonomy" page
(position/technique browser) overlaps heavily with what "Techniques" and "Progress"
already show.

### Proposed Nav

```
Log | Sessions | Progress | Library
```

- **Log**: Primary action, stays prominent
- **Sessions**: History list, stays the same
- **Progress**: Calendar + stats + knowledge cards (absorbs current Progress page)
- **Library**: Combines current Techniques + Taxonomy into one browsable reference
  (positions tree + technique search in a single page with tabs)

Home page becomes the dashboard entry point and is accessible via the "Grapple Graph"
logo tap (already works this way).

---

## 4. Component Inventory (New)

### `<TrainingCalendar />`
- Props: `sessions: Session[]`, `year?: number`
- Renders 52×7 day grid with color-coded cells
- Hover tooltips with session summary
- Click to expand inline detail
- Responsive: full year on desktop, 3 months on mobile

### `<StreakStats />`
- Props: `sessions: Session[]`
- Renders stat card row: total, frequency, streak, techniques
- Computed from session dates using `date-fns`

### `<TechniqueRecencyList />`
- Props: `sessions: Session[]`, `index: TaxonomyIndex`
- Renders sortable table of techniques with recency bars
- Three sort modes: recency, frequency, alpha

### `<PositionCoverageChart />`
- Props: `sessions: Session[]`, `index: TaxonomyIndex`
- Renders hierarchical bar chart of position practice frequency
- Uses `index.getChildren()` for hierarchy

### `<SparringTimeline />`
- Props: `sessions: Session[]`
- Renders weekly bar chart of submission counts
- CSS-only bars, no charting library needed

### `<KnowledgeCard />`
- Props: `position: Position`, `sessions: Session[]`, `notes: string`, ...
- Renders inline knowledge summary for a position
- Replaces modal-based explore pattern

### `<CompactRoundRow />`
- Props: `round: DraftRound`, `index: TaxonomyIndex`, `onExpand: () => void`
- Renders single-line sparring round summary
- Tap to expand into full card

---

## 5. Data Considerations

All proposed views use data already available in the existing `Session` type and
`TaxonomyIndex`. No new API endpoints or database changes needed. Key computations:

| View | Data source | Computation |
|------|------------|-------------|
| Training calendar | `sessions[].date` | Group by date, count per day |
| Streak | `sessions[].date` | Sort dates, find consecutive weeks |
| Technique recency | `sessions[].techniques[].techniqueId` | Last occurrence date per technique |
| Position coverage | `sessions[].techniques[].positionId` + `positionNotes` | Count per position ID |
| Sparring timeline | `sessions[].sparringRounds[]` | Weekly aggregation of sub counts |
| Knowledge cards | All session fields + `positionNotesById` | Aggregate by position |

All computations are `useMemo`-friendly since sessions are loaded once and the
dependency is just `[sessions]`.

---

## 6. Mobile Considerations

Grapple Graph will primarily be used on a phone, right after training. Key mobile
decisions:

- **Touch targets**: All tappable elements minimum 44px tall (already enforced by
  existing Button component)
- **Training calendar**: Show 13 weeks (3 months) instead of 52 on mobile. Swipeable
  to see more.
- **Technique entry**: Full-screen modal picker on mobile (existing TechniquePicker
  already does this well)
- **Compact rounds**: Default to compact view on mobile, expanded on desktop
- **Bottom action bar**: Consider a sticky "Save Session" button at the bottom of
  the log screen on mobile to avoid scrolling back up after entering 5+ rounds

---

## 7. Color & Visual Language

Maintain the existing amber/zinc palette. Extend with semantic color usage:

| Color | Meaning |
|-------|---------|
| `amber-500` | Primary action, recent/active, "your strength" |
| `amber-300` | Secondary activity, moderate recency |
| `amber-100` | Light activity, aging out |
| `zinc-200` | Inactive, neglected, needs attention |
| `emerald-500` | Positive outcome (submissions achieved) |
| `red-400` | Negative outcome (submissions received), danger actions |
| Belt colors | `slate-50`, `blue-500`, `purple-500`, `amber-700`, `zinc-900` |

The belt color dots used in sparring rounds are a strong visual element — continue
using these anywhere partner belt level appears.

---

## 8. Implementation Priority

Ordered by user impact and implementation complexity:

1. **Training Calendar** — Highest impact, medium complexity. Answers "am I consistent?"
2. **Unified Log Form** — Remove lesson/sparring tabs, show both sections. Low complexity.
3. **Compact Sparring Rounds** — Reduce scroll length on log page. Low complexity.
4. **Streak & Consistency Stats** — Replace current stats. Low complexity.
5. **Technique Recency List** — Answers "what should I drill?" Medium complexity.
6. **Position Coverage Chart** — Visual gap analysis. Medium complexity.
7. **Knowledge Cards** — Richer inline display replacing modals. Medium complexity.
8. **Sparring Timeline** — Nice to have, lower priority. Medium complexity.
9. **Session Templates** — Convenience feature. Low complexity.
10. **Nav Consolidation** — Merge Techniques + Taxonomy. Requires migration.
