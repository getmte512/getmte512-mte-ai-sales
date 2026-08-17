create table if not exists public.contact_research_evidence (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  source_type text not null check (source_type in ('linkedin','company_website')),
  source_url text not null,
  confidence text not null check (confidence in ('medium','high')),
  research_note text not null,
  researched_by uuid references auth.users(id) on delete set null,
  researched_at timestamptz not null default now()
);

alter table public.contact_research_evidence enable row level security;
create index if not exists contact_research_evidence_contact_idx on public.contact_research_evidence(contact_id, researched_at desc);

create or replace function public.audit_contact_research_evidence() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'contact_research_recorded',
    'contact',
    new.contact_id::text,
    new.researched_by,
    jsonb_build_object('source_type',new.source_type,'confidence',new.confidence,'research_evidence_id',new.id)
  );
  return new;
end; $$;

drop trigger if exists audit_contact_research_evidence on public.contact_research_evidence;
create trigger audit_contact_research_evidence
after insert on public.contact_research_evidence
for each row execute function public.audit_contact_research_evidence();
