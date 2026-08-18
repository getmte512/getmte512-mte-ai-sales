create table if not exists public.pilot_health_reviews (
  id uuid primary key default gen_random_uuid(),
  pilot_account_id uuid not null references public.pilot_accounts(id) on delete cascade,
  outcome text not null check (outcome in ('continue','pause')),
  note text not null check (length(btrim(note)) between 8 and 1000),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now()
);
alter table public.pilot_health_reviews enable row level security;
create index if not exists pilot_health_reviews_account_idx on public.pilot_health_reviews(pilot_account_id,reviewed_at desc);

create or replace function public.record_pilot_health_review(p_actor_id uuid,p_pilot_account_id uuid,p_outcome text,p_note text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_status text;
begin
  if p_outcome not in ('continue','pause') then raise exception 'Invalid pilot health review outcome.'; end if;
  if length(btrim(coalesce(p_note,'')))<8 or length(btrim(p_note))>1000 then raise exception 'Pilot health review note must be 8 to 1000 characters.'; end if;
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator access is required.'; end if;
  select status into v_status from public.pilot_accounts where id=p_pilot_account_id for update;
  if v_status is null then raise exception 'Pilot account not found.'; end if;
  if p_outcome='pause' and v_status in ('invited','active') then update public.pilot_accounts set status='paused',feedback_notes=btrim(p_note),updated_by=p_actor_id,updated_at=now() where id=p_pilot_account_id; end if;
  insert into public.pilot_health_reviews(pilot_account_id,outcome,note,reviewed_by) values(p_pilot_account_id,p_outcome,btrim(p_note),p_actor_id) returning id into v_id;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata) values('pilot_health_review_recorded','pilot_account',p_pilot_account_id::text,p_actor_id,jsonb_build_object('review_id',v_id,'outcome',p_outcome,'note',btrim(p_note),'status_before',v_status));
  return v_id;
end;$$;
revoke all on function public.record_pilot_health_review(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.record_pilot_health_review(uuid,uuid,text,text) to service_role;
