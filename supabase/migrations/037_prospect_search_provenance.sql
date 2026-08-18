alter table public.prospect_discovery_candidates
  add column if not exists search_run_id uuid references public.prospect_discovery_search_runs(id) on delete set null;

create index if not exists prospect_discovery_search_run_idx
  on public.prospect_discovery_candidates(search_run_id, status)
  where search_run_id is not null;

create or replace function public.queue_prospect_discovery_candidate_for_search(
  p_actor_id uuid,
  p_search_run_id uuid,
  p_candidate jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_candidate_id uuid;
begin
  if not exists(
    select 1 from public.prospect_discovery_search_runs
    where id=p_search_run_id and requested_by=p_actor_id and status='running'
  ) then
    raise exception 'Active discovery search run not found for this actor';
  end if;

  v_candidate_id := public.queue_prospect_discovery_candidate(p_actor_id,p_candidate);

  update public.prospect_discovery_candidates
  set search_run_id=p_search_run_id, updated_at=now()
  where id=v_candidate_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    'prospect_discovery_search_candidate_linked',
    'prospect_discovery_candidate',
    v_candidate_id::text,
    p_actor_id,
    jsonb_build_object('search_run_id',p_search_run_id)
  );

  return v_candidate_id;
end;
$$;

revoke all on function public.queue_prospect_discovery_candidate_for_search(uuid,uuid,jsonb) from public, anon, authenticated;
grant execute on function public.queue_prospect_discovery_candidate_for_search(uuid,uuid,jsonb) to service_role;
