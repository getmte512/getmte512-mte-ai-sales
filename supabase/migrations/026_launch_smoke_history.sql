create table if not exists public.launch_smoke_runs (
  id uuid primary key default gen_random_uuid(),
  checked_at timestamptz not null,
  status text not null check (status in ('ready','blocked')),
  passed integer not null check (passed >= 0),
  total integer not null check (total >= 0),
  failed integer not null check (failed >= 0),
  checks jsonb not null,
  recorded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

alter table public.launch_smoke_runs enable row level security;
create index if not exists launch_smoke_runs_checked_idx on public.launch_smoke_runs(checked_at desc);

create or replace function public.record_launch_smoke_run(
  p_actor_id uuid,
  p_checked_at timestamptz,
  p_status text,
  p_passed integer,
  p_total integer,
  p_failed integer,
  p_checks jsonb
) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_id uuid;
begin
  if p_status not in ('ready','blocked') then raise exception 'Invalid smoke-test status.'; end if;
  insert into public.launch_smoke_runs(checked_at,status,passed,total,failed,checks,recorded_by)
  values(p_checked_at,p_status,p_passed,p_total,p_failed,p_checks,p_actor_id)
  returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('launch_smoke_test_recorded','launch_smoke_run',v_id::text,p_actor_id,
    jsonb_build_object('status',p_status,'passed',p_passed,'total',p_total,'failed',p_failed,'checked_at',p_checked_at));
  return v_id;
end; $$;
