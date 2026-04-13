create table if not exists public.profiles (
  user_id text primary key,
  email text,
  name text,
  picture_url text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_snapshots (
  user_id text primary key,
  scan_summary jsonb not null default '{}'::jsonb,
  behavior_insights jsonb not null default '{}'::jsonb,
  intercept_decisions jsonb not null default '[]'::jsonb,
  projection_scenario jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.interest_leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  intent text not null check (intent in ('report', 'early_access')),
  created_at timestamptz not null default now()
);

alter table public.audit_snapshots enable row level security;
alter table public.interest_leads enable row level security;
alter table public.profiles enable row level security;

drop policy if exists "Users can read their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can read their own audit summary" on public.audit_snapshots;
drop policy if exists "Users can upsert their own audit summary" on public.audit_snapshots;
drop policy if exists "Users can update their own audit summary" on public.audit_snapshots;
drop policy if exists "Anyone can join early access" on public.interest_leads;

create policy "Users can read their own profile"
  on public.profiles
  for select
  using (auth.jwt() ->> 'sub' = user_id);

create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.jwt() ->> 'sub' = user_id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.jwt() ->> 'sub' = user_id)
  with check (auth.jwt() ->> 'sub' = user_id);

create policy "Users can read their own audit summary"
  on public.audit_snapshots
  for select
  using (auth.jwt() ->> 'sub' = user_id);

create policy "Users can upsert their own audit summary"
  on public.audit_snapshots
  for insert
  with check (auth.jwt() ->> 'sub' = user_id);

create policy "Users can update their own audit summary"
  on public.audit_snapshots
  for update
  using (auth.jwt() ->> 'sub' = user_id)
  with check (auth.jwt() ->> 'sub' = user_id);

revoke insert, update, delete on public.interest_leads from anon, authenticated;
revoke insert, update, delete on public.audit_snapshots from anon, authenticated;
revoke insert, update, delete on public.profiles from anon, authenticated;
