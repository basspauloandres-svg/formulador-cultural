create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  code text not null check (code in ('S01','S02','S03','S04','S05','S06','S07','S08')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  section_code text,
  field_name text,
  text text not null,
  source_kind text not null check (source_kind in ('project','library','web','ai')),
  source_ref text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.sections enable row level security;
alter table public.evidence enable row level security;

create policy "projects_owner_all" on public.projects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sections_owner_all" on public.sections
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "evidence_owner_all" on public.evidence
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_sections_project on public.sections(project_id);
create index if not exists idx_evidence_project on public.evidence(project_id);
