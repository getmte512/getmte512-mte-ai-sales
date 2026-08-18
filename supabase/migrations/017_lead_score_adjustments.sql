create table if not exists public.lead_score_adjustments (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.contacts(id) on delete cascade,
  adjustment integer not null check (adjustment between -50 and 50 and adjustment <> 0),
  reason text not null check (length(btrim(reason)) between 3 and 500),
  adjusted_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.lead_score_adjustments enable row level security;
create index if not exists lead_score_adjustments_contact_idx on public.lead_score_adjustments(contact_id, created_at desc);

create or replace function public.audit_lead_score_adjustment() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('lead_score_adjusted','contact',new.contact_id::text,new.adjusted_by,jsonb_build_object('adjustment',new.adjustment,'reason',new.reason,'lead_score_adjustment_id',new.id));
  return new;
end; $$;

drop trigger if exists audit_lead_score_adjustments on public.lead_score_adjustments;
create trigger audit_lead_score_adjustments after insert on public.lead_score_adjustments
for each row execute function public.audit_lead_score_adjustment();
