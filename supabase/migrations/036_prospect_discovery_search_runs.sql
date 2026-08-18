create table if not exists public.prospect_discovery_search_runs (
  id uuid primary key default gen_random_uuid(),
  criteria text not null,
  requested_limit integer not null check (requested_limit between 1 and 10),
  provider text not null default 'openai_web_search',
  model text not null,
  status text not null default 'running' check (status in ('running','completed','failed')),
  consulted_source_count integer not null default 0,
  candidates_returned integer not null default 0,
  candidates_queued integer not null default 0,
  duplicate_count integer not null default 0,
  rejected_source_count integer not null default 0,
  requested_by uuid references auth.users(id) on delete set null,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists prospect_discovery_search_runs_created_idx
  on public.prospect_discovery_search_runs(created_at desc);

alter table public.prospect_discovery_search_runs enable row level security;

create or replace function public.start_prospect_discovery_search(
  p_actor_id uuid,
  p_criteria text,
  p_requested_limit integer,
  p_model text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;
  if p_criteria is null or length(btrim(p_criteria)) < 8 then raise exception 'Search criteria must be at least 8 characters'; end if;
  if p_requested_limit < 1 or p_requested_limit > 10 then raise exception 'Requested limit must be between 1 and 10'; end if;
  if p_model is null or btrim(p_model) = '' then raise exception 'Search model is required'; end if;

  insert into public.prospect_discovery_search_runs(criteria,requested_limit,model,requested_by)
  values(btrim(p_criteria),p_requested_limit,btrim(p_model),p_actor_id)
  returning id into v_id;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values('prospect_discovery_search_started','prospect_discovery_search_run',v_id::text,p_actor_id,
    jsonb_build_object('requested_limit',p_requested_limit,'model',btrim(p_model)));

  return v_id;
end;
$$;

create or replace function public.finish_prospect_discovery_search(
  p_run_id uuid,
  p_actor_id uuid,
  p_status text,
  p_consulted_source_count integer,
  p_candidates_returned integer,
  p_candidates_queued integer,
  p_duplicate_count integer,
  p_rejected_source_count integer,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$;
begin
  if not exists(
    select 1 from public.app_user_roles
    where user_id = p_actor_id and role in ('admin','sales')
  ) then
    raise exception 'Sales access is required';
  end if;
  if p_status not in ('completed','failed') then raise exception 'Search status must be completed or failed'; end if;

  update public.prospect_discovery_search_runs set
    status=p_status,
    consulted_source_count=greatest(coalesce(p_consulted_source_count,0),0),
    candidates_returned=greatest(coalesce(p_candidates_returned,0),0),
    candidates_queued=greatest(coalesce(p_candidates_queued,0),0),
    duplicate_count=greatest(coalesce(p_duplicate_count,0),0),
    rejected_source_count=greatest(coalesce(p_rejected_source_count,0),0),
    error_message=case when p_error_message is null then null else left(p_error_message,1000) end,
    completed_at=now()
  where id=p_run_id and requested_by=p_actor_id and status='running';

  if not found then raise exception 'Discovery search run is unavailable or already finished'; end if;

  insert into public.audit_events(action,entity_type,entity_id,actor_id,metadata)
  values(
    case when p_status='completed' then 'prospect_discovery_search_completed' else 'prospect_discovery_search_failed' end,
    'prospect_discovery_search_run',
    p_run_id::text,
    p_actor_id,
    jsonb_build_object(
      'consulted_source_count',greatest(coalesce(p_consulted_source_count,0),0),
      'candidates_returned',greatest(coalesce(p_candidates_returned,0),0),
      'candidates_queued',greatest(coalesce(p_candidates_queued,0),0),
      'duplicate_count',greatest(coalesce(p_duplicate_count,0),0),
      'rejected_source_count',greatest(coalesce(p_rejected_source_count,0),0)
    )
  );
end;
$$;

revoke all on function public.start_prospect_discovery_search(uuid,text,integer,text) from public, anon, authenticated;
grant execute on function public.start_prospect_discovery_search(uuid,text,integer,text) to service_role;
revoke all on function public.finish_prospect_discovery_search(uuid,uuid,text,integer,integer,integer,integer,integer,text) from public, anon, authenticated;
grant execute on function public.finish_prospect_discovery_search(uuid,uuid,text,integer,integer,integer,integer,integer,text) to service_role;
