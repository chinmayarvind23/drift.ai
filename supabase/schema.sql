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

create policy "Anyone can join early access"
  on public.interest_leads
  for insert
  with check (true);
