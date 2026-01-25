# Supabase Setup

Run the SQL below in the Supabase SQL editor before using auth-backed storage.

```sql
create table if not exists sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  payload jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists sessions_user_id_idx on sessions(user_id);
create index if not exists sessions_date_idx on sessions(date desc);

create table if not exists user_taxonomy (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table sessions enable row level security;
alter table user_taxonomy enable row level security;

create policy "Users can manage own sessions" on sessions
  for all using (auth.uid() = user_id);

create policy "Users can manage own taxonomy" on user_taxonomy
  for all using (auth.uid() = user_id);
```

## Environment variables

Set these in `.env.local` (not committed):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL` (optional if you want a non-public URL for server routes)
- `SUPABASE_SECRET_KEY` (server-only; preferred)
- `SUPABASE_SERVICE_ROLE_KEY` (server-only; legacy fallback)
- `OPENAI_API_KEY` (server-only)

## Voice transcript tables

```sql
create table if not exists transcripts (
  id uuid primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  session_id text references sessions(id) on delete set null,
  source text not null check (source in ('audio_upload', 'voice_recording')),
  audio_url text,
  raw_text text default '',
  status text not null check (status in ('pending', 'processing', 'completed', 'failed')),
  model text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

create index if not exists transcripts_user_id_idx on transcripts(user_id);

create table if not exists transcript_extractions (
  id uuid primary key,
  transcript_id uuid references transcripts(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade not null,
  extracted_payload jsonb not null default '{}'::jsonb,
  confidence numeric,
  status text not null default 'draft' check (status in ('draft', 'reviewed', 'applied')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists transcript_extractions_user_id_idx
  on transcript_extractions(user_id);

alter table transcripts enable row level security;
alter table transcript_extractions enable row level security;

create policy "Users can manage own transcripts" on transcripts
  for all using (auth.uid() = user_id);

create policy "Users can manage own transcript extractions" on transcript_extractions
  for all using (auth.uid() = user_id);
```

## Storage bucket

Create a private bucket named `session-audio`, then apply policies:

```sql
create policy "Users can upload own audio" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can read own audio" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can delete own audio" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'session-audio'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```
