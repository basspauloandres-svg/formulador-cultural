create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  code text not null check (code in ('S01','S02','S03','S04','S05','S06','S07','S08','S09')),
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  unique(project_id, code)
);

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null default auth.uid(),
  section_code text,
  field_name text,
  title text,
  text text not null,
  source_kind text not null check (source_kind in ('institutional','research','administrative','observation','interview','web','other')),
  source_ref text,
  source_url text,
  source_date date,
  verification_status text not null default 'por_verificar' check (verification_status in ('verificada','por_verificar','descartada')),
  verified boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.projects enable row level security;
alter table public.sections enable row level security;
alter table public.evidence enable row level security;

drop policy if exists projects_owner_all on public.projects;
create policy projects_owner_all on public.projects
for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists sections_owner_all on public.sections;
drop policy if exists sections_owner_select on public.sections;
drop policy if exists sections_owner_insert on public.sections;
drop policy if exists sections_owner_update on public.sections;
drop policy if exists sections_owner_delete on public.sections;
create policy sections_owner_select on public.sections
for select using (exists (select 1 from public.projects p where p.id = sections.project_id and p.user_id = auth.uid()));
create policy sections_owner_insert on public.sections
for insert with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = sections.project_id and p.user_id = auth.uid()));
create policy sections_owner_update on public.sections
for update using (exists (select 1 from public.projects p where p.id = sections.project_id and p.user_id = auth.uid()))
with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = sections.project_id and p.user_id = auth.uid()));
create policy sections_owner_delete on public.sections
for delete using (exists (select 1 from public.projects p where p.id = sections.project_id and p.user_id = auth.uid()));

drop policy if exists evidence_owner_all on public.evidence;
drop policy if exists evidence_owner_select on public.evidence;
drop policy if exists evidence_owner_insert on public.evidence;
drop policy if exists evidence_owner_update on public.evidence;
drop policy if exists evidence_owner_delete on public.evidence;
create policy evidence_owner_select on public.evidence
for select using (exists (select 1 from public.projects p where p.id = evidence.project_id and p.user_id = auth.uid()));
create policy evidence_owner_insert on public.evidence
for insert with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = evidence.project_id and p.user_id = auth.uid()));
create policy evidence_owner_update on public.evidence
for update using (exists (select 1 from public.projects p where p.id = evidence.project_id and p.user_id = auth.uid()))
with check (user_id = auth.uid() and exists (select 1 from public.projects p where p.id = evidence.project_id and p.user_id = auth.uid()));
create policy evidence_owner_delete on public.evidence
for delete using (exists (select 1 from public.projects p where p.id = evidence.project_id and p.user_id = auth.uid()));

create index if not exists idx_projects_user on public.projects(user_id);
create index if not exists idx_sections_project on public.sections(project_id);
create index if not exists idx_evidence_project on public.evidence(project_id);
create index if not exists idx_evidence_project_status on public.evidence(project_id, verification_status);
