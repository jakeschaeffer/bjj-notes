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
