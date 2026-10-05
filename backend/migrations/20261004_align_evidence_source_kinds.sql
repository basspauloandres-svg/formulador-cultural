alter table public.evidence drop constraint if exists evidence_source_kind_check;
alter table public.evidence add constraint evidence_source_kind_check
check (source_kind in ('institutional','research','administrative','observation','interview','web','other'));
