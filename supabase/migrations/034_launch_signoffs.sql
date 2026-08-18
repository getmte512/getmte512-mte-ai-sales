create table if not exists public.launch_signoffs (
  id uuid primary key default gen_random_uuid(),
  note text not null check (length(btrim(note)) between 8 and 1000),
  readiness_snapshot jsonb not null,
  signed_by uuid not null references auth.users(id) on delete restrict,
  signed_at timestamptz not null default now()
);
alter table public.launch_signoffs enable row level security;
create index if not exists launch_signoffs_signed_at_idx on public.launch_signoffs(signed_at desc);

create or replace function public.record_launch_signoff(p_actor_id uuid,p_note text,p_readiness_snapshot jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.app_user_roles where user_id=p_actor_id and role='admin') then raise exception 'Administrator access is required.'; end if;
  if length(btrim(coalesce(p_note,'')))<8 or length(btrim(p_note))>1000 then raise exception 'Launch sign-off note must be 8 to 1000 characters.'; end if;
  if p_readiness_snapshot is null or jsonb_typeof(p_readiness_snapshot)<>'object' then raise exception 'Readiness snapshot is required.'; end if;
  if coalesce((p_readiness_snapshot->>'requiredBlocked')::integer,1)<>0 then raise exception 'Launch sign-off requires zero blocked required gates.'; end if;
  insert into public.launch_signoffs(note,readiness_snapshot,signed_by) values(btrim(p_note),p_readiness_snapshot,p_actor_id) returning id into v_id;
  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata) values('launch_signoff_recorded','launch_signoff',v_id::text,p_actor_id,jsonb_build_object('note',btrim(p_note),'readiness_snapshot',p_readiness_snapshot));
  return v_id;
end;$$;
revoke all on function public.record_launch_signoff(uuid,text,jsonb) from public,anon,authenticated;
grant execute on function public.record_launch_signoff(uuid,text,jsonb) to service_role;
